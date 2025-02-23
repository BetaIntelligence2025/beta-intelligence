import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortDirection = searchParams.get('sortDirection') || 'desc'

    const response = await fetch(`http://localhost:8080/client?page=${page}&limit=${limit}&sortBy=${sortBy}&sortDirection=${sortDirection}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || ''
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json({
      users: data.clients,
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages
    })
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Lógica para criar cliente
    return NextResponse.json({ message: 'Cliente criado com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
} 