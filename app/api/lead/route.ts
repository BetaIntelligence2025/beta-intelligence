import { NextRequest, NextResponse } from 'next/server'
import { API_ENDPOINTS, buildApiUrl, buildPaginationParams } from '@/app/config/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'
    
    const params = buildPaginationParams(page, limit, sortBy, sortDirection)
    const apiUrl = buildApiUrl(API_ENDPOINTS.LEAD, params)
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        last_page: 1
      }
    }, { status: 500 })
  }
} 