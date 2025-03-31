import { NextRequest } from 'next/server';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

// Helper function to get absolute URL
function getAbsoluteUrl(path: string): string {
  // Get the API base URL from environment variables
  const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? "http://localhost:8080"
    : process.env.API_URL || 'https://api-bi.cursobeta.com.br';
    
  // If the URL already includes a protocol, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Otherwise, join with the API base URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;
  return fullUrl;
}

/**
 * GET handler for optimized dashboard data fetching
 * Uses streaming response for faster time to first byte
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const timeFrame = searchParams.get('timeFrame') as TimeFrame || 'Daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const cardType = searchParams.get('cardType');
  
  // Create a unique cache key for this request
  const cacheKey = `dashboard-${timeFrame}-${from}-${to}-${cardType || 'all'}`;
  
  try {
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !from && !to;
    
    // Build query params
    let queryParams: string;
    if (useAllData) {
      queryParams = 'count_only=true&all_data=true';
    } else {
      queryParams = `count_only=true&from=${from}&to=${to}&period=true`;
    }
    
    // Normalize card type
    const normalizedCardType = cardType 
      ? cardType.endsWith('s') ? cardType : `${cardType}s` 
      : undefined;
    
    // Determine which endpoints to call based on card type
    let sessionUrl: string | undefined;
    let leadUrl: string | undefined;
    let clientUrl: string | undefined;
    
    if (normalizedCardType) {
      switch (normalizedCardType) {
        case 'sessions':
          sessionUrl = getAbsoluteUrl(`/session/?${queryParams}`);
          break;
        case 'leads':
          leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
          break;
        case 'clients':
          clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
          break;
        case 'conversions':
          // Conversions requires both leads and clients data
          leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
          clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
          break;
      }
    } else {
      // If no specific card, we need all data
      sessionUrl = getAbsoluteUrl(`/session/?${queryParams}`);
      leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
      clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
    }
    
    // Create a streaming response
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            // Fetch all data in parallel
            const [sessionData, leadData, clientData] = await Promise.all([
              sessionUrl ? fetchApiData(sessionUrl, 'sessions') : Promise.resolve([]),
              leadUrl ? fetchApiData(leadUrl, 'leads') : Promise.resolve([]),
              clientUrl ? fetchApiData(clientUrl, 'clients') : Promise.resolve([])
            ]);
            
            // Generate conversion data if we have both leads and clients
            let conversionData: DashboardDataItem[] = [];
            if (leadData.length > 0 && clientData.length > 0) {
              // Get all unique dates
              const dates = Array.from(new Set([
                ...leadData.map(item => item.date),
                ...clientData.map(item => item.date)
              ]));
              
              // Calculate conversions for each date
              conversionData = dates.map(date => {
                const leadsForDate = leadData.find(item => item.date === date)?.count || 0;
                const clientsForDate = clientData.find(item => item.date === date)?.count || 0;
                
                // Conversion is the percentage of leads that became clients
                const conversionRate = leadsForDate > 0 
                  ? (clientsForDate / leadsForDate) * 100 
                  : 0;
                
                return {
                  date,
                  count: Math.round(conversionRate),
                  type: 'conversions'
                };
              });
            }
            
            // Combine all data
            const combinedData = [
              ...sessionData,
              ...leadData,
              ...clientData,
              ...conversionData
            ];
            
            // Filter by date range if provided
            const filteredData = from && to ? 
              combinedData.filter(item => {
                const itemDate = item.date.split('T')[0];
                const fromDate = from.split('T')[0];
                const toDate = to.split('T')[0];
                return itemDate >= fromDate && itemDate <= toDate;
              }) : 
              combinedData;
            
            // Send result as JSON
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              data: filteredData 
            })));
            controller.close();
          } catch (error) {
            // Handle errors
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
              data: [],
              errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
            })));
            controller.close();
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache-Key': cacheKey
        }
      }
    );
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ 
        data: [],
        errors: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

/**
 * Helper function to fetch data from an API endpoint
 */
async function fetchApiData(url: string, type: string): Promise<DashboardDataItem[]> {
  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      // Map the API data to our format
      return data.map(item => ({
        date: item.date,
        count: item.count || 0,
        type
      }));
    } else if (data && typeof data === 'object' && data.periods) {
      // Handle periods-specific format
      const entries = Object.entries(data.periods);
      
      return entries.map(([date, count]) => ({
        date,
        count: count as number,
        type
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching ${type} data:`, error);
    return [];
  }
} 