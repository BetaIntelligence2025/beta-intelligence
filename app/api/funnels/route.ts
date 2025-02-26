import { NextResponse } from "next/server"
import axios from 'axios'

export async function GET() {
  try {
    const response = await axios.get('http://localhost:8080/funnels', {
      params: {
        page: 1,
        limit: 100,
        sortBy: 'funnel_name',
        sortDirection: 'asc'
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.data) {
      throw new Error('No data received from funnels API')
    }

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Error fetching funnels:', error.response?.data || error.message)
    
    return NextResponse.json({
      data: [],
      meta: {
        last_page: 1,
        limit: 100,
        page: 1,
        total: 0,
        valid_sort_fields: ['funnel_id', 'funnel_name', 'created_at']
      }
    })
  }
} 