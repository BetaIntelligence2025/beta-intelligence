import { NextRequest, NextResponse } from 'next/server';
import { format, parse, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';
import { ptBR } from 'date-fns/locale';

// Fuso horário de Brasília
const TIMEZONE = 'America/Sao_Paulo';

interface DateRange {
  from: string;
  to: string;
}

// Add cache control for better performance
export const revalidate = 60; // Cache for 60 seconds

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { data, timeFrame, dateRange } = await request.json();
    
    // Early return if no data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    // Create a unique cache key based on the request parameters
    const cacheKey = `dashboard-${timeFrame}-${JSON.stringify(dateRange)}-${data.length}`;
    
    // Create response with cache headers
    return new Response(
      // Use a Stream to improve initial load time
      new ReadableStream({
        async start(controller) {
          try {
            // Process data in the stream
            const processedData = await processDataWithTimeFrame(data, timeFrame, dateRange);
            
            // Send data as a JSON string
            controller.enqueue(new TextEncoder().encode(JSON.stringify(processedData)));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60, stale-while-revalidate=600',
        }
      }
    );
  } catch (error) {
    console.error('Error processing chart data:', error);
    return NextResponse.json({ 
      error: `Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Função auxiliar para converter UTC para fuso horário de Brasília
function toLocalTime(date: Date | string): Date {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(parsedDate, TIMEZONE);
}

// Separate data processing logic for better organization
async function processDataWithTimeFrame(
  data: DashboardDataItem[], 
  timeFrame: TimeFrame,
  dateRange: DateRange | null
) {
  // Extract from and to dates from dateRange if available
  let fromDate: string | null = null;
  let toDate: string | null = null;
  
  if (dateRange && dateRange.from) {
    // Converter para fuso de Brasília e extrair apenas a data
    const localFrom = toLocalTime(dateRange.from);
    fromDate = format(localFrom, 'yyyy-MM-dd');
  }
  
  if (dateRange && dateRange.to) {
    // Converter para fuso de Brasília e extrair apenas a data
    const localTo = toLocalTime(dateRange.to);
    toDate = format(localTo, 'yyyy-MM-dd');
  }
  
  // Group data by date and type
  const groupedByDate: Record<string, any> = {};
  
  // Log all unique dates being processed for debugging
  const uniqueDates = Array.from(new Set(data.map((item: DashboardDataItem) => {
    // Converter cada data para o fuso de Brasília
    const localDate = toLocalTime(item.date);
    return format(localDate, 'yyyy-MM-dd');
  })));
  console.log(`Processing ${uniqueDates.length} unique dates in data`);
  
  // Group by date and initialize all counts to 0
  data.forEach((item: DashboardDataItem) => {
    // Convert to local timezone and extract just the date part (YYYY-MM-DD)
    const localDate = toLocalTime(item.date);
    const datePart = format(localDate, 'yyyy-MM-dd');
    
    // If we don't have this date yet, initialize all counts to 0
    if (!groupedByDate[datePart]) {
      groupedByDate[datePart] = {
        period: datePart,
        leads: 0,
        clients: 0,
        sessions: 0,
        conversions: 0
      };
    }
    
    // Add the count to the appropriate type
    switch (item.type) {
      case 'leads':
        groupedByDate[datePart].leads += item.count;
        break;
      case 'clients':
        groupedByDate[datePart].clients += item.count;
        break;
      case 'sessions':
        groupedByDate[datePart].sessions += item.count;
        break;
      case 'conversions':
        groupedByDate[datePart].conversions += item.count;
        break;
    }
  });
  
  // Fill in missing dates if we have enough data
  if (Object.keys(groupedByDate).length > 0) {
    try {
      // Get all dates from the data and sort them
      const dates = Object.keys(groupedByDate).map(date => new Date(date));
      dates.sort((a, b) => a.getTime() - b.getTime());
      
      // If we have at least two dates, we can fill in the gaps
      if (dates.length >= 2) {
        // If we have date range boundaries, use them instead of min/max from data
        let startDate = dates[0];
        let endDate = dates[dates.length - 1];
        
        if (fromDate) {
          const fromDateObj = new Date(fromDate);
          if (fromDateObj > startDate) {
            startDate = fromDateObj;
          }
        }
        
        if (toDate) {
          const toDateObj = new Date(toDate);
          if (toDateObj < endDate) {
            endDate = toDateObj;
          }
        }
        
        console.log(`Filling dates from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
        
        // Create dates for each day in the range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          // If this date doesn't exist in our data, add it with zeros
          if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = {
              period: dateStr,
              leads: 0,
              clients: 0,
              sessions: 0,
              conversions: 0
            };
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    } catch (error) {
      console.error('Error filling dates:', error);
    }
  }
  
  // Convert to array and ensure we only include dates within the range
  let processedData = Object.values(groupedByDate);
  
  // Apply final filter to ensure only dates within range are included
  if (fromDate && toDate) {
    processedData = processedData.filter(item => {
      const itemDate = item.period.split('T')[0];
      return itemDate >= fromDate && itemDate <= toDate;
    });
  }
  
  // Sort by date to ensure correct order
  processedData.sort((a, b) => {
    const dateA = new Date(a.period);
    const dateB = new Date(b.period);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Para visualizações não diárias, precisamos agrupar os dados
  if (timeFrame !== "Daily") {
    const groupedData: Record<string, any> = {};
    
    processedData.forEach(item => {
      const dateObj = parseISO(item.period);
      let groupKey = '';
      
      // Definir a chave de agrupamento com base no timeFrame
      switch (timeFrame) {
        case "Weekly":
          // Agrupar por semana: obter o início da semana (segunda-feira)
          const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
          groupKey = format(weekStart, 'yyyy-MM-dd');
          break;
        case "Monthly":
          // Agrupar por mês: formato yyyy-MM
          groupKey = format(dateObj, 'yyyy-MM');
          break;
        case "Yearly":
          // Agrupar por ano: formato yyyy
          groupKey = format(dateObj, 'yyyy');
          break;
      }
      
      // Inicializar o grupo se não existir
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          period: groupKey,
          leads: 0,
          clients: 0,
          sessions: 0,
          conversions: 0,
          // Armazenar datas para formatação posterior
          startDate: dateObj,
          endDate: dateObj,
          count: 0
        };
      }
      
      // Atualizar a data de início/fim se necessário
      if (dateObj < groupedData[groupKey].startDate) {
        groupedData[groupKey].startDate = dateObj;
      }
      if (dateObj > groupedData[groupKey].endDate) {
        groupedData[groupKey].endDate = dateObj;
      }
      
      // Somar os valores para cada tipo
      groupedData[groupKey].leads += item.leads;
      groupedData[groupKey].clients += item.clients;
      groupedData[groupKey].sessions += item.sessions;
      groupedData[groupKey].conversions += item.conversions;
      groupedData[groupKey].count += 1;
    });
    
    // Converter back para array para processamento posterior
    processedData = Object.values(groupedData);
  }
  
  // Apply date formatting based on timeframe
  processedData = processedData.map(item => {
    // Formato original se não conseguirmos processar
    let formattedPeriod = item.period;
    
    try {
      switch (timeFrame) {
        case "Daily":
          const dateObj = parseISO(item.period);
          formattedPeriod = format(dateObj, 'dd/MM/yyyy');
          break;
        case "Weekly":
          // Para semanal, usar a data de início/fim da semana
          if (item.startDate && item.endDate) {
            const weekStart = startOfWeek(item.startDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(item.startDate, { weekStartsOn: 1 });
            formattedPeriod = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;
          } else {
            // Fallback: criar datas a partir do período
            const dateObj = parseISO(item.period);
            const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 });
            formattedPeriod = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;
          }
          break;
        case "Monthly":
          // Para mensal, formatar como mês/ano em português
          if (item.startDate) {
            formattedPeriod = format(item.startDate, 'MMM yyyy', { locale: ptBR });
            // Capitalize first letter
            formattedPeriod = formattedPeriod.charAt(0).toUpperCase() + formattedPeriod.slice(1);
          } else {
            // Fallback: extrair ano e mês da chave
            const [year, month] = item.period.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
            formattedPeriod = format(dateObj, 'MMM yyyy', { locale: ptBR });
            formattedPeriod = formattedPeriod.charAt(0).toUpperCase() + formattedPeriod.slice(1);
          }
          break;
        case "Yearly":
          // Para anual, apenas o ano
          if (item.startDate) {
            formattedPeriod = format(item.startDate, 'yyyy');
          } else {
            formattedPeriod = item.period.substring(0, 4); // Extrair o ano
          }
          break;
      }
    } catch (e) {
      console.error('Error formatting period:', e);
      // Manter o período original em caso de erro
    }
    
    // Remove propriedades temporárias usadas para agrupamento
    const { startDate, endDate, count, ...cleanedItem } = item;
    
    return {
      ...cleanedItem,
      period: formattedPeriod
    };
  });
  
  // Reordenar após a formatação
  processedData.sort((a, b) => {
    try {
      // For daily, we can parse dd/MM/yyyy
      if (timeFrame === "Daily") {
        const dateA = parse(a.period, 'dd/MM/yyyy', new Date());
        const dateB = parse(b.period, 'dd/MM/yyyy', new Date());
        return dateA.getTime() - dateB.getTime();
      }
      // For weekly, we'll use the first date in the range
      else if (timeFrame === "Weekly") {
        const startDateA = a.period.split(' - ')[0];
        const startDateB = b.period.split(' - ')[0];
        const dateA = parse(startDateA, 'dd/MM', new Date());
        const dateB = parse(startDateB, 'dd/MM', new Date());
        
        // Adicionar ano atual se não estiver no formato
        if (isNaN(dateA.getTime())) {
          const currentYear = new Date().getFullYear();
          const [day, month] = startDateA.split('/');
          const fixedDateA = new Date(currentYear, parseInt(month) - 1, parseInt(day));
          const [dayB, monthB] = startDateB.split('/');
          const fixedDateB = new Date(currentYear, parseInt(monthB) - 1, parseInt(dayB));
          return fixedDateA.getTime() - fixedDateB.getTime();
        }
        
        return dateA.getTime() - dateB.getTime();
      }
      // For monthly, we'll parse MMM yyyy with Portuguese locale
      else if (timeFrame === "Monthly") {
        const dateA = parse(a.period, 'MMM yyyy', new Date(), { locale: ptBR });
        const dateB = parse(b.period, 'MMM yyyy', new Date(), { locale: ptBR });
        return dateA.getTime() - dateB.getTime();
      }
      // For yearly, just compare years as numbers
      else {
        return parseInt(a.period) - parseInt(b.period);
      }
    } catch (e) {
      console.error('Error sorting periods:', e);
      // Fallback para string comparison
      return a.period.localeCompare(b.period);
    }
  });
  
  console.log(`Returning ${processedData.length} processed data points`);
  
  return processedData;
} 