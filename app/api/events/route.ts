import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { Event, FetchEventsResponse } from '@/app/types/events-type'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const sortBy = searchParams.get('sortBy')
    const sortDirection = searchParams.get('sortDirection')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const professionId = searchParams.get('professionId')
    const funnelId = searchParams.get('funnelId')

    const response = await axios.get('http://localhost:8080/events', {
      params: {
        page: Number(page),
        limit: Number(limit),
        ...(sortBy && { sortBy }),
        ...(sortDirection && { sortDirection }),
        ...(from && { from }),
        ...(to && { to }),
        ...(professionId && { profession_id: professionId }),
        ...(funnelId && { funnel_id: funnelId })
      }
    })

    return NextResponse.json({
      events: response.data.data,
      meta: {
        ...response.data.meta,
        profession_id: professionId ? Number(professionId) : undefined,
        funnel_id: funnelId ? Number(funnelId) : undefined
      }
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({
      events: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        last_page: 1
      }
    }, { status: 500 })
  }
} 