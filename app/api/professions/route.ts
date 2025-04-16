import { NextResponse } from 'next/server'
import { API_ENDPOINTS } from '@/app/config/api'

export async function GET() {
  try {
    // Use localhost for development and API_BASE_URL for production
    const apiUrl = process.env.NODE_ENV === 'production'
      ? (process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/professions` : 'https://api-bi.cursobeta.com.br/professions')
      : 'http://localhost:8080/professions';
      
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
      error: `Failed to connect to ${process.env.NODE_ENV === 'production' ? 'production API' : 'localhost:8080'}`
    });
  }
} 