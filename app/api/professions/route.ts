import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch('http://localhost:8080/professions', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error('Failed to fetch professions')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching professions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch professions' }, 
      { status: 500 }
    )
  }
} 