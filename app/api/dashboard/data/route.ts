import { NextRequest, NextResponse } from 'next/server';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';
import { API_BASE_URL } from '@/app/config/api';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

// Configurações de timeout e cache
const TIMEOUT_MS = 15000; // 15 segundos
const CACHE_TTL = 60; // 1 minuto

/**
 * GET handler for optimized dashboard data fetching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFrame = searchParams.get('timeFrame') as TimeFrame || 'Daily';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const cardType = searchParams.get('cardType');
    
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !from && !to;
    
    // Build query params
    const params: Record<string, string> = { 
      count_only: 'true'
    };
    
    if (useAllData) {
      params.all_data = 'true';
    } else {
      if (from) params.from = from;
      if (to) params.to = to;
      params.period = 'true';
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
          sessionUrl = `${API_BASE_URL}/session/?${new URLSearchParams(params)}`;
          break;
        case 'leads':
          leadUrl = `${API_BASE_URL}/lead/?${new URLSearchParams(params)}`;
          break;
        case 'clients':
          clientUrl = `${API_BASE_URL}/client/?${new URLSearchParams(params)}`;
          break;
        case 'conversions':
          // Conversions requires both leads and clients data
          leadUrl = `${API_BASE_URL}/lead/?${new URLSearchParams(params)}`;
          clientUrl = `${API_BASE_URL}/client/?${new URLSearchParams(params)}`;
          break;
      }
    } else {
      // If no specific card, we need all data
      sessionUrl = `${API_BASE_URL}/session/?${new URLSearchParams(params)}`;
      leadUrl = `${API_BASE_URL}/lead/?${new URLSearchParams(params)}`;
      clientUrl = `${API_BASE_URL}/client/?${new URLSearchParams(params)}`;
    }
    
    try {
      // Fetch all data in parallel with timeout
      const results = await Promise.all([
        sessionUrl ? fetchApiData(sessionUrl, 'sessions') : Promise.resolve([]),
        leadUrl ? fetchApiData(leadUrl, 'leads') : Promise.resolve([]),
        clientUrl ? fetchApiData(clientUrl, 'clients') : Promise.resolve([])
      ]);
      
      const sessionData = results[0];
      const leadData = results[1];
      const clientData = results[2];
      
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
      
      return NextResponse.json({ 
        data: filteredData,
        timeFrame,
        cardType 
      }, {
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return NextResponse.json({ 
        data: [],
        errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { 
        status: 500 
      });
    }
  } catch (error) {
    console.error('Error in dashboard data route:', error);
    return NextResponse.json({ 
      data: [],
      errors: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { 
      status: 500 
    });
  }
}

/**
 * Helper function to fetch data from an API endpoint with timeout
 */
async function fetchApiData(url: string, type: string): Promise<DashboardDataItem[]> {
  try {
    // Criar um controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
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
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Timeout fetching ${type} data from ${url}`);
    } else {
      console.error(`Error fetching ${type} data:`, error);
    }
    return [];
  }
} 