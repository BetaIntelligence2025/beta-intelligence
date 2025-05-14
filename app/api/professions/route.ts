import { NextResponse } from 'next/server'
import { API_BASE_URL } from '@/app/config/api'

export async function GET() {
  try {
    // Use API_BASE_URL from the config file for consistent behavior
    const apiUrl = `${API_BASE_URL}/professions`;
      
    console.log(`Fetching professions from: ${apiUrl} (${process.env.NODE_ENV} mode)`);
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching professions:', error);
    return NextResponse.json({ 
      data: [],
      error: `Failed to connect to API: ${error}`
    });
  }
} 