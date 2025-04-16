import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Extract profession_id from the URL query parameters
    const url = new URL(request.url);
    const profession_id = url.searchParams.get('profession_id');
    
    console.log(`Fetching funnels with profession_id: ${profession_id}`);
    
    if (!profession_id) {
      return NextResponse.json({
        error: 'Missing profession_id parameter',
        data: []
      }, { status: 400 });
    }

    // Use localhost for development and API_BASE_URL for production
    const backendUrl = process.env.NODE_ENV === 'production'
      ? (process.env.API_BASE_URL || 'https://api-bi.cursobeta.com.br')
      : 'http://localhost:8080';
      
    console.log(`Fetching funnels from: ${backendUrl}/professions/${profession_id}/funnels (${process.env.NODE_ENV} mode)`);
    
    const response = await fetch(`${backendUrl}/professions/${profession_id}/funnels`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Backend API responded with status ${response.status}`);
    }

    // Get the response data
    const data = await response.json();
    
    // Return the data from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching funnels for profession:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch funnels', 
        message: error instanceof Error ? error.message : 'Unknown error',
        data: [] 
      }, 
      { status: 200 } // Return 200 even on error to prevent UI from breaking
    );
  }
} 