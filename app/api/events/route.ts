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


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Verificar se essa é uma requisição sem filtros (após limpeza)
    // Contamos apenas os parâmetros básicos: page, limit, sortBy, sortDirection
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
    
    // Se for uma requisição com apenas parâmetros básicos, não aplique nenhum filtro
    if (hasOnlyBasicParams) {
      console.log('API: Requisição sem filtros detectada - não aplicando filtros padrão');
      
      // Transferir apenas parâmetros básicos
      if (searchParams.has('page')) params.append('page', searchParams.get('page')!);
      if (searchParams.has('limit')) params.append('limit', searchParams.get('limit')!);
      if (searchParams.has('sortBy')) params.append('sortBy', searchParams.get('sortBy')!);
      if (searchParams.has('sortDirection')) params.append('sortDirection', searchParams.get('sortDirection')!);
      
      const paramString = params.toString();
      // Fazer a requisição para o backend com parâmetros mínimos
      const response = await axios.get(`${EVENTS_ENDPOINT}?${paramString}`);
      // Retornar os dados recebidos do backend
      return NextResponse.json(response.data);
    }
    
    // Caso contrário, continue com o processamento normal dos filtros
    // Verificar especificamente se os filtros avançados existem
    const advancedFilters = searchParams.get('advanced_filters')
    const filterCondition = searchParams.get('filter_condition')
    
    // Criar uma nova instância de URLSearchParams para a requisição ao backend
    
    // Fazer uma cópia dos parâmetros originais para garantir que não são perdidos
    const originalParams = Array.from(searchParams.entries());
    
    // Verificação para garantir que advanced_filters está presente na cópia
    if (advancedFilters) {
      let foundInOriginal = false;
      for (const [key, value] of originalParams) {
        if (key === 'advanced_filters') {
          foundInOriginal = true;
          break;
        }
      }
      
      if (!foundInOriginal) {
        originalParams.push(['advanced_filters', advancedFilters]);
      }
      
      if (filterCondition && !originalParams.some(([key]) => key === 'filter_condition')) {
        originalParams.push(['filter_condition', filterCondition]);
      }
    }
    
    // Transferir todos os parâmetros da requisição para os parâmetros da chamada ao backend
    for (const [key, value] of originalParams) {
      // Para o caso de advanced_filters, garantir que é uma string JSON válida
      if (key === 'advanced_filters') {
        try {
          // Testar se é JSON válido
          const parsedFilters = JSON.parse(value)
          params.append(key, value)
        } catch (err) {
          console.error('Erro ao processar advanced_filters:', err)
          // Não adicionar um valor inválido
        }
      } else {
        params.append(key, value)
      }
    }
    
    // Verificação final para garantir que advanced_filters foi adicionado
    if (advancedFilters && !params.has('advanced_filters')) {
      params.set('advanced_filters', advancedFilters);
      
      if (filterCondition) {
        params.set('filter_condition', filterCondition);
      }
    }
    
    const paramString = params.toString()
    
    // Fazer a requisição para o backend
    const response = await axios.get(`${EVENTS_ENDPOINT}?${paramString}`)
    
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