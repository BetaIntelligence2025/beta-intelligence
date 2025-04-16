import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS, API_BASE_URL } from '@/app/config/api';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log parameters received
    console.log('Funnel Data API - Received parameters:', {
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      time_from: searchParams.get('time_from'),
      time_to: searchParams.get('time_to'),
      timeFrame: searchParams.get('timeFrame'),
      profession_id: searchParams.get('profession_id'),
      funnel_id: searchParams.get('funnel_id')
    });
    
    // Get required parameters
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const timeFrame = searchParams.get('timeFrame') || 'Daily';
    const professionId = searchParams.get('profession_id');
    const funnelId = searchParams.get('funnel_id');
    
    // Validate required parameters
    if (!professionId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: profession_id' 
      }, { status: 400 });
    }
    
    // Build API URL
    const params: Record<string, string> = {
      profession_id: professionId,
      from: from || '',
      to: to || '',
      time_frame: timeFrame
    };
    
    // Add funnel_id if provided
    if (funnelId) {
      params.funnel_id = funnelId;
    }
    
    // For now, return mock data as this endpoint is still in development
    // In a real implementation, we would fetch data from the backend API
    
    // Generate mock data based on parameters
    const mockData = generateMockData(professionId, funnelId, timeFrame);
    
    return NextResponse.json({
      ...mockData,
      params,
      source: 'funnel'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      }
    });
    
  } catch (error) {
    console.error('Error in funnel data route:', error);
    return NextResponse.json({ 
      error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: []
    }, { 
      status: 500 
    });
  }
}

// Helper function to generate mock data
function generateMockData(professionId: string, funnelId: string | null, timeFrame: string) {
  // Generate dates based on time frame
  const today = new Date();
  const dates: string[] = [];
  
  // Generate daily dates for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dates.push(formattedDate);
  }
  
  // Generate sample data
  const data = dates.map(date => {
    // Randomize values but make them consistent by using the profession and funnel IDs as seeds
    const profSeed = parseInt(professionId, 36) % 100;
    const funnelSeed = funnelId ? parseInt(funnelId.substring(0, 5), 36) % 100 : 50;
    const dateSeed = parseInt(date.replace(/-/g, '')) % 100;
    
    // Base values modified by seeds
    const sessionsFactor = ((profSeed + dateSeed) % 100) / 100;
    const leadsFactor = ((funnelSeed + dateSeed) % 100) / 100;
    
    const sessions = Math.floor(100 + 300 * sessionsFactor);
    const leads = Math.floor(10 + 50 * leadsFactor);
    
    return {
      date,
      type: 'sessions',
      count: sessions
    };
  });
  
  // Add leads data
  dates.forEach(date => {
    const profSeed = parseInt(professionId, 36) % 100;
    const funnelSeed = funnelId ? parseInt(funnelId.substring(0, 5), 36) % 100 : 50;
    const dateSeed = parseInt(date.replace(/-/g, '')) % 100;
    
    const leadsFactor = ((funnelSeed + dateSeed) % 100) / 100;
    const leads = Math.floor(10 + 50 * leadsFactor);
    
    data.push({
      date,
      type: 'leads',
      count: leads
    });
  });
  
  // Calculate totals
  const sessionItems = data.filter(item => item.type === 'sessions');
  const leadItems = data.filter(item => item.type === 'leads');
  
  const sessions_count = sessionItems.reduce((sum, item) => sum + item.count, 0);
  const leads_count = leadItems.reduce((sum, item) => sum + item.count, 0);
  
  return {
    data,
    sessions_count,
    leads_count,
    profession_id: professionId,
    funnel_id: funnelId
  };
} 