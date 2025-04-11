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
import { DashboardDataItem, TimeFrame } from "./types";

// Chart configuration
const chartConfig = {
  leads: {
    label: "Leads",
    color: "#1F2937"
  },
  clients: {
    label: "Clientes",
    color: "#4B5563"
  },
  sessions: {
    label: "Sessões",
    color: "#6B7280"
  },
  conversions: {
    label: "Conversões",
    color: "#9CA3AF"
  }
} satisfies ChartConfig;

interface VisualizationByPeriodProps {
  title?: string;
  dateRange?: DateRange;
  selectedCard?: CardType;
  dashboardData?: {
    data: DashboardDataItem[];
    isLoading: boolean;
    errors?: string;
  };
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
  return (
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              
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
              
              {visibleDataKeys.includes('clients') && (
                <Line 
                  dataKey="clients" 
                  type="monotone" 
                  stroke={chartConfig.clients.color}
                  strokeWidth={2}
                  connectNulls={true}
                  dot={{ strokeWidth: 2, r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
              
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
  
  // Remove the key-based render forcing that was causing issues
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Daily");
  const [isLoading, setIsLoading] = useState(true);
  const [periodData, setPeriodData] = useState<DashboardDataItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
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
    
    console.log('Using effective date range:', { from, to });
    console.log('Original date objects:', {
      from: dateRange.from ? dateRange.from.toISOString() : null,
      to: dateRange.to ? dateRange.to.toISOString() : null
    });
    
    return { from, to };
  }, [dateRange, defaultDateRange, formatDateForApi]);
  
  // Filter which lines to show based on selectedCard
  const visibleDataKeys = useMemo(() => {
    // Quando não há card selecionado, exibir todos os tipos
    if (!selectedCard) {
      return ['leads', 'clients', 'sessions', 'conversions'];
    }
    
    // Map from singular to plural if needed
    const singularToPlural: Record<string, string> = {
      'lead': 'leads',
      'client': 'clients',
      'session': 'sessions',
      'conversion': 'conversions'
    };
    
    // Handle both singular and plural forms in selectedCard
    const cardType = selectedCard.endsWith('s') ? selectedCard : singularToPlural[selectedCard] || selectedCard;
    return [cardType];
  }, [selectedCard]);
  
  // Handler for timeframe changes without forcing full re-render
  function handleTimeFrameChange(value: string) {
    setTimeFrame(value as TimeFrame);
    setError(null);
  }
  
  // First effect to handle dashboardData updates
  useEffect(() => {
    if (!dashboardData) return;
    
    // Update period data when dashboardData changes
    if (dashboardData.isLoading) {
      setIsLoading(true);
    } else {
      setPeriodData(dashboardData.data || []);
      if (dashboardData.errors) {
        setError(dashboardData.errors);
      }
    }
  }, [dashboardData]);
  
  // Separate effect to process data when periodData or timeFrame changes
  useEffect(() => {
    if (!periodData || periodData.length === 0) {
      setChartData([]);
      setIsLoading(false);
      return;
    }
    
    let isCancelled = false;
    setIsLoading(true);
    
    async function processChartData() {
      try {
        console.log('Processing chart data with timeframe:', timeFrame);
        
        const response = await fetch('/api/dashboard/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: periodData,
            timeFrame,
            dateRange: dateRange && dateRange.from && dateRange.to 
              ? { 
                  from: dateRange.from.toISOString(), 
                  to: dateRange.to.toISOString() 
                } 
              : null
          })
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const processedData = await response.json();
        
        if (!isCancelled && isMounted.current) {
          console.log('Setting chart data:', processedData.length, 'items');
          setChartData(processedData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error processing chart data:', error);
        if (!isCancelled && isMounted.current) {
          setError(error instanceof Error ? error.message : 'Error processing data');
          setIsLoading(false);
        }
      }
    }
    
    processChartData();
    
    return () => {
      isCancelled = true;
    };
  }, [periodData, timeFrame, dateRange]);
  
  // Only fetch data directly if dashboardData is not provided
  useEffect(() => {
    if (dashboardData) return; // Skip if dashboardData is provided
    
    let isCancelled = false;
    setIsLoading(true);
    
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('from', dateRange.from.toISOString());
        if (dateRange?.to) params.append('to', dateRange.to.toISOString());
        if (selectedCard) params.append('cardType', selectedCard);
        
        const response = await fetch(`/api/dashboard/data?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!isCancelled && isMounted.current) {
          setPeriodData(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!isCancelled && isMounted.current) {
          setError(error instanceof Error ? error.message : 'Error fetching data');
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isCancelled = true;
    };
  }, [dateRange, selectedCard, dashboardData]);
  
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