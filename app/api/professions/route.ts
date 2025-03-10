import { NextResponse } from 'next/server'
import { API_ENDPOINTS } from '@/app/config/api'

export async function GET() {
  try {
    const response = await fetch(API_ENDPOINTS.PROFESSIONS)
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching professions:', error)
    return NextResponse.json({ data: [] })
  }
} 