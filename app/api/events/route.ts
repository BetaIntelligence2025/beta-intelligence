import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { API_ENDPOINTS } from '@/app/config/api'
import { 
  toBrazilianTime, 
  formatBrazilianDate, 
  getBrazilianStartOfDay, 
  getBrazilianEndOfDay, 
  BRAZIL_TIMEZONE 
} from '@/lib/date-utils'

// Usar a configuração centralizada de API
const EVENTS_ENDPOINT = API_ENDPOINTS.EVENTS

// Função para deduplica eventos por event_id
function deduplicateEvents(events: any[]) {
  const uniqueEvents = [];
  const eventIdMap = new Map<string, boolean>();
  
  for (const event of events) {
    if (event.event_id && !eventIdMap.has(event.event_id)) {
      eventIdMap.set(event.event_id, true);
      uniqueEvents.push(event);
    }
  }
  
  return uniqueEvents;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Verificar se essa é uma requisição sem filtros (após limpeza)
    // Contamos apenas os parâmetros básicos: page, sortBy, sortDirection
    const params = new URLSearchParams()
    const hasOnlyBasicParams = 
      !searchParams.has('from') && 
      !searchParams.has('to') && 
      !searchParams.has('advanced_filters') &&
      !searchParams.has('filter_condition') &&
      !searchParams.has('profession_id') &&
      !searchParams.has('funnel_id') &&
      !searchParams.has('time_from') &&
      !searchParams.has('time_to');
    
    // Verificar se é uma solicitação de exportação
    const isExport = searchParams.has('export') && searchParams.get('export') === 'true';
    
    // Se for uma requisição com apenas parâmetros básicos, não aplique nenhum filtro
    if (hasOnlyBasicParams) {
      console.log('API: Requisição sem filtros detectada - não aplicando filtros padrão');
      
      // Transferir apenas parâmetros básicos
      if (searchParams.has('page')) params.append('page', searchParams.get('page')!);
      if (searchParams.has('sortBy')) params.append('sortBy', searchParams.get('sortBy')!);
      if (searchParams.has('sortDirection')) params.append('sortDirection', searchParams.get('sortDirection')!);
      
      const paramString = params.toString();
      // Fazer a requisição para o backend com parâmetros mínimos
      const response = await axios.get(`${EVENTS_ENDPOINT}?${paramString}`);
      
      // Deduplica os eventos antes de retorná-los
      if (response.data && response.data.events) {
        response.data.events = deduplicateEvents(response.data.events);
      }
      
      // Retornar os dados recebidos do backend
      return NextResponse.json(response.data);
    }
    
    // Para outros filtros, transferir todos os parâmetros que temos
    for (const [key, value] of Array.from(searchParams.entries())) {
      params.append(key, value)
    }
    
    // Verificar e ajustar timezone para datas no formato ISO
    if (params.has('from')) {
      const from = params.get('from')!
      // Se tem from e time_from, adicionar a hora ao timestamp
      if (params.has('time_from')) {
        const timeFrom = params.get('time_from')!
        // Criar nova data com a timezone do Brasil
        const [year, month, day] = from.substring(0, 10).split('-').map(Number)
        const [hour, minute] = timeFrom.split(':').map(Number)
        const fromDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
        fromDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })
        params.set('from', fromDate.toISOString())
        // Remover o parâmetro time_from, já que foi incorporado no timestamp
        params.delete('time_from')
      }
    }
    
    if (params.has('to')) {
      const to = params.get('to')!
      // Se tem to e time_to, adicionar a hora ao timestamp
      if (params.has('time_to')) {
        const timeTo = params.get('time_to')!
        // Criar nova data com a timezone do Brasil
        const [year, month, day] = to.substring(0, 10).split('-').map(Number)
        const [hour, minute] = timeTo.split(':').map(Number)
        const toDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
        toDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })
        params.set('to', toDate.toISOString())
        // Remover o parâmetro time_to, já que foi incorporado no timestamp
        params.delete('time_to')
      }
    }
    
    const paramString = params.toString()
    
    // Fazer a requisição para o backend
    const response = await axios.get(`${EVENTS_ENDPOINT}?${paramString}`)
    
    // Deduplica os eventos antes de retorná-los
    if (response.data && response.data.events) {
      response.data.events = deduplicateEvents(response.data.events);
      
      // Atualizar a contagem total para refletir apenas os eventos únicos
      if (isExport) {
        response.data.meta.total = response.data.events.length;
      }
    }
    
    // Retornar os dados recebidos do backend
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao processar requisição para eventos:', error)
    
    // Verificar se é um erro do Axios (resposta do backend)
    if (axios.isAxiosError(error) && error.response) {
      console.error('Erro do backend:', error.response.status, error.response.data)
      
      // Retornar o erro com o mesmo status code e dados do backend
      return NextResponse.json(
        error.response.data,
        { status: error.response.status }
      )
    }
    
    // Erro genérico (não relacionado à resposta do backend)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 