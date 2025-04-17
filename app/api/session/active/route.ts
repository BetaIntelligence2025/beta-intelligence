import { NextRequest, NextResponse } from 'next/server'
import { API_ENDPOINTS, buildApiUrl, API_BASE_URL } from '@/app/config/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Obter parâmetros para filtrar as sessões ativas
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const professionId = searchParams.get('profession_id')
    const funnelId = searchParams.get('funnel_id')
    const landingPage = searchParams.get('landingPage') || 'lp.vagasjustica.com.br'
    
    // Construir parâmetros para a API
    const params: Record<string, string> = { 
      active: 'true',
      landingPage
    }
    
    // Adicionar filtros de data se fornecidos
    if (from) params.from = from
    if (to) params.to = to
    
    // Adicionar filtros de profissão e funil se fornecidos
    if (professionId) params.profession_id = professionId
    if (funnelId) params.funnel_id = funnelId
    
    // Log para debug
    console.log('Params being sent to session/active API:', params)
    
    // Construir URL da API usando diretamente o endpoint de sessões ativas
    const apiUrl = `${API_BASE_URL}/session/active?count_only=true&${new URLSearchParams(params)}`
    console.log('Final API URL:', apiUrl)
    
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
        console.log(`API response error: ${response.status} ${response.statusText}`)
        return NextResponse.json({
          active_count: 0,
          count: 0,
          timestamp: new Date().toISOString(),
          from: from ? new Date(from).toISOString() : null,
          to: to ? new Date(to).toISOString() : null,
          error: `API responded with status ${response.status}`,
          params: params // Para debug
        })
      }
      
      const data = await response.json()
      console.log('API response data:', data)
      
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
          to: to ? new Date(to).toISOString() : null,
          debug: { params, data } // Para debug
        })
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
      return NextResponse.json({
        active_count: 0,
        count: 0,
        timestamp: new Date().toISOString(),
        from: from ? new Date(from).toISOString() : null,
        to: to ? new Date(to).toISOString() : null,
        error: error instanceof Error ? error.message : String(error),
        params: params // Para debug
      })
    }
  } catch (error) {
    console.error('Error in Active Sessions route:', error)
    return NextResponse.json({
      active_count: 0,
      count: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 