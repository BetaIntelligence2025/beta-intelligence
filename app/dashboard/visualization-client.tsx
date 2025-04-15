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
    label: "Conversão da Captação",
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
    
    // Trigger immediate data refresh
    if (periodData && periodData.length > 0) {
      processChartData(periodData, value as TimeFrame);
    }
  }
  
  // Separate the processing logic into a reusable function
  async function processChartData(data: DashboardDataItem[], currentTimeFrame: TimeFrame) {
    try {
      console.log('Processing chart data with timeframe:', currentTimeFrame);
      setIsLoading(true);
      
      // Set a timeout that will trigger if the request takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido ao carregar dados')), 35000);
      });
      
      // The actual API call
      const fetchPromise = fetch('/api/dashboard/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: data,
          timeFrame: currentTimeFrame,
          dateRange: dateRange && dateRange.from && dateRange.to 
            ? { 
                from: dateRange.from.toISOString(), 
                to: dateRange.to.toISOString() 
              } 
            : null
        })
      });
      
      // Race between the timeout and the fetch
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        throw new Error(`API respondeu com erro ${response.status}`);
      }
      
      const processedData = await response.json();
      
      if (isMounted.current) {
        console.log('Setting chart data:', processedData.length, 'items');
        setChartData(processedData);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error processing chart data:', error);
      if (isMounted.current) {
        let errorMessage = 'Erro ao processar dados';
        
        if (error instanceof Error) {
          if (error.message.includes('tempo limite') || error.message.includes('timeout')) {
            errorMessage = 'Tempo limite excedido. A API está demorando para responder.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    }
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
    
    const processData = async () => {
      if (!isCancelled) {
        await processChartData(periodData, timeFrame);
      }
    };
    
    processData();
    
    return () => {
      isCancelled = true;
    };
  }, [periodData, timeFrame, dateRange]);
  
  // Only fetch data directly if dashboardData is not provided
  useEffect(() => {
    if (dashboardData) return; // Skip if dashboardData is provided
    
    let isCancelled = false;
    setIsLoading(true);
    
    async function fetchData(retryCount = 0) {
      try {
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('from', dateRange.from.toISOString());
        if (dateRange?.to) params.append('to', dateRange.to.toISOString());
        if (selectedCard) params.append('cardType', selectedCard);
        params.append('timeFrame', timeFrame);
        
        // Add a cache-busting parameter to prevent stale data
        params.append('_t', Date.now().toString());
        
        console.log(`Fetching dashboard data with timeFrame: ${timeFrame}`);
        
        // Create a timeout promise that rejects after 35 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tempo limite excedido ao carregar dados')), 35000);
        });
        
        const fetchPromise = fetch(`/api/dashboard/data?${params.toString()}`);
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!response.ok) {
          throw new Error(`API respondeu com erro ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!isCancelled && isMounted.current) {
          setPeriodData(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        
        // Retry logic - maximum 2 retries (total 3 attempts)
        if (retryCount < 2 && !isCancelled) {
          console.log(`Retrying fetch (attempt ${retryCount + 2}/3)...`);
          setTimeout(() => fetchData(retryCount + 1), 2000); // Wait 2 seconds before retry
          return;
        }
        
        if (!isCancelled && isMounted.current) {
          let errorMessage = 'Erro ao buscar dados';
          
          if (error instanceof Error) {
            if (error.message.includes('tempo limite') || error.message.includes('timeout')) {
              errorMessage = 'Tempo limite excedido. A API está demorando para responder.';
            } else {
              errorMessage = error.message;
            }
          }
          
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      isCancelled = true;
    };
  }, [dateRange, selectedCard, dashboardData, timeFrame]);
  
  // Synchronize with URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const newParams = new URLSearchParams(window.location.search);
      const newTimeFrame = newParams.get('timeFrame') as TimeFrame;
      if (newTimeFrame && newTimeFrame !== timeFrame) {
        setTimeFrame(newTimeFrame);
      }
    };

    // Listen for popstate events (when user navigates back/forward)
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [timeFrame]);
  
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