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
    
    // Build API URL for the external API (currently not implemented)
    const apiUrl = new URL(`${API_BASE_URL}/funnels/data`);
    
    // Add parameters to the URL
    apiUrl.searchParams.set('profession_id', professionId);
    if (from) apiUrl.searchParams.set('from', from);
    if (to) apiUrl.searchParams.set('to', to);
    apiUrl.searchParams.set('time_frame', timeFrame);
    if (funnelId) apiUrl.searchParams.set('funnel_id', funnelId);
    
    // Return error - no mock data
    return NextResponse.json({
      error: 'Este endpoint ainda não está implementado na API. Por favor, use o endpoint unificado.',
      status: 501,
      details: 'A funcionalidade está em desenvolvimento. Utilize o endpoint /api/dashboard/unified para obter dados reais.'
    }, { 
      status: 501, // Not Implemented
      headers: {
        'Cache-Control': 'no-store',
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