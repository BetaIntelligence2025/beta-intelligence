import { NextRequest, NextResponse } from 'next/server'
import { API_ENDPOINTS, buildApiUrl, API_BASE_URL } from '@/app/config/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Obter parâmetros para filtrar as sessões ativas
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    
    // Construir parâmetros para a API
    const params: Record<string, string> = { 
      active: 'true',
      landingPage: 'lp.vagasjustica.com.br'
    }
    
    // Adicionar filtros de data se fornecidos
    if (from) params.from = from
    if (to) params.to = to
    
    // Construir URL da API usando diretamente o endpoint de sessões ativas
    const apiUrl = `${API_BASE_URL}/session/active?count_only=true&${new URLSearchParams(params)}`
    
    try {
      // Buscar dados da API externa
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })
      
      if (!response.ok) {
        return NextResponse.json({
          active_count: 0,
          count: 0,
          timestamp: new Date().toISOString(),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to).toISOString() : null
        })
      }
      
      const data = await response.json()
      
      // Se recebemos dados da contagem ativa
      if (data.active_count !== undefined) {
        return NextResponse.json({
          ...data,
          count: data.active_count,
          timestamp: new Date().toISOString()
        })
      } 
      // Se recebemos apenas a contagem total
      else if (data.count !== undefined) {
        return NextResponse.json({
          active_count: data.count,
          count: data.count,
          timestamp: new Date().toISOString(),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to).toISOString() : null
        })
      }
      // Se não temos nenhum dado específico
      else {
        return NextResponse.json({
          active_count: 0,
          count: 0,
          timestamp: new Date().toISOString(),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to).toISOString() : null
        })
      }
    } catch (error) {
      return NextResponse.json({
        active_count: 0,
        count: 0,
        timestamp: new Date().toISOString(),
        from: from ? new Date(from).toISOString() : null,
        to: to ? new Date(to).toISOString() : null
      })
    }
  } catch (error) {
    return NextResponse.json({
      active_count: 0,
      count: 0,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 