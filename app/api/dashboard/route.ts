import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS, API_BASE_URL, buildApiUrl } from '@/app/config/api';

// Tipo para os erros
type ApiError = string;

// Tipo para os dados do dashboard
interface DashboardItem {
  id: string;
  type: string;
  created_at: string;
  value: number;
}

// Função auxiliar para buscar dados com formato de períodos de um endpoint específico
async function fetchPeriodData(
  endpoint: string,
  fromISO: string,
  toISO: string,
  errors: ApiError[],
  request: NextRequest,
  isFullPeriod: boolean = false,
  selectedDates?: string[] // Novo parâmetro para as datas selecionadas
) {
  try {
    // Verificar se o endpoint existe no API_ENDPOINTS
    const endpointKey = endpoint.toUpperCase() as keyof typeof API_ENDPOINTS;
    if (!(endpointKey in API_ENDPOINTS)) {
      const errorMsg = `Invalid endpoint: ${endpoint}`;
      errors.push(errorMsg);
      return { periods: {}, error: errorMsg };
    }

    // Adicionar timestamp para evitar cache
    const cacheBuster = new Date().getTime();
    
    // Parâmetros para a API
    const params: Record<string, string> = {
      _: cacheBuster.toString(), // Evitar cache
      count_only: 'true' // Sempre usar count_only=true para todos os endpoints
    };
    
    // Se temos datas específicas, usá-las prioritariamente
    if (selectedDates && selectedDates.length > 0) {
      params.periods = selectedDates.join(',');
      console.log(`Using specific periods for ${endpoint}: ${selectedDates.length} dates from ${selectedDates[0]} to ${selectedDates[selectedDates.length-1]}`);
    } else if (!isFullPeriod && fromISO && toISO) {
      // Se não temos datas específicas mas temos from/to, gerar lista de datas
      try {
        const startDate = new Date(fromISO);
        const endDate = new Date(toISO);
        
        // Validar datas
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error(`Invalid date range: ${fromISO} to ${toISO}`);
        }
        
        // Calcular diferença em dias
        const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Limitar a 60 dias para evitar URLs muito longas
        if (dayDiff <= 60) {
          // Gerar lista de datas no formato YYYY-MM-DD
          const dateList: string[] = [];
          const tempDate = new Date(startDate);
          
          for (let i = 0; i < dayDiff; i++) {
            const year = tempDate.getFullYear();
            const month = String(tempDate.getMonth() + 1).padStart(2, '0');
            const day = String(tempDate.getDate()).padStart(2, '0');
            
            dateList.push(`${year}-${month}-${day}`);
            tempDate.setDate(tempDate.getDate() + 1);
          }
          
          params.periods = dateList.join(',');
          console.log(`Generated ${dateList.length} periods for ${endpoint} from ${dateList[0]} to ${dateList[dateList.length-1]}`);
      } else {
          // Se o intervalo for muito grande, usar from/to como fallback
          params.from = fromISO;
          params.to = toISO;
          console.log(`Date range too large (${dayDiff} days) for periods parameter, using from/to instead for ${endpoint}`);
        }
      } catch (error) {
        // Se houver erro na geração de datas, usar from/to como fallback
        console.error(`Error generating date list for ${endpoint}:`, error);
        params.from = fromISO;
        params.to = toISO;
      }
    }
    
    // Tratar o caso especial do endpoint de sessão na porta 8080
    if (endpoint === 'session') {
      // Construir a URL para a API externa na porta 8080
      const sessionUrl = `http://localhost:8080/session/?${new URLSearchParams(params)}`;
      
      console.log(`Fetching session data with URL: ${sessionUrl.length > 150 ? 
        sessionUrl.slice(0, 150) + '...' : sessionUrl}`);
      
      const response = await fetch(sessionUrl, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Se a resposta contiver periods, usar diretamente
        if (data.periods) {
          console.log(`Received ${Object.keys(data.periods).length} periods for ${endpoint}`);
          return { periods: data.periods };
        } 
        // Se tiver apenas contagem total
        else if (data.count !== undefined) {
          console.log(`Received session count: ${data.count}`);
          
          // Converter para formato de períodos com uma chave 'total'
          // ou distribuir entre o período solicitado se disponível
          if (params.periods) {
            // Se temos períodos específicos, tentar distribuir a contagem
            const periodsArray = params.periods.split(',');
            const periodsObj: Record<string, number> = {};
            
            // Distribuir a contagem igualmente entre os períodos (ou usar dados reais se disponíveis)
            // Podemos melhorar esta distribuição com um padrão mais realista se necessário
            for (const date of periodsArray) {
              // Para simplificar, distribuir igualmente
              periodsObj[date] = Math.round(data.count / periodsArray.length);
            }
            
            return { periods: periodsObj };
          }
          
          // Se não temos períodos específicos, retornar como 'total'
          return {
            periods: { 'total': data.count },
            count: data.count
          };
        } else {
          console.warn(`No period data or count returned for ${endpoint}`);
          return { periods: {} };
        }
      } else {
        const errorText = await response.text();
        const errorMsg = `Failed to fetch sessions: ${response.status} ${response.statusText}. Response: ${errorText}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        return { periods: {}, error: errorMsg };
      }
    } else {
      // Para outros endpoints (APIs locais)
      // Construir URL para a API interna usando a URL da requisição atual como base
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const internalUrl = `${baseUrl}/api/${endpoint}?${new URLSearchParams(params)}`;
      
      console.log(`Fetching data from ${endpoint} with URL: ${internalUrl.length > 150 ? internalUrl.slice(0, 150) + '...' : internalUrl}`);
      
      const response = await fetch(internalUrl, { 
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Verificar se a resposta contém dados de períodos
        if (responseData.periods && typeof responseData.periods === 'object') {
          console.log(`Received ${Object.keys(responseData.periods).length} periods for ${endpoint}`);
          return { periods: responseData.periods };
        } 
        // Se tiver apenas contagem total
        else if (responseData.count !== undefined) {
          console.log(`Received count ${responseData.count} for ${endpoint}`);
          
          // Similar ao caso da sessão, converter para formato de períodos
          if (params.periods) {
            // Se temos períodos específicos, tentar distribuir a contagem
            const periodsArray = params.periods.split(',');
            const periodsObj: Record<string, number> = {};
            
            // Distribuir a contagem igualmente entre os períodos
            for (const date of periodsArray) {
              periodsObj[date] = Math.round(responseData.count / periodsArray.length);
            }
            
            return { periods: periodsObj };
          }
          
          // Se não temos períodos específicos, retornar como 'total'
          return { 
            periods: { 'total': responseData.count },
            count: responseData.count
          };
        } else {
          console.warn(`No period data or count returned for ${endpoint}`);
          
          // Log da resposta para debug
          console.log('Response received:', JSON.stringify(responseData).substring(0, 200) + '...');
          
          return { periods: {} };
        }
      } else {
        const errorText = await response.text();
        const errorMsg = `Failed to fetch ${endpoint}: ${response.status} ${response.statusText}. Response: ${errorText}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        return { periods: {}, error: errorMsg };
      }
      }
    } catch (error) {
    const errorMsg = `Error fetching ${endpoint}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
    console.error(errorMsg);
    return { periods: {}, error: errorMsg };
  }
}

// Função para obter dados do dashboard combinando múltiplas fontes
export async function GET(request: NextRequest) {
  try {
    console.log('Dashboard API - Iniciando requisição');
    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const timeFrame = searchParams.get('timeFrame');
    const cardType = searchParams.get('cardType');
    const debugMode = searchParams.get('debug_mode') === 'true';
    
    console.log('Dashboard API - Parâmetros:', { from, to, timeFrame, cardType, debugMode });
    
    // Obter lista de períodos específicos se fornecida
    const periodsParam = searchParams.get('periods');
    let selectedDates: string[] = [];
    
    if (periodsParam) {
      selectedDates = periodsParam.split(',').map(date => date.trim());
      console.log(`Dashboard API - Usando lista específica de ${selectedDates.length} datas`);
    }
    
    // Verificar se está buscando o período completo (sem filtros de data)
    const isFullPeriod = searchParams.get('isFullPeriod') === 'true' || (!from && !to && !periodsParam);
    console.log('Dashboard API - isFullPeriod:', isFullPeriod);
    
    // Determinar datas a usar
    let fromISO, toISO;
    
    try {
      if (isFullPeriod) {
        console.log('Dashboard API - Buscando todos os dados sem filtros de data');
        
        // Valores vazios que não serão usados quando isFullPeriod=true
        fromISO = '';
        toISO = '';
      } else if (selectedDates.length > 0) {
        // Se temos datas específicas, usamos o primeiro e o último como from/to
        // apenas para a geração do período no gráfico (não afeta a consulta)
        const firstDate = new Date(selectedDates[0]);
        const lastDate = new Date(selectedDates[selectedDates.length - 1]);
        
        fromISO = firstDate.toISOString();
        toISO = lastDate.toISOString();
        
        console.log(`Dashboard API - Usando lista de ${selectedDates.length} datas de ${firstDate.toLocaleDateString()} a ${lastDate.toLocaleDateString()}`);
      } else {
        // Verificar parâmetros obrigatórios quando não está buscando período completo
        if (!from || !to) {
          console.log('Dashboard API - Erro: Parâmetros de data (from e to) são obrigatórios');
          return NextResponse.json({ 
            error: 'Parâmetros de data (from e to) são obrigatórios' 
          }, { 
            status: 400,
            headers: {
              'Cache-Control': 'no-store'
            }
          });
        }
        
        // Converter datas para formato ISO8601 com horários específicos
        try {
          console.log('Dashboard API - Convertendo datas para ISO8601:', { from, to });
          const fromDate = new Date(from);
          fromDate.setHours(0, 0, 0, 0);
          fromISO = fromDate.toISOString();
          
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          toISO = toDate.toISOString();
          
          console.log('Dashboard API - Datas convertidas:', { fromISO, toISO });
          
          // Gerar a lista de datas para o intervalo selecionado se timeFrame for 'Daily'
          if (timeFrame === 'Daily' && !periodsParam) {
            const dayDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            if (dayDiff <= 60) { // Limite de 60 dias para evitar URLs muito longas
              // Gerar array de datas no formato YYYY-MM-DD
              for (let i = 0; i < dayDiff; i++) {
                const currentDate = new Date(fromDate);
                currentDate.setDate(fromDate.getDate() + i);
                selectedDates.push(currentDate.toISOString().split('T')[0]);
              }
              console.log(`Dashboard API - Gerando lista de ${selectedDates.length} datas para o período selecionado`);
            } else {
              console.log(`Dashboard API - Intervalo de ${dayDiff} dias muito grande para gerar lista completa de datas`);
            }
          }
          
          const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`Dashboard API - Intervalo: ${diffDays} dias (${fromISO} a ${toISO})`);
        } catch (dateError) {
          console.error('Dashboard API - Erro ao processar datas:', dateError);
          return NextResponse.json({ 
            error: 'Invalid time value', 
            details: String(dateError),
            data: []
          }, { 
            status: 400,
            headers: {
              'Cache-Control': 'no-store'
            }
          });
        }
      }
    } catch (dataError) {
      console.error('Dashboard API - Erro ao processar dados:', dataError);
      return NextResponse.json({ 
        error: 'Invalid time value', 
        details: String(dataError),
        data: []
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }
    
    // Mapear entre o tipo de card (que pode ser plural) e o nome do endpoint (singular)
    const cardToEndpoint: Record<string, string> = {
      'leads': 'lead',
      'clients': 'client',
      'sessions': 'session',
      'lead': 'lead',
      'client': 'client',
      'session': 'session',
      'conversions': 'conversion' // Não existe esta rota, mas mantemos para consistência
    };
    
    // Determinar quais endpoints buscar com base no cardType
    const endpointsToFetch = cardType 
      ? (cardType === 'conversions' ? [] : [cardToEndpoint[cardType] || cardType])
      : ['lead', 'client', 'session'];
    
    // Arrays para armazenar resultados e erros
    const errors: ApiError[] = [];
    
    console.log('Endpoints to fetch:', endpointsToFetch);
    
    // Buscar dados de cada endpoint em paralelo
    const fetchPromises = endpointsToFetch
      .filter(Boolean) // Remover nulos
      .map(async endpoint => {
        if (!endpoint) return null;
        
        // Buscar dados do período para este endpoint
        const result = await fetchPeriodData(
          endpoint, 
          fromISO, 
          toISO, 
          errors, 
          request, 
          isFullPeriod, 
          selectedDates.length > 0 ? selectedDates : undefined
        );
        
        // Retornar o endpoint e os dados de períodos
        return {
          endpoint,
          ...result
        };
      });
    
    // Aguardar todas as requisições
    const results = await Promise.all(fetchPromises);
    
    // Combinar todos os resultados em uma estrutura única
    const combinedData: Record<string, Record<string, number>> = {
      leads: {},
      clients: {},
      sessions: {},
      conversions: {} // Sempre vazio, para consistência
    };
    
    // Processar resultados
    results.forEach(result => {
      if (!result) return;
      
      const { endpoint, periods } = result;
      
      // Mapear o endpoint para o nome plural a ser exibido no gráfico
      const displayType = endpoint === 'lead' ? 'leads' :
                         endpoint === 'client' ? 'clients' :
                         endpoint === 'session' ? 'sessions' : 
                         endpoint === 'conversion' ? 'conversions' : endpoint;
      
      // Adicionar períodos ao resultado combinado
      if (periods) {
        combinedData[displayType] = { ...periods };
      }
    });
    
    // Converter os dados de períodos para o formato mais amigável para o componente
    const dashboardData: DashboardItem[] = [];
    
    // Para cada endpoint com períodos
    Object.entries(combinedData).forEach(([type, periods]) => {
      // Para cada período neste endpoint
      Object.entries(periods).forEach(([date, count]) => {
        // Determinar o tipo de entidade com base no tipo de endpoint
        const entityType = type === 'leads' ? 'lead' :
                          type === 'clients' ? 'client' :
                          type === 'sessions' ? 'session' : 'conversion';
        
        // Adicionar um item para este período
        dashboardData.push({
          id: `${entityType}-${date}`,
          type: entityType,
          created_at: new Date(`${date}T12:00:00Z`).toISOString(), // Usar horário do meio-dia
          value: Number(count)
        });
      });
    });
    
    // Adicionar cabeçalhos de cache para melhorar a performance no cliente
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    
    // Retornar dados combinados com cabeçalhos de cache
    return NextResponse.json({ 
      data: dashboardData, 
      timeFrame, 
      cardType,
      debug: {
        from: isFullPeriod ? null : fromISO,
        to: isFullPeriod ? null : toISO,
        isFullPeriod,
        endpoints: endpointsToFetch,
        combinedPeriods: Object.keys(combinedData).map(key => ({ 
          type: key, 
          count: Object.keys(combinedData[key]).length 
        }))
      },
      errors: errors.length > 0 ? errors : undefined
    }, { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error in dashboard route:', error);
    
    // Incluir detalhes do erro se o modo de depuração estiver ativado
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name
    } : { 
      message: String(error) 
    };
    
    // Retornar erro
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      details: errorDetails,
      data: []
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE'
      }
    });
  }
} 