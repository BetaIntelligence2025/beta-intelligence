import { NextRequest, NextResponse } from 'next/server';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';
import { API_BASE_URL, API_ENDPOINTS } from '@/app/config/api';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

// Configurações de timeout e cache
const TIMEOUT_MS = 15000; // 15 segundos
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
    
    // Se não tiver datas, usar o dia atual no horário de Brasília
    if (!from || !to) {
      const today = new Date();
      // Converter para horário de Brasília
      const brazilDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      
      // Formatar as datas no formato esperado pela API
      const year = brazilDate.getFullYear();
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
      const day = String(brazilDate.getDate()).padStart(2, '0');
      
      from = `${year}-${month}-${day}T00:00:00-03:00`;
      to = `${year}-${month}-${day}T23:59:59-03:00`;
      
      console.log('Usando data padrão (hoje) para dashboard:', { from, to });
    } else {
      // Garantir que as datas fornecidas estejam no timezone do Brasil
      try {
        if (from) from = toBrazilianTimezone(from).split('T')[0] + 'T00:00:00-03:00';
        if (to) to = toBrazilianTimezone(to).split('T')[0] + 'T23:59:59-03:00';
      } catch (e) {
        console.error('Erro ao converter datas para timezone do Brasil:', e);
        // Manter as datas originais se houver erro
      }
    }
    
    // Build query params
    const params: Record<string, string> = { 
      count_only: 'true'
    };
    
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !from && !to;
    
    if (useAllData) {
      params.all_data = 'true';
    } else {
      if (from) params.from = from;
      if (to) params.to = to;
      params.period = 'true';
    }
    
    // Normalize card type
    const normalizedCardType = cardType 
      ? cardType.endsWith('s') ? cardType : `${cardType}s` 
      : undefined;
    
    // Determine which endpoints to call based on card type
    let sessionUrl: string | undefined;
    let leadUrl: string | undefined;
    
    // Adicionar filtro de landing page para sessões
    const sessionParams = { ...params, landing_page: 'lp.vagasjustica.com.br' };
    
    // Adicionar filtro para buscar leads da tabela de eventos
    // Formato específico para busca de leads: count_only=true&from=X&to=Y&period=true&event_type=LEAD
    const leadParams = { 
      count_only: 'true',
      from: from || '',
      to: to || '',
      period: 'true',
      event_type: 'LEAD'
    };
    
    if (normalizedCardType) {
      switch (normalizedCardType) {
        case 'sessions':
          sessionUrl = `${API_BASE_URL}/session/?${new URLSearchParams(sessionParams)}`;
          break;
        case 'leads':
          // Agora busca em /events com formato específico
          const leadsSearchParams = new URLSearchParams();
          // Adicionar apenas parâmetros não vazios
          for (const [key, value] of Object.entries(leadParams)) {
            if (value) leadsSearchParams.append(key, value);
          }
          leadUrl = `${API_ENDPOINTS.EVENTS}/?${leadsSearchParams.toString()}`;
          console.log(`Lead URL (events): ${leadUrl}`);
          break;
        case 'clients':
          // Não buscar dados de clients (Connect Rate)
          break;
        case 'conversions':
          // Conversions requires only sessions and leads data now
          sessionUrl = `${API_BASE_URL}/session/?${new URLSearchParams(sessionParams)}`;
          // Agora busca em /events com formato específico
          const convLeadsSearchParams = new URLSearchParams();
          // Adicionar apenas parâmetros não vazios
          for (const [key, value] of Object.entries(leadParams)) {
            if (value) convLeadsSearchParams.append(key, value);
          }
          leadUrl = `${API_ENDPOINTS.EVENTS}/?${convLeadsSearchParams.toString()}`;
          console.log(`Conversion Lead URL (events): ${leadUrl}`);
          break;
      }
    } else {
      // If no specific card, we need data except clients
      sessionUrl = `${API_BASE_URL}/session/?${new URLSearchParams(sessionParams)}`;
      // Agora busca em /events com formato específico
      const allLeadsSearchParams = new URLSearchParams();
      // Adicionar apenas parâmetros não vazios
      for (const [key, value] of Object.entries(leadParams)) {
        if (value) allLeadsSearchParams.append(key, value);
      }
      leadUrl = `${API_ENDPOINTS.EVENTS}/?${allLeadsSearchParams.toString()}`;
      console.log(`All Lead URL (events): ${leadUrl}`);
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
      console.error('Error fetching dashboard data:', error);
      return NextResponse.json({ 
        data: [],
        errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { 
        status: 500 
      });
    }
  } catch (error) {
    console.error('Error in dashboard data route:', error);
    return NextResponse.json({ 
      data: [],
      errors: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { 
      status: 500 
    });
  }
}

/**
 * Helper function to fetch data from an API endpoint with timeout
 */
async function fetchApiData(url: string, type: string): Promise<DashboardDataItem[]> {
  try {
    // Criar um controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    console.log(`Fetching data from: ${url} for type: ${type}`);

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Error fetching ${type} data: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    // Verifica se estamos lidando com dados da API de eventos (para leads)
    if (url.includes(API_ENDPOINTS.EVENTS) && type === 'leads') {
      console.log(`Processing events data as leads. Data structure:`, typeof data, Array.isArray(data) ? 'array' : 'not-array', data.events ? 'has events property' : 'no events property');
      
      // Se for um array, extrair e converter eventos para o formato de leads
      if (data && Array.isArray(data)) {
        console.log(`Data is an array with ${data.length} events`);
        return data.map(event => {
          // Extrair data e converter para timezone do Brasil
          const eventDate = event.created_at || event.date;
          const brazilianDate = toBrazilianTimezone(eventDate).split('T')[0]; // Pegar apenas a parte da data
          
          return {
            date: brazilianDate,
            count: 1,
            type: 'leads'
          };
        });
      } 
      // Se for objeto com formato de períodos
      else if (data && typeof data === 'object' && data.periods) {
        console.log(`Data has periods property with ${Object.keys(data.periods).length} periods`);
        const entries = Object.entries(data.periods);
        
        return entries.map(([date, count]) => ({
          date,
          count: Number(count) || 0, // Garante que seja number
          type: 'leads'
        }));
      }
      // Se for objeto com propriedade events contendo um array
      else if (data && typeof data === 'object' && Array.isArray(data.events)) {
        console.log(`Data has events array with ${data.events.length} events`);
        // Agrupar eventos por data
        const eventsByDate: Record<string, number> = data.events.reduce((acc: Record<string, number>, event: any) => {
          // Extrair a data e convertê-la para timezone do Brasil
          const eventDate = event.created_at || event.date;
          const brazilianDate = toBrazilianTimezone(eventDate).split('T')[0]; // Pegar apenas a parte da data
          
          acc[brazilianDate] = (acc[brazilianDate] || 0) + 1;
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
        console.log(`Processing data as general object`);
        try {
          // Tenta extrair eventos
          const events = data.data || data.events || data.items || [];
          
          if (Array.isArray(events) && events.length > 0) {
            console.log(`Found ${events.length} events in data`);
            // Agrupar eventos por data
            const eventsByDate: Record<string, number> = events.reduce((acc: Record<string, number>, event: any) => {
              // Extrair a data do evento com fallbacks para vários formatos possíveis
              const eventDate = event.created_at || event.date || event.timestamp || new Date().toISOString();
              const brazilianDate = toBrazilianTimezone(eventDate).split('T')[0]; // Pegar apenas a parte da data
              
              acc[brazilianDate] = (acc[brazilianDate] || 0) + 1;
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
          console.error('Error processing events data:', e);
        }
      }
      
      console.warn('Could not process events data in any known format');
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
      console.error(`Timeout fetching ${type} data from ${url}`);
    } else {
      console.error(`Error fetching ${type} data:`, error);
    }
    return [];
  }
} 