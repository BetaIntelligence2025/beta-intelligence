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
    label: "Connect Rate",
    color: "#4B5563"
  },
  sessions: {
    label: "Sessões",
    color: "#6B7280"
  },
  conversions: {
    label: "Taxa de Conversão",
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
  );
});

// Export the main component with performance optimizations
export default function VisualizationByPeriod(props: VisualizationByPeriodProps) {
  const { 
    title = "Dados", 
    dateRange, 
    selectedCard,
    dashboardData
  } = props;
  
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Daily");
  const [isLoading, setIsLoading] = useState(true);
  const [periodData, setPeriodData] = useState<DashboardDataItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if component is mounted to prevent updates on unmounted component
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Helper function to format dates for API consistently
  const formatDateForApi = useCallback((date: Date, isEndDate = false): string => {
    // Get the date in local timezone to avoid UTC conversion issues
    const localDate = new Date(date);
    
    // Extract date parts
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    
    // Return in the format YYYY-MM-DDT00:00:00Z or YYYY-MM-DDT23:59:59Z for end dates
    const timeComponent = isEndDate ? 'T23:59:59Z' : 'T00:00:00Z';
    
    const formattedDate = `${year}-${month}-${day}${timeComponent}`;
    
    return formattedDate;
  }, []);
  
  // Memoize the date range para período padrão de 26 de fevereiro até 27 de março
  const defaultDateRange = useMemo(() => {
    // Em ambiente de desenvolvimento, usar período fixo
    if (process.env.NODE_ENV === 'development') {
      const startDate = new Date('2025-02-26T00:00:00Z');
      const endDate = new Date('2025-03-27T23:59:59Z');
      
      // Calcular o número de dias
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        from: formatDateForApi(startDate),
        to: formatDateForApi(endDate, true)
      };
    } else {
      // Em produção, usar últimos 30 dias
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      
      return {
        from: formatDateForApi(startDate),
        to: formatDateForApi(today, true)
      };
    }
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
    // Quando não há card selecionado, exibir todos os tipos exceto clients
    if (!selectedCard) {
      return ['clients', 'sessions', 'leads', 'conversions'];
    }
    
    // Map from singular to plural if needed
    const singularToPlural: Record<string, string> = {
      'client': 'clients',
      'session': 'sessions',
      'lead': 'leads',
      'conversion': 'conversions'
    };
    
    // Handle both singular and plural forms in selectedCard
    const cardType = selectedCard.endsWith('s') ? selectedCard : singularToPlural[selectedCard] || selectedCard;
    return [cardType];
  }, [selectedCard]);
  
  // Memoize the time frame change handler
  const handleTimeFrameChange = useCallback((value: string) => {
    setTimeFrame(value as TimeFrame);
  }, []);
  
  // Process API data when periodData or timeFrame changes
  useEffect(() => {
    let isCancelled = false;
    
    async function processData() {
      if (!periodData.length) return;
      
      setIsLoading(true);
      try {
        // Use API endpoint to process chart data instead of server action
        const response = await fetch('/api/dashboard/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: periodData,
            timeFrame,
            dateRange: dateRange ? effectiveDateRange : null
          })
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const processedData = await response.json();
        
        if (!isCancelled && isMounted.current) {
          setChartData(processedData);
          setIsLoading(false);
        }
      } catch (error) {
        if (!isCancelled && isMounted.current) {
          console.error('Error processing chart data:', error);
          setError(error instanceof Error ? error.message : 'Error processing data');
          setIsLoading(false);
        }
      }
    }
    
    processData();
    
    return () => {
      isCancelled = true;
    };
  }, [periodData, timeFrame, dateRange, effectiveDateRange]);
  
  // Fetch data using API endpoint when dependencies change
  useEffect(() => {
    let isCancelled = false;
    
    async function fetchData() {
      if (!isMounted.current) return;
      
      // Se dashboardData está disponível, use-o em vez de fazer sua própria chamada
      if (dashboardData) {
        if (!isCancelled && isMounted.current) {
          // Se dashboardData está carregando, atualizar o estado para mostrar loading
          if (dashboardData.isLoading) {
            setIsLoading(true);
            return;
          }
          
          // Se dashboardData está disponível, use-o
          setPeriodData(dashboardData.data);
          setIsLoading(false);
          
          // Verificar se há erros
          if (dashboardData.errors) {
            setError(dashboardData.errors);
          }
        }
        return;
      }
      
      // Fallback para buscar dados diretamente se dashboardData não estiver disponível
      setIsLoading(true);
      setError(null);
      
      try {
        // Convert selectedCard to string | undefined to match parameter type
        const cardTypeParam = selectedCard === null ? undefined : selectedCard;
        
        // Build the URL with query parameters
        const params = new URLSearchParams();
        params.append('timeFrame', timeFrame);
        
        if (cardTypeParam) {
          params.append('cardType', cardTypeParam);
        }
        
        // If dateRange is provided, add the date parameters
        if (dateRange) {
          params.append('from', effectiveDateRange.from);
          params.append('to', effectiveDateRange.to);
        }
        
        // Use API endpoint instead of server action
        const url = `/api/dashboard/data?${params.toString()}`;
        console.log('Fetching dashboard data from:', url);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!isCancelled && isMounted.current) {
          setPeriodData(result.data);
          
          // Check for errors from the API
          if (result.errors) {
            setError(result.errors);
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (!isCancelled && isMounted.current) {
          console.error('Error fetching dashboard data:', error);
          setError(error instanceof Error ? error.message : 'Erro desconhecido');
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isCancelled = true;
    };
  }, [timeFrame, dateRange, selectedCard, effectiveDateRange, dashboardData]);
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className="col-span-4">
        <CardHeader className="relative">
          <CardTitle>{title}</CardTitle>
          <div className="absolute end-4 top-3">
            <Select defaultValue={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger>
                <SelectValue />
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
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className="col-span-4">
        <CardHeader className="relative">
          <CardTitle>{title}</CardTitle>
          <div className="absolute end-4 top-3">
            <Select defaultValue={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger>
                <SelectValue />
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
    );
  }
  
  // Render empty state
  if (chartData.length === 0) {
    return (
      <Card className="col-span-4">
        <CardHeader className="relative">
          <CardTitle>{title}</CardTitle>
          <div className="absolute end-4 top-3">
            <Select defaultValue={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger>
                <SelectValue />
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
    );
  }
  
  // Render data state
  return (
    <Card className="col-span-4">
      <CardHeader className="relative">
        <CardTitle>{title}</CardTitle>
        <div className="absolute end-4 top-3">
          <Select defaultValue={timeFrame} onValueChange={handleTimeFrameChange}>
            <SelectTrigger>
              <SelectValue />
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
  );
}