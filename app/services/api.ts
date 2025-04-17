import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS, API_BASE_URL, buildApiUrl } from '@/app/config/api';
import { useMemo } from 'react';

// Tipo para os parâmetros de filtragem por data
interface DateRangeParams {
  from: string;
  to: string;
  time_from?: string;
  time_to?: string;
}

// Tipo para resposta de contagem
interface CountResponse {
  count: number;
  from: string | null;
  to: string | null;
  time_from: string;
  time_to: string;
}

// Tipo para os dados do dashboard
interface DashboardItem {
  id: string;
  type: 'lead' | 'client' | 'session' | 'conversion';
  value: number;
  created_at: string;
}

interface DashboardResponse {
  data: DashboardItem[];
  timeFrame?: string;
  cardType?: string;
  error?: string;
  debug?: any;
  errors?: string[];
}

// Função para converter datas para formato ISO8601
const formatDateToISO = (dateStr: string, isEndDate: boolean = false): string => {
  if (!dateStr) return '';
  
  // Se já for ISO completo, retorna como está
  if (dateStr.includes('T')) return dateStr;
  
  // Cria uma data a partir da string YYYY-MM-DD
  const date = new Date(dateStr);
  
  // Para data final, ajusta para o fim do dia (23:59:59.999)
  if (isEndDate) {
    date.setHours(23, 59, 59, 999);
  } else {
    // Para data inicial, ajusta para o início do dia (00:00:00.000)
    date.setHours(0, 0, 0, 0);
  }
  
  return date.toISOString();
};

// Função auxiliar para fazer chamadas à API
async function fetchFromApi<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });
  
  if (!response.ok) {
    console.error(`API error: ${response.status} ${response.statusText}`);
    
    try {
      // Tenta ler o corpo da resposta para melhor diagnóstico
      const text = await response.text();
      console.error('Response body:', text);
      throw new Error(`API error: ${response.status} ${response.statusText}. Response: ${text}`);
    } catch (e) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  // Tenta fazer parse do JSON com tratamento de erro aprimorado
  try {
    const text = await response.text();
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    throw new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Função utilitária para testar conexão direta com a API
 */
export async function testDirectApiConnection(endpoint: string, params: Record<string, string>) {
  const url = buildApiUrl(endpoint, params);
  console.log('🔍 Testing direct API connection to:', url);
  
  try {
    console.log('Request params:', params);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      data = { text, parseError: e instanceof Error ? e.message : String(e) };
    }
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, string>),
      data,
      url,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Network or other error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      url,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Hook para obter a contagem de leads
 */
export function useLeadCount(params: DateRangeParams) {
  const queryKey = ['leadCount', params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const apiParams = {
        count_only: 'true',
        from: formatDateToISO(params.from, false),
        to: formatDateToISO(params.to, true),
        time_from: params.time_from,
        time_to: params.time_to
      };
      
      const url = buildApiUrl(API_ENDPOINTS.LEAD, apiParams);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lead API error: ${response.status}. Response: ${errorText}`);
          throw new Error(`Lead API error: ${response.status}. Response: ${errorText}`);
        }
        
        const text = await response.text();
        
        if (!text.trim()) {
          console.warn('Empty response from lead API');
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
        
        try {
          const data = JSON.parse(text);
          return data;
        } catch (e) {
          console.error('Failed to parse lead data:', e);
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
      } catch (error) {
        console.error('Error in lead API:', error);
        throw error;
      }
    },
    // Manter cache por 5 minutos (300000ms)
    staleTime: 5 * 60 * 1000,
    // Não refetching automático ao focar a janela
    refetchOnWindowFocus: false,
    // Somente executar se os parâmetros de data estiverem presentes
    enabled: !!params.from && !!params.to,
    retry: 1, // Limitar tentativas de retry para evitar sobrecarga
    // Adicionando debounce para evitar chamadas rápidas repetidas
    gcTime: 5 * 60 * 1000 // 5 minutos de tempo de garbage collection
  });
}

/**
 * Hook para obter a contagem de clientes
 */
export function useClientCount(params: DateRangeParams) {
  const queryKey = ['clientCount', params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const apiParams = {
        count_only: 'true',
        from: formatDateToISO(params.from, false),
        to: formatDateToISO(params.to, true),
        time_from: params.time_from,
        time_to: params.time_to
      };
      
      const url = buildApiUrl(API_ENDPOINTS.CLIENT, apiParams);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Client API error: ${response.status}. Response: ${errorText}`);
          throw new Error(`Client API error: ${response.status}. Response: ${errorText}`);
        }
        
        const text = await response.text();
        
        if (!text.trim()) {
          console.warn('Empty response from client API');
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
        
        try {
          const data = JSON.parse(text);
          return data;
        } catch (e) {
          console.error('Failed to parse client data:', e);
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
      } catch (error) {
        console.error('Error in client API:', error);
        throw error;
      }
    },
    // Manter cache por 5 minutos (300000ms)
    staleTime: 5 * 60 * 1000,
    // Não refetching automático ao focar a janela
    refetchOnWindowFocus: false,
    // Somente executar se os parâmetros de data estiverem presentes
    enabled: !!params.from && !!params.to,
    retry: 1, // Limitar tentativas de retry para evitar sobrecarga
    // Adicionando debounce para evitar chamadas rápidas repetidas
    gcTime: 5 * 60 * 1000 // 5 minutos de tempo de garbage collection
  });
}

/**
 * Hook para obter dados do dashboard usando React Query
 */
export function useDashboardData(
  timeFrame: string = 'Daily',
  dateRange: { from: string; to: string },
  cardType?: string
) {
  // Criar uma queryKey estável e serializada para evitar comparações inconsistentes
  const queryKey = useMemo(() => 
    ['dashboardData', timeFrame, dateRange.from, dateRange.to, cardType || 'all'],
    [timeFrame, dateRange.from, dateRange.to, cardType]
  );
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Validação adicional para evitar chamadas com dados incompletos
      if (!dateRange.from || !dateRange.to) {
        return { data: [], timeFrame, cardType };
      }
      
      try {
        // Usar timeFrame em vez de time_frame para manter consistente com o servidor
        const params: Record<string, string> = {
          from: formatDateToISO(dateRange.from, false),
          to: formatDateToISO(dateRange.to, true),
          timeFrame: timeFrame
        };
        
        if (cardType) {
          params.cardType = cardType;
        }
        
        const apiUrl = '/api/dashboard?' + new URLSearchParams(params);
        console.log('📊 Fetching dashboard data from:', apiUrl);
        
        // Remover a opção force-cache que está causando problemas
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error(`Dashboard API error: ${response.status} ${response.statusText}`);
          return { 
            data: [], 
            timeFrame,
            cardType,
            error: `API error: ${response.status} ${response.statusText}`
          };
        }
        
        const data = await response.json();
        console.log('📊 Dashboard data received:', { 
          dataLength: data.data?.length || 0,
          timeFrame,
          cardType
        });
        
        return { 
          data: data.data || [], 
          timeFrame, 
          cardType,
          debug: data.debug
        };
      } catch (error) {
        console.error('Error in dashboard data fetch:', error);
        return { 
          data: [], 
          timeFrame, 
          cardType,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },
    // Considerações de performance - aumentar cache time para evitar chamadas repetidas
    staleTime: 10 * 60 * 1000, // 10 minutos (aumentado)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevenir refetch ao montar o componente novamente
    refetchOnReconnect: false, // Prevenir refetch ao reconectar
    enabled: !!dateRange.from && !!dateRange.to,
    retry: 0, // Desabilitar retries para evitar loops de falha
    gcTime: 15 * 60 * 1000 // 15 minutos de tempo de garbage collection (aumentado)
  });
}

/**
 * Função para buscar dados do dashboard
 */
export async function fetchDashboardData({ 
  startDate, 
  endDate,
  timeFrame = 'Daily',
  cardType
}: { 
  startDate: string; 
  endDate: string;
  timeFrame?: string;
  cardType?: string;
}) {
  try {
    // Usar timeFrame em vez de time_frame para manter consistente com o servidor
    const params: Record<string, string> = {
      from: formatDateToISO(startDate, false),
      to: formatDateToISO(endDate, true),
      timeFrame: timeFrame
    };
    
    if (cardType) {
      params.cardType = cardType;
    }
    
    const response = await fetch('/api/dashboard?' + new URLSearchParams(params));
    
    if (!response.ok) {
      return { 
        data: [], 
        error: `API error: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    return { data: data.data || [], timeFrame, cardType };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { 
      data: [], 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Hook para obter a contagem de sessões
 */
export function useSessionCount(params: DateRangeParams) {
  const queryKey = ['sessionCount', params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const apiParams = {
        count_only: 'true',
        from: formatDateToISO(params.from, false),
        to: formatDateToISO(params.to, true),
        time_from: params.time_from,
        time_to: params.time_to
      };
      
      const url = buildApiUrl(API_ENDPOINTS.SESSION, apiParams);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          console.error(`Session API error: ${response.status}`);
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
        
        const text = await response.text();
        
        if (!text.trim()) {
          console.warn('Empty response from session API');
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
        
        try {
          const data = JSON.parse(text);
          return data;
        } catch (e) {
          console.error('Failed to parse session data:', e);
          return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
        }
      } catch (error) {
        console.error('Error in session API:', error);
        return { count: 0, from: null, to: null, time_from: "00:00", time_to: "23:59" };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.from && !!params.to,
    retry: 1,
    gcTime: 5 * 60 * 1000
  });
}

/**
 * Hook para obter o número de sessões ativas atual
 */
export function useActiveSessionCount(params?: Partial<DateRangeParams> & { profession_id?: string; funnel_id?: string }) {
  const queryKey = ['activeSessionCount', params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Preparar parâmetros
      const apiParams: Record<string, string> = {
        count_only: 'true',
        landingPage: 'lp.vagasjustica.com.br'  // Adicionar o parâmetro landingPage para consistência com outras chamadas
      };
      
      if (params?.from) apiParams.from = formatDateToISO(params.from, false);
      if (params?.to) apiParams.to = formatDateToISO(params.to, true);
      
      // Adicionar parâmetros de profissão e funil, se disponíveis
      if (params?.profession_id) apiParams.profession_id = params.profession_id;
      if (params?.funnel_id) apiParams.funnel_id = params.funnel_id;
      
      // Usar a API route do Next.js em vez de chamar diretamente o backend
      const queryString = new URLSearchParams(apiParams).toString();
      const url = `/api/session/active?${queryString}`;
      
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          return { active_count: 0, count: 0, timestamp: new Date().toISOString() };
        }
        
        try {
          const data = await response.json();
          
          // Normalizar dados, garantindo que temos active_count
          const normalizedData = {
            ...data,
            active_count: data.active_count || data.count || 0,
            count: data.count || data.active_count || 0,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          return normalizedData;
        } catch (error) {
          return { active_count: 0, count: 0, timestamp: new Date().toISOString() };
        }
      } catch (error) {
        return { active_count: 0, count: 0, timestamp: new Date().toISOString() };
      }
    },
    // Configurações para dados em tempo real
    staleTime: 30 * 1000, // Considerar dados "frescos" por apenas 30 segundos
    refetchInterval: 60 * 1000, // Atualizar automaticamente a cada 1 minuto
    refetchOnWindowFocus: true,
  });
} 