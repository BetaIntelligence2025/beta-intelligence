"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DateRange } from "./date-filter-button";
import { CardType } from "@/components/dashboard/summary-cards";
import { format } from "date-fns";
import { DashboardDataItem, TimeFrame, DashboardState } from "./types";

// Chart configuration
const chartConfig = {
  leads: {
    label: "Leads",
    color: "#1F2937"
  },
  sessions: {
    label: "Sessões",
    color: "#6B7280"
  },
  conversions: {
    label: "Conversão da Captação",
    color: "#9CA3AF"
  },
  // Cores para período anterior (mais claras)
  previous_leads: {
    label: "Leads (Período Anterior)",
    color: "#6B7280"
  },
  previous_sessions: {
    label: "Sessões (Período Anterior)", 
    color: "#9CA3AF"
  },
  previous_conversions: {
    label: "Conversão (Período Anterior)",
    color: "#D1D5DB"
  }
} satisfies ChartConfig;

interface VisualizationByPeriodProps {
  title?: string;
  dateRange?: DateRange;
  selectedCard?: CardType;
  dashboardData?: DashboardState;
}

// Memoize the chart to prevent unnecessary re-renders
const MemoizedChart = memo(function Chart({
  data,
  timeFrame,
  visibleDataKeys
}: {
  data: any[];
  timeFrame: TimeFrame;
  visibleDataKeys: string[];
}) {
  // Verificar se estamos exibindo dados por hora (baseado no formato do período)
  const isHourlyData = data.length > 0 && data[0].period.endsWith('h');

  return (
        <>
          <ChartContainer className="w-full lg:h-96" config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={data}
              margin={{
                left: 20,
                right: 20
              }}>
              <CartesianGrid vertical={false} />
              <XAxis
                  dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                  tickFormatter={(value) => {
                    // Se for dados por hora, manter o formato "XXh"
                    if (value.endsWith('h')) {
                      return value;
                    }
                    
                    // Para exibição diária, mostrar o dia e mês para maior clareza
                    if (timeFrame === "Daily") {
                      // Extrair dia e mês do formato dd/MM/yyyy
                      const parts = value.split('/');
                      return `${parts[0]}/${parts[1]}`; // Show as dd/MM instead of just dd
                    }
                    return value;
                  }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={35}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip 
                cursor={false} 
                content={
                  <ChartTooltipContent 
                    labelFormatter={(label) => {
                      // Se for dados por hora, mostrar "Hora: XXh"
                      if (isHourlyData) {
                        return `Hora: ${label}`;
                      }
                      return label;
                    }}
                  />
                } 
              />
                {visibleDataKeys.includes('sessions') && (
                  <Line 
                    dataKey="sessions" 
                    type="monotone" 
                    stroke={chartConfig.sessions.color}
                    strokeWidth={2}
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}
                
                {visibleDataKeys.includes('leads') && (
                  <Line 
                    dataKey="leads" 
                    type="monotone" 
                    stroke={chartConfig.leads.color}
                    strokeWidth={2} 
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}
                
                {visibleDataKeys.includes('conversions') && (
                  <Line 
                    dataKey="conversions" 
                    type="monotone" 
                    stroke={chartConfig.conversions.color}
                    strokeWidth={2}
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}

                {/* Linhas do período anterior - só aparecem quando um card específico está selecionado */}
                {visibleDataKeys.includes('sessions') && data.some((item: any) => item.previous_sessions !== undefined) && (
                  <Line 
                    dataKey="previous_sessions" 
                    type="monotone" 
                    stroke={chartConfig.previous_sessions.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}
                
                {visibleDataKeys.includes('leads') && data.some((item: any) => item.previous_leads !== undefined) && (
                  <Line 
                    dataKey="previous_leads" 
                    type="monotone" 
                    stroke={chartConfig.previous_leads.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}
                
                {visibleDataKeys.includes('conversions') && data.some((item: any) => item.previous_conversions !== undefined) && (
                  <Line 
                    dataKey="previous_conversions" 
                    type="monotone" 
                    stroke={chartConfig.previous_conversions.color}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ strokeWidth: 2, r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                )}
            </LineChart>
          </ChartContainer>
        </>
  );
});

// Export the main component with performance optimizations
export default function VisualizationByPeriod(props: VisualizationByPeriodProps) {
  const { 
    title = "Visualização por Período", 
    dateRange, 
    selectedCard,
    dashboardData
  } = props;
  
  // Get timeFrame from URL search params if available, otherwise default to "Daily"
  const [searchParams] = useState(() => new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  ));
  const defaultTimeFrame = searchParams.get('timeFrame') as TimeFrame || "Daily";
  
  // Initialize with value from URL params
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(defaultTimeFrame);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Explicitly set isMounted to true on initialization
  const isMounted = useRef(true);
  
  useEffect(() => {
    // Ensure it's set to true at the start
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Helper function to format dates for API consistently
  const formatDateForApi = useCallback((date: Date, isEndDate = false): string => {
    // Get the date in Brazil timezone (UTC-3)
    const brazilDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    // Extract date parts
    const year = brazilDate.getFullYear();
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
    const day = String(brazilDate.getDate()).padStart(2, '0');
    
    // Return in the format YYYY-MM-DDT00:00:00-03:00 or YYYY-MM-DDT23:59:59-03:00 for end dates
    const timeComponent = isEndDate ? 'T23:59:59-03:00' : 'T00:00:00-03:00';
    
    const formattedDate = `${year}-${month}-${day}${timeComponent}`;
    
    return formattedDate;
  }, []);
  
  // Memoize the date range para período padrão com valores atualizados
  const defaultDateRange = useMemo(() => {
    // Em ambiente de desenvolvimento e produção, usar data de hoje no horário de Brasília
    const today = new Date();
    // Converter para horário de Brasília
    const todayBrazil = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    // Para a data início, usar hoje às 00:00:00
    const startDate = new Date(todayBrazil);
    startDate.setHours(0, 0, 0, 0);
    
    // Para a data fim, usar hoje às 23:59:59
    const endDate = new Date(todayBrazil);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      from: formatDateForApi(startDate),
      to: formatDateForApi(endDate, true)
    };
  }, [formatDateForApi]);
  
  // Use the user-provided date range if available, otherwise use default range
  const effectiveDateRange = useMemo(() => {
    if (!dateRange) {
      console.log('No date range provided, using default date range:', defaultDateRange);
      return defaultDateRange;
    }
    
    const from = dateRange.from ? formatDateForApi(dateRange.from) : defaultDateRange.from;
    const to = dateRange.to ? formatDateForApi(dateRange.to, true) : defaultDateRange.to;
    
    return { from, to };
  }, [dateRange, defaultDateRange, formatDateForApi]);
  
  // Filter which lines to show based on selectedCard
  const visibleDataKeys = useMemo(() => {
    if (!selectedCard) {
      return ['sessions', 'leads', 'conversions'];
    }
    
    // Map from singular to plural if needed
    const singularToPlural: Record<string, string> = {
      'session': 'sessions',
      'lead': 'leads',
      'conversion': 'conversions'
    };
    
    // Handle both singular and plural forms in selectedCard
    const cardType = selectedCard.endsWith('s') ? selectedCard : singularToPlural[selectedCard] || selectedCard;
    return [cardType];
  }, [selectedCard]);
  
  // Process chart data from dashboard data
  const processChartData = useCallback((data: any, currentTimeFrame: TimeFrame) => {
    if (!data) return [];
    
    // Obter as datas do filtro aplicado para filtrar os dados adequadamente
    const filterFromDate = data.filters?.from;
    const filterToDate = data.filters?.to;
    
    // Verificar se é um único dia com dados por hora disponíveis
    if (data.hourly_data && 
        data.hourly_data.sessions_by_hour && 
        Object.keys(data.hourly_data.sessions_by_hour).length > 0) {
      
      // Converter dados por hora em formato para o gráfico
      const currentHourlyData = Object.entries(data.hourly_data.sessions_by_hour)
        .map(([hour, sessionsCount]) => {
          // Formatar hora para display (00 a 23)
          const hourDisplay = `${hour.padStart(2, '0')}h`;
          
          // Garantir que os valores de leads e conversões estejam disponíveis
          const leadsCount = Number(data.hourly_data?.leads_by_hour?.[hour]) || 0;
          const conversionRate = Number(data.hourly_data?.conversion_rate_by_hour?.[hour]) || 0;
          
          const result: any = {
            period: hourDisplay,
            date: hour, // Guardar a hora original como referência
            sessions: Number(sessionsCount) || 0,
            leads: leadsCount,
            conversions: conversionRate
          };

          // Adicionar dados do período anterior se disponível e um card específico estiver selecionado
          if (data.previous_period_data?.hourly_data && selectedCard) {
            result.previous_sessions = Number(data.previous_period_data.hourly_data.sessions_by_hour?.[hour]) || 0;
            result.previous_leads = Number(data.previous_period_data.hourly_data.leads_by_hour?.[hour]) || 0;
            result.previous_conversions = Number(data.previous_period_data.hourly_data.conversion_rate_by_hour?.[hour]) || 0;
          }

          return result;
        })
        .sort((a, b) => a.date.localeCompare(b.date)); // Ordenar por hora
        
      return currentHourlyData;
    }
    
    // Caso para múltiplos períodos (dias/semanas/meses)
    if (data.sessions_by_day && typeof data.sessions_by_day === 'object') {
      const entries = Object.entries(data.sessions_by_day);
      
      // Filtrar apenas as datas que estão dentro do range solicitado
      const filteredEntries = entries.filter(([date]) => {
        // Se não temos filtros da API, incluir todas as datas
        if (!filterFromDate || !filterToDate) return true;
        
        // Verificar se a data está dentro do range
        return date >= filterFromDate && date <= filterToDate;
      });
      
      const processedData = filteredEntries.map(([date, sessionsCount]) => {
          const parts = date.split('-');
          const formattedPeriod = currentTimeFrame === 'Daily' ? 
            `${parts[2]}/${parts[1]}/${parts[0]}` : 
            (currentTimeFrame === 'Monthly' ? 
              `${parts[1]}/${parts[0]}` : date);
          
          const result: any = {
            period: formattedPeriod,
            date,
            sessions: Number(sessionsCount) || 0,
            leads: Number(data.leads_by_day?.[date]) || 0,
            conversions: Number(data.conversion_rate_by_day?.[date]) || 0
          };

          // Adicionar dados do período anterior se disponível e um card específico estiver selecionado
          if (data.previous_period_data && selectedCard) {
            // Para dados diários, mapear as datas corretamente
            if (filterFromDate && filterToDate) {
              const fromDate = new Date(filterFromDate);
              const toDate = new Date(filterToDate);
              const currentDate = new Date(date);
              
              // Calcular o índice do dia atual no período (0-indexed)
              const dayIndex = Math.floor((currentDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Obter as datas do período anterior ordenadas
              const previousDates = Object.keys(data.previous_period_data.sessions_by_day).sort();
              
              // Mapear para o dia correspondente no período anterior
              if (dayIndex >= 0 && dayIndex < previousDates.length) {
                const correspondingPreviousDate = previousDates[dayIndex];
                
                console.log(`Mapeamento: ${date} (índice ${dayIndex}) -> ${correspondingPreviousDate}`);
                
                result.previous_sessions = Number(data.previous_period_data.sessions_by_day?.[correspondingPreviousDate]) || 0;
                result.previous_leads = Number(data.previous_period_data.leads_by_day?.[correspondingPreviousDate]) || 0;
                result.previous_conversions = Number(data.previous_period_data.conversion_rate_by_day?.[correspondingPreviousDate]) || 0;
              }
            }
          }

          return result;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Remover o último ponto de dados se ele for igual à data final do filtro E tiver todos os valores zerados
      if (processedData.length > 0 && filterToDate) {
        const lastPoint = processedData[processedData.length - 1];
        if (lastPoint.date === filterToDate && 
            lastPoint.sessions === 0 && 
            lastPoint.leads === 0) {
          processedData.pop();
        }
      }
      
      return processedData;
    }
    
    // Verificar se estamos usando o formato antigo com period_counts
    if (data.period_counts && typeof data.period_counts === 'object') {
      const entries = Object.entries(data.period_counts);
      
      // Filtrar apenas as datas que estão dentro do range solicitado
      const filteredEntries = entries.filter(([date]) => {
        // Se não temos filtros da API, incluir todas as datas
        if (!filterFromDate || !filterToDate) return true;
        
        // Verificar se a data está dentro do range
        return date >= filterFromDate && date <= filterToDate;
      });
      
      const processedData = filteredEntries.map(([date, sessionsCount]) => {
          const parts = date.split('-');
          const formattedPeriod = currentTimeFrame === 'Daily' ? 
            `${parts[2]}/${parts[1]}/${parts[0]}` : 
            (currentTimeFrame === 'Monthly' ? 
              `${parts[1]}/${parts[0]}` : date);
          
          const result: any = {
            period: formattedPeriod,
            date,
            sessions: Number(sessionsCount) || 0,
            leads: Number(data.leads_by_day?.[date]) || 0,
            conversions: Number(data.conversion_rate_by_day?.[date]) || 0
          };

          // Adicionar dados do período anterior se disponível e um card específico estiver selecionado
          if (data.previous_period_data && selectedCard) {
            // Lógica similar para period_counts
            if (filterFromDate && filterToDate) {
              const fromDate = new Date(filterFromDate);
              const toDate = new Date(filterToDate);
              const currentDate = new Date(date);
              
              // Calcular o índice do dia atual no período (0-indexed)
              const dayIndex = Math.floor((currentDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Obter as datas do período anterior ordenadas
              const previousDates = Object.keys(data.previous_period_data.sessions_by_day).sort();
              
              // Mapear para o dia correspondente no período anterior
              if (dayIndex >= 0 && dayIndex < previousDates.length) {
                const correspondingPreviousDate = previousDates[dayIndex];
                
                console.log(`Mapeamento: ${date} (índice ${dayIndex}) -> ${correspondingPreviousDate}`);
                
                result.previous_sessions = Number(data.previous_period_data.sessions_by_day?.[correspondingPreviousDate]) || 0;
                result.previous_leads = Number(data.previous_period_data.leads_by_day?.[correspondingPreviousDate]) || 0;
                result.previous_conversions = Number(data.previous_period_data.conversion_rate_by_day?.[correspondingPreviousDate]) || 0;
              }
            }
          }

          return result;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
        
      return processedData;
    }
    
    console.error('Formato de dados inválido para o gráfico:', data);
    return [];
  }, [selectedCard]);
  
  // Memorize chart data
  const chartData = useMemo(() => {
    if (!dashboardData?.raw) return [];
    return processChartData(dashboardData.raw, timeFrame);
  }, [dashboardData?.raw, timeFrame, processChartData, selectedCard]);
  
  // Determinar se estamos visualizando dados de um único dia
  const isSingleDayView = useMemo(() => {
    if (!dashboardData?.raw?.period_counts) return false;
    return Object.keys(dashboardData.raw.period_counts).length === 1;
  }, [dashboardData?.raw?.period_counts]);
  
  // Estados simplificados
  useEffect(() => {
    setIsLoading(!dashboardData || dashboardData.isLoading);
    setError(dashboardData?.errors || null);
  }, [dashboardData]);
  
  // Handler for timeframe changes without forcing full re-render
  function handleTimeFrameChange(value: string) {
    // Update local state
    setTimeFrame(value as TimeFrame);
    setError(null);
    
    // Update URL params to include the timeFrame
    const params = new URLSearchParams(window.location.search);
    params.set('timeFrame', value);
    
    // Use history.replaceState to update URL without page reload
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }
  
  // Create the appropriate display value for the selected timeframe
  const timeFrameDisplay = {
    "Daily": "Diário",
    "Weekly": "Semanal",
    "Monthly": "Mensal",
    "Yearly": "Anual"
  }[timeFrame];
  
  // Return the component without the key-based rerender
  return (
    <div>
      {isLoading ? (
        <Card className="col-span-4">
          <CardHeader className="relative">
            <CardTitle>{title}</CardTitle>
            <div className="absolute end-4 top-3">
              <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{timeFrameDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Diário</SelectItem>
                  <SelectItem value="Weekly">Semanal</SelectItem>
                  <SelectItem value="Monthly">Mensal</SelectItem>
                  <SelectItem value="Yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Carregando dados...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="col-span-4">
          <CardHeader className="relative">
            <CardTitle>{title}</CardTitle>
            <div className="absolute end-4 top-3">
              <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{timeFrameDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Diário</SelectItem>
                  <SelectItem value="Weekly">Semanal</SelectItem>
                  <SelectItem value="Monthly">Mensal</SelectItem>
                  <SelectItem value="Yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <p className="text-red-500 mb-2">Erro ao carregar dados</p>
                <p className="text-sm text-gray-500">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : chartData.length === 0 ? (
        <Card className="col-span-4">
          <CardHeader className="relative">
            <CardTitle>{title}</CardTitle>
            <div className="absolute end-4 top-3">
              <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{timeFrameDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Diário</SelectItem>
                  <SelectItem value="Weekly">Semanal</SelectItem>
                  <SelectItem value="Monthly">Mensal</SelectItem>
                  <SelectItem value="Yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-96">
              <p className="text-gray-500">Nenhum dado disponível para o período selecionado</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="col-span-4">
          <CardHeader className="relative">
            <CardTitle>
              {title}
            </CardTitle>
            <div className="absolute end-4 top-3">
              <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>{timeFrameDisplay}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Diário</SelectItem>
                  <SelectItem value="Weekly">Semanal</SelectItem>
                  <SelectItem value="Monthly">Mensal</SelectItem>
                  <SelectItem value="Yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <MemoizedChart 
              data={chartData} 
              timeFrame={timeFrame}
              visibleDataKeys={visibleDataKeys}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 