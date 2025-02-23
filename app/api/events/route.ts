import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const sortBy = searchParams.get('sortBy')
    const sortDirection = searchParams.get('sortDirection')

    // Log para debug
    console.log('Fetching events from external API')

    const { data } = await axios.get('http://localhost:8080/events', {
      params: {
        page,
        limit,
        sortBy,
        sortDirection
      }
    })

    // Log para debug
    console.log('API Response:', data)

    return NextResponse.json({
      events: data.data,
      page: parseInt(page),
      total: data.meta.total,
      totalPages: data.meta.last_page,
      limit: data.meta.limit
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { 
        events: [],
        page: 1,
        total: 0,
        totalPages: 1,
        limit: 10,
        error: 'Failed to fetch events' 
      },
      { status: 500 }
    )
  }
} 