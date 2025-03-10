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
    const apiUrl = buildApiUrl(API_ENDPOINTS.ANONYMOUS, params)
    
    console.log(`Fazendo requisição para anônimos: ${apiUrl}`)
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Dados recebidos da API de anônimos:', data)
    
    // Transformar o formato de dados para o formato esperado pelo componente
    // Usando o campo "anonymous" da resposta da API
    const transformedData = {
      users: Array.isArray(data.anonymous) ? data.anonymous : [],
      total: data.total || 0,
      page: data.page || parseInt(page),
      limit: data.limit || parseInt(limit),
      totalPages: data.totalPages || 1,
      sortBy: data.sortBy || sortBy,
      sortDirection: data.sortDirection || sortDirection
    }
    
    console.log('Dados transformados para anônimos:', transformedData);
    
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error fetching anonymous users:', error)
    return NextResponse.json({
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      sortBy: 'created_at',
      sortDirection: 'desc'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Lógica para processar dados anônimos
    return NextResponse.json({ message: 'Dados processados com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar dados' }, { status: 500 })
  }
} 