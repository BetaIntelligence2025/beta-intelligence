import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { Event, FetchEventsResponse } from '@/app/types/events-type'
import { API_ENDPOINTS } from '@/app/config/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const sortBy = searchParams.get('sortBy')
    const sortDirection = searchParams.get('sortDirection')
    const exportAll = searchParams.get('export') === 'true'
    
    // Obter os parâmetros de data no formato ISO da URL
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    
    // Obter valores de profissão e funil no formato de lista separada por vírgulas
    const professionId = searchParams.get('profession_id')
    const funnelId = searchParams.get('funnel_id')
    
    console.log('URL completa:', request.url)
    console.log('Filtros recebidos na API:', { 
      from, 
      to, 
      professionId, 
      funnelId,
      exportAll
    })
    
    // Garantir que as datas estejam no formato ISO completo
    let fromParam = from
    let toParam = to
    
    try {
      // Se from existe, garantir que seja uma data ISO válida
      if (from) {
        const fromDate = new Date(from)
        if (!isNaN(fromDate.getTime())) {
          fromParam = fromDate.toISOString()
        }
      }
      
      // Se to existe, garantir que seja uma data ISO válida
      if (to) {
        const toDate = new Date(to)
        if (!isNaN(toDate.getTime())) {
          toParam = toDate.toISOString()
        }
      }
      
      console.log('Parâmetros de data formatados:', { fromParam, toParam })
    } catch (error) {
      console.error('Erro ao processar datas:', error)
    }
    
    // Construir os parâmetros para a API backend
    const params: any = {
      page,
      sortBy,
      sortDirection,
      from: fromParam,
      to: toParam,
    }
    
    // Se for exportação, não usar paginação para pegar todos os registros
    if (exportAll) {
      // Remover parâmetros de paginação
      delete params.page;
      
      // Tentar diferentes abordagens para obter todos os registros
      params.all = true;
      params.no_pagination = true;
      params.limit = 1000000; // Um número extremamente grande
      params.per_page = 1000000; // Outra possível variação
      params.pagination = false; // Outra possível variação
      
      console.log('Exportando todos os registros. Parâmetros:', params);
    } else {
      params.limit = limit;
    }
    
    // Adicionar IDs de profissão se existirem
    if (professionId) {
      params.profession_ids = professionId.split(',')
      console.log('Enviando profession_ids:', params.profession_ids)
    }
    
    // Adicionar IDs de funil se existirem
    if (funnelId) {
      params.funnel_ids = funnelId
      console.log('Enviando funnel_ids:', params.funnel_ids)
    }
    
    // Fazer a requisição para a API backend
    console.log('Parâmetros enviados para a API:', params)
    console.log('URL da API:', API_ENDPOINTS.EVENTS)
    const response = await axios.get(API_ENDPOINTS.EVENTS, { params })
    
    return NextResponse.json({
      events: response.data.data || [],
      meta: {
        total: response.data.meta?.total || 0,
        page: parseInt(page) || 1,
        limit: parseInt(params.limit) || 10,
        last_page: response.data.meta?.last_page || 1,
        profession_ids: professionId ? professionId.split(',') : undefined,
        funnel_ids: funnelId ? funnelId.split(',') : undefined,
        isExport: exportAll
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