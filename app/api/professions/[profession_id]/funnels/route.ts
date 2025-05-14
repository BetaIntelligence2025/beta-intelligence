import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/app/config/api';

export async function GET(request: Request) {
  try {
    // Extract profession_id from the URL query parameters
    const url = new URL(request.url);
    const profession_id = url.pathname.split('/').pop() || '';
    
    console.log(`Extracted profession_id from URL: ${profession_id}`);
    
    if (!profession_id) {
      return NextResponse.json({
        error: 'Missing profession_id parameter'
      }, { status: 400 });
    }

    // Use API_BASE_URL from config
    const apiUrl = `${API_BASE_URL}/professions/${profession_id}/funnels`;
      
    console.log(`Fetching funnels from: ${apiUrl} (${process.env.NODE_ENV} mode)`);
    
    const response = await fetch(apiUrl, {
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