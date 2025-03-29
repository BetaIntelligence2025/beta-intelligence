import { NextRequest, NextResponse } from 'next/server';
import { DashboardDataItem, DashboardDataResult, TimeFrame } from '@/app/dashboard/types';
import { API_ENDPOINTS, API_BASE_URL, buildApiUrl } from '@/app/config/api';

// Helper function to get absolute URL
function getAbsoluteUrl(path: string): string {
  // If the URL already includes a protocol, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Otherwise, join with the API base URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Helper function to get unique dates from multiple arrays
function getUniqueDates(dateArrays: string[][]): string[] {
  const allDates = dateArrays.flat();
  // Use Array.from to handle the Set conversion properly
  const uniqueDates = Array.from(new Set(allDates));
  return uniqueDates.sort();
}

/**
 * Helper function to fetch data from an API endpoint
 */
async function fetchApiData(url: string | undefined, type: string): Promise<DashboardDataItem[]> {
  if (!url) return [];
  
  try {
    console.log(`Fetching data from: ${url}`);
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching ${type} data: ${response.status} ${response.statusText}`);
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
    console.error(`API fetch error for ${type}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get parameters from the request
    const timeFrame = searchParams.get('timeFrame') as TimeFrame || 'Daily';
    const cardType = searchParams.get('cardType') || undefined;
    
    // Get date range parameters
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !fromParam && !toParam;
    
    // Set up the API query parameters
    let queryParams: string;
    let fromDate: string | null = null;
    let toDate: string | null = null;
    
    if (useAllData) {
      // When no date filter is applied, use all_data=true to get full history
      queryParams = 'count_only=true&all_data=true';
    } else {
      // When a date range is selected, use from/to parameters
      fromDate = fromParam;
      toDate = toParam;
      queryParams = `count_only=true&from=${fromDate}&to=${toDate}&period=true`;
    }
    
    // Normalize card type
    const normalizedCardType = cardType 
      ? cardType.endsWith('s') ? cardType : `${cardType}s` 
      : undefined;
    
    try {
      // Build the URLs based on the card type
      let sessionUrl;
      let leadUrl;
      let clientUrl;
      
      // Create absolute URLs with trailing slash
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
      
      console.log('Fetching dashboard data from URLs:', { sessionUrl, leadUrl, clientUrl });

      // Fetch data from the specified endpoints
      let sessionData: DashboardDataItem[] = [];
      let leadData: DashboardDataItem[] = [];
      let clientData: DashboardDataItem[] = [];
      let conversionData: DashboardDataItem[] = [];
      
      // Fetch data in parallel
      const promises = [];
      
      if (sessionUrl) {
        promises.push(fetchApiData(sessionUrl, 'sessions').then(data => { sessionData = data; }));
      }
      
      if (leadUrl) {
        promises.push(fetchApiData(leadUrl, 'leads').then(data => { leadData = data; }));
      }
      
      if (clientUrl) {
        promises.push(fetchApiData(clientUrl, 'clients').then(data => { clientData = data; }));
      }
      
      // Wait for all fetch operations to complete
      try {
        await Promise.all(promises);
      } catch (error) {
        return NextResponse.json({ 
          data: [],
          errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      
      // Generate conversion data if we have both leads and clients
      if (leadData.length > 0 && clientData.length > 0) {
        // Get all unique dates
        const leadDates = leadData.map(item => item.date);
        const clientDates = clientData.map(item => item.date);
        const dates = getUniqueDates([leadDates, clientDates]);
        
        // For each date, calculate conversions (clients as a percentage of leads)
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
      
      // Merge all data
      let combinedData: DashboardDataItem[] = [
        ...sessionData,
        ...leadData,
        ...clientData,
        ...conversionData
      ];
      
      // Filter data based on card type if specified
      if (normalizedCardType) {
        combinedData = combinedData.filter(item => item.type === normalizedCardType);
      }
      
      // If a date range was provided, ensure we only include data within that range
      if (fromDate && toDate) {
        // Parse the date strings to get just YYYY-MM-DD for comparison
        const fromDateStr = fromDate.split('T')[0];
        const toDateStr = toDate.split('T')[0];
        
        // Only include data points within the date range
        combinedData = combinedData.filter(item => {
          const itemDate = item.date.split('T')[0]; // Remove any time part
          return itemDate >= fromDateStr && itemDate <= toDateStr;
        });
      }
      
      // Add cache control headers for performance
      const headers = new Headers();
      headers.set('Cache-Control', 'private, max-age=60');
      
      return NextResponse.json({
        data: combinedData,
        timeFrame
      }, {
        status: 200,
        headers
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return NextResponse.json({
        data: [],
        errors: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in dashboard API:', error);
    return NextResponse.json({
      data: [],
      errors: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 