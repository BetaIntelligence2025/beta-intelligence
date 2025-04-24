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
          {isHourlyData && (
            <div className="text-xs text-gray-500 ml-8 mb-2">
              Visualização por hora (dados de um único dia)
            </div>
          )}
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
    
    // Dados já processados, apenas formatar para o gráfico
    const graphData: {
      period: string;
      date: string;
      sessions: number;
      leads: number;
      conversions: number;
    }[] = [];
    
    // Verificar se é um único dia com dados por hora disponíveis
    if (data.hourly_data && 
        data.period_counts && 
        Object.keys(data.period_counts).length === 1 && 
        data.hourly_data.sessions_by_hour) {
      
      console.log('Processando visualização por hora para um único dia');
      
      // Converter dados por hora em formato para o gráfico
      return Object.entries(data.hourly_data.sessions_by_hour)
        .map(([hour, sessionsCount]) => {
          // Formatar hora para display (00 a 23)
          const hourDisplay = `${hour}h`;
          
          return {
            period: hourDisplay,
            date: hour, // Guardar a hora original como referência
            // Acessar dados por hora diretamente
            sessions: Number(sessionsCount) || 0,
            leads: Number(data.hourly_data?.leads_by_hour?.[hour]) || 0,
            conversions: Number(data.hourly_data?.conversion_rate_by_hour?.[hour]) || 0
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date)); // Ordenar por hora
    }
    
    // Caso padrão: usar period_counts para dias/semanas/meses
    if (data.period_counts && typeof data.period_counts === 'object') {
      return Object.entries(data.period_counts)
        .map(([date, sessionsCount]) => {
          const parts = date.split('-');
          const formattedPeriod = currentTimeFrame === 'Daily' ? 
            `${parts[2]}/${parts[1]}` : 
            (currentTimeFrame === 'Monthly' ? 
              `${parts[1]}/${parts[0]}` : date);
          
          return {
            period: formattedPeriod,
            date,
            // Acesso direto aos dados sem validações complexas
            sessions: Number(sessionsCount) || 0,
            leads: Number(data.leads_by_day?.[date]) || 0,
            conversions: Number(data.conversion_rate_by_day?.[date]) || 0
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    
    // Log de erro para ajudar na depuração
    console.error('Formato de dados inválido para o gráfico:', data);
    
    // Fallback: retornar array vazio quando não há dados válidos
    return [];
  }, []);
  
  // Memorize chart data
  const chartData = useMemo(() => {
    if (!dashboardData?.raw) return [];
    return processChartData(dashboardData.raw, timeFrame);
  }, [dashboardData?.raw, timeFrame, processChartData]);
  
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
              {isSingleDayView && (
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  (visualização por hora disponível)
                </span>
              )}
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