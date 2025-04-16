import { NextRequest, NextResponse } from 'next/server';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';
import { API_BASE_URL, API_ENDPOINTS } from '@/app/config/api';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

// Configurações de timeout e cache
const TIMEOUT_MS = 30000; // 30 segundos
const CACHE_TTL = 60; // 1 minuto

/**
 * Função auxiliar para converter uma data para o formato UTC com timezone do Brasil
 */
function toBrazilianTimezone(dateString: string): string {
  // Converter para objeto Date
  const date = new Date(dateString);
  // Converter para horário de Brasília
  const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  
  // Formatar no padrão ISO com timezone -03:00
  const year = brazilDate.getFullYear();
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
  const day = String(brazilDate.getDate()).padStart(2, '0');
  const hours = String(brazilDate.getHours()).padStart(2, '0');
  const minutes = String(brazilDate.getMinutes()).padStart(2, '0');
  const seconds = String(brazilDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Função auxiliar para formatar a data no formato ISO 8601 (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Função auxiliar para formatar o horário no formato HH:MM
 */
function formatTimeToHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * GET handler for optimized dashboard data fetching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get specific parameters
    let from = searchParams.get('from');
    let to = searchParams.get('to');
    const timeFrame = (searchParams.get('timeFrame') || 'Daily') as TimeFrame;
    const cardType = searchParams.get('cardType') || null;
    const professionId = searchParams.get('profession_id') || null;
    const funnelId = searchParams.get('funnel_id') || null;
    
    // Se não tiver datas, usar o dia atual no horário de Brasília
    if (!from || !to) {
      const today = new Date();
      // Converter para horário de Brasília
      const brazilDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      
      // Formatar a data no formato ISO 8601 (YYYY-MM-DD)
      from = formatDateToISO(brazilDate);
      to = formatDateToISO(brazilDate);
      
      // Definir horários padrão (início e fim do dia)
      const timeFrom = formatTimeToHHMM(new Date(brazilDate.setHours(0, 0, 0, 0)));
      const timeTo = formatTimeToHHMM(new Date(brazilDate.setHours(23, 59, 59, 999)));
    } else {
      // Garantir que as datas fornecidas estejam no formato correto
      try {
        if (from) {
          const fromDate = new Date(from);
          from = formatDateToISO(fromDate);
        }
        if (to) {
          const toDate = new Date(to);
          to = formatDateToISO(toDate);
        }
      } catch (e) {
        // Manter as datas originais se houver erro
      }
    }
    
    // Obter parâmetros de horário (a partir da string da URL, não da data)
    const timeFrom = searchParams.get('time_from') || "00:00";
    const timeTo = searchParams.get('time_to') || "23:59";
    
    // Build query params com parâmetros corretos de horário
    const params: Record<string, string> = { 
      count_only: 'true',
      landingPage: 'lp.vagasjustica.com.br'
    };
    
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !from && !to;
    
    if (useAllData) {
      params.all_data = 'true';
    } else {
      if (from) params.from = from;
      if (to) params.to = to;
      params.time_from = timeFrom;
      params.time_to = timeTo;
      params.period = 'true';
    }
    
    // Normalize card type
    const normalizedCardType = cardType 
      ? cardType.endsWith('s') ? cardType : `${cardType}s` 
      : undefined;
    
    // Determine which endpoints to call based on card type
    let sessionUrl: string | undefined;
    let leadUrl: string | undefined;
    
    // Use the correct session endpoint (SESSION) from API_ENDPOINTS
    // Note: This is using the singular form - /session
    const sessionParams: Record<string, string> = { 
      count_only: 'true', // Always include count_only for dashboard data
      period: 'true',     // Include period=true to get data grouped by days
      landingPage: 'lp.vagasjustica.com.br'  // Ensure landingPage parameter is included for sessions
    };
    
    // Add date parameters
    if (from) sessionParams.from = from;
    if (to) sessionParams.to = to;
    if (timeFrom) sessionParams.time_from = timeFrom;
    if (timeTo) sessionParams.time_to = timeTo;
    
    // Use all_data if no date range is provided
    if (useAllData) {
      sessionParams.all_data = 'true';
      // Remove date params if using all_data
      delete sessionParams.from;
      delete sessionParams.to;
    }
    
    // Add profession_id and funnel_id to session params if provided
    if (professionId) {
      sessionParams.profession_id = professionId;
    }
    
    if (funnelId) {
      sessionParams.funnel_id = funnelId;
    }
    
    // Use session params when building session URL - Using API_ENDPOINTS.SESSION for consistent formatting
    sessionUrl = `${API_ENDPOINTS.SESSION}?${new URLSearchParams(sessionParams).toString()}`;
    
    // Adicionar filtro para buscar leads da tabela de eventos
    // Formato específico para busca de leads com horários
    const leadParams: Record<string, string> = { 
      count_only: 'true',
      from: from || '',
      to: to || '',
      time_from: timeFrom,
      time_to: timeTo,
      period: 'true',
      event_type: 'LEAD'
    };
    
    // Add profession_id or funnel_id to lead params if provided
    if (professionId) {
      leadParams.profession_id = professionId;
    }
    
    if (funnelId) {
      leadParams.funnel_id = funnelId;
    }
    
    if (normalizedCardType) {
      switch (normalizedCardType) {
        case 'sessions':
          // Session URL is already set above
          break;
        case 'leads':
          // Agora busca em /events com formato específico
          const leadsSearchParams = new URLSearchParams();
          // Adicionar apenas parâmetros não vazios
          for (const [key, value] of Object.entries(leadParams)) {
            if (value) leadsSearchParams.append(key, value);
          }
          leadUrl = `${API_ENDPOINTS.EVENTS}/?${leadsSearchParams.toString()}`;
          
          break;
        case 'clients':
          // Não buscar dados de clients (Connect Rate)
          break;
        case 'conversions':
          // Conversions requires only sessions (already set above) and leads data
          // Agora busca em /events com formato específico
          const convLeadsSearchParams = new URLSearchParams();
          // Adicionar apenas parâmetros não vazios
          for (const [key, value] of Object.entries(leadParams)) {
            if (value) convLeadsSearchParams.append(key, value);
          }
          leadUrl = `${API_ENDPOINTS.EVENTS}/?${convLeadsSearchParams.toString()}`;
          
          break;
      }
    } else {
      // If no specific card, we need data except clients
      // Session URL is already set above
      
      // Agora busca em /events com formato específico
      const allLeadsSearchParams = new URLSearchParams();
      // Adicionar apenas parâmetros não vazios
      for (const [key, value] of Object.entries(leadParams)) {
        if (value) allLeadsSearchParams.append(key, value);
      }
      leadUrl = `${API_ENDPOINTS.EVENTS}/?${allLeadsSearchParams.toString()}`;
      
      // Não buscar dados de clients (Connect Rate)
    }
    
    try {
      // Fetch all data in parallel with timeout
      const results = await Promise.all([
        sessionUrl ? fetchApiData(sessionUrl, 'sessions') : Promise.resolve([]),
        leadUrl ? fetchApiData(leadUrl, 'leads') : Promise.resolve([])
      ]);
      
      const sessionData = results[0];
      const leadData = results[1];
      
      // Generate conversion data if we have both leads and sessions
      let conversionData: DashboardDataItem[] = [];
      if (leadData.length > 0 && sessionData.length > 0) {
        // Get all unique dates
        const dates = Array.from(new Set([
          ...leadData.map(item => item.date),
          ...sessionData.map(item => item.date)
        ]));
        
        // Calculate conversions for each date
        conversionData = dates.map(date => {
          const leadsForDate = leadData.find(item => item.date === date)?.count || 0;
          const sessionsForDate = sessionData.find(item => item.date === date)?.count || 0;
          
          // Conversion is the percentage of sessions that became leads
          const conversionRate = sessionsForDate > 0 
            ? (leadsForDate / sessionsForDate) * 100 
            : 0;
          
          return {
            date,
            count: Math.round(conversionRate),
            type: 'conversions'
          };
        });
      }
      
      // Combine all data
      const combinedData = [
        ...sessionData,
        ...leadData,
        ...conversionData
      ];
      
      // Filter by date range if provided
      const filteredData = from && to ? 
        combinedData.filter(item => {
          const itemDate = item.date.split('T')[0];
          const fromDate = from.split('T')[0];
          const toDate = to.split('T')[0];
          return itemDate >= fromDate && itemDate <= toDate;
        }) : 
        combinedData;
      
      return NextResponse.json({ 
        data: filteredData,
        timeFrame,
        cardType
      }, {
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`,
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (error) {
      return NextResponse.json({ 
        data: [],
        errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { 
        status: 500 
      });
    }
  } catch (error) {
    return NextResponse.json({ 
      data: [],
      errors: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { 
      status: 500 
    });
  }
}

/**
 * Helper function to fetch data from an API endpoint with timeout and retry
 */
async function fetchApiData(url: string, type: string, retryCount = 0): Promise<DashboardDataItem[]> {
  try {
    // Criar um controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Configurar cabeçalhos especiais para a requisição
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };

    const response = await fetch(url, { 
      signal: controller.signal,
      headers
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // For 5xx server errors, try to retry
      if (response.status >= 500 && response.status < 600 && retryCount < 2) {
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchApiData(url, type, retryCount + 1);
      }
      
      return [];
    }
    
    const data = await response.json();
    
    // Special handling for sessions data
    if (type === 'sessions') {
      // Check if this is a sessions response
      if (data && typeof data === 'object') {
        // Handle array of period objects format: { periods: [{date, count}, {date, count}] }
        if (data.periods && Array.isArray(data.periods)) {
          // Map the periods array to our format
          return data.periods.map((period: any) => ({
            date: period.date,
            count: Number(period.count) || 0,
            type: 'sessions'
          }));
        }
        // Handle object format: { periods: { "date1": count1, "date2": count2 } }
        else if (data.periods && typeof data.periods === 'object') {
          // Convert periods object to array of items
          return Object.entries(data.periods).map(([date, count]) => ({
            date,
            count: Number(count) || 0,
            type: 'sessions'
          }));
        } else if (Array.isArray(data.data)) {
          // Map the data array to our format
          return data.data.map((item: any) => ({
            date: item.date || item.created_at || formatDateToISO(new Date()),
            count: item.count || 1,
            type: 'sessions'
          }));
        } else if (Array.isArray(data)) {
          // The response itself is an array
          return data.map((item: any) => ({
            date: item.date || item.created_at || formatDateToISO(new Date()),
            count: item.count || 1,
            type: 'sessions'
          }));
        } else if (data.total !== undefined) {
          // Just create a single entry for today with the total count
          return [{
            date: formatDateToISO(new Date()),
            count: Number(data.total) || 0,
            type: 'sessions'
          }];
        }
      }
      
      return [];
    }
    
    // Verifica se estamos lidando com dados da API de eventos (para leads)
    if (url.includes(API_ENDPOINTS.EVENTS) && type === 'leads') {
      // Se for um array, extrair e converter eventos para o formato de leads
      if (data && Array.isArray(data)) {
        return data.map(event => {
          // Extrair data e converter para formato ISO
          const eventDate = event.created_at || event.date;
          let formattedDate;
          
          try {
            const dateObj = new Date(eventDate);
            formattedDate = formatDateToISO(dateObj);
          } catch (e) {
            // Fallback para data atual
            formattedDate = formatDateToISO(new Date());
          }
          
          return {
            date: formattedDate,
            count: 1,
            type: 'leads'
          };
        });
      } 
      // Se for objeto com formato de períodos
      else if (data && typeof data === 'object' && data.periods) {
        const entries = Object.entries(data.periods);
        
        return entries.map(([date, count]) => ({
          date,
          count: Number(count) || 0, // Garante que seja number
          type: 'leads'
        }));
      }
      // Se for objeto com propriedade events contendo um array
      else if (data && typeof data === 'object' && Array.isArray(data.events)) {
        // Agrupar eventos por data
        const eventsByDate: Record<string, number> = data.events.reduce((acc: Record<string, number>, event: any) => {
          // Extrair a data e formatá-la no padrão ISO
          const eventDate = event.created_at || event.date;
          let isoDate;
          
          try {
            const dateObj = new Date(eventDate);
            isoDate = formatDateToISO(dateObj);
          } catch (e) {
            // Fallback para data atual
            isoDate = formatDateToISO(new Date());
          }
          
          acc[isoDate] = (acc[isoDate] || 0) + 1;
          return acc;
        }, {});
        
        // Converter o agrupamento para o formato esperado
        return Object.entries(eventsByDate).map(([date, count]) => ({
          date,
          count: count,
          type: 'leads'
        })) as DashboardDataItem[];
      }
      // Último caso - objeto com lista de eventos com estrutura específica
      else if (data && typeof data === 'object') {
        try {
          // Tenta extrair eventos
          const events = data.data || data.events || data.items || [];
          
          if (Array.isArray(events) && events.length > 0) {
            // Agrupar eventos por data
            const eventsByDate: Record<string, number> = events.reduce((acc: Record<string, number>, event: any) => {
              // Extrair a data do evento com fallbacks para vários formatos possíveis
              const eventDate = event.created_at || event.date || event.timestamp || new Date().toISOString();
              let isoDate;
              
              try {
                const dateObj = new Date(eventDate);
                isoDate = formatDateToISO(dateObj);
              } catch (e) {
                // Fallback para data atual
                isoDate = formatDateToISO(new Date());
              }
              
              acc[isoDate] = (acc[isoDate] || 0) + 1;
              return acc;
            }, {});
            
            // Converter o agrupamento para o formato esperado
            return Object.entries(eventsByDate).map(([date, count]) => ({
              date,
              count: count,
              type: 'leads'
            })) as DashboardDataItem[];
          }
        } catch (e) {
          // Ignorar erros de processamento
        }
      }
      
      return [];
    }
    
    if (data && Array.isArray(data)) {
      // Map the API data to our format
      return data.map(item => ({
        date: item.date,
        count: item.count || 0,
        type
      }));
    } else if (data && typeof data === 'object' && data.periods) {
      // Handle periods-specific format
      const entries = Object.entries(data.periods);
      
      return entries.map(([date, count]) => ({
        date,
        count: count as number,
        type
      }));
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Retry on timeout if we haven't reached max retries
      if (retryCount < 2) {
        // Wait 3 seconds before retrying after a timeout
        await new Promise(resolve => setTimeout(resolve, 3000));
        return fetchApiData(url, type, retryCount + 1);
      }
    }
    return [];
  }
} 