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
import { AnalyticsCardType } from "./analytics-summary-cards";

// Chart configuration for analytics metrics - cores neutras
const chartConfig = {
  leads: {
    label: "Leads",
    color: "#374151"
  },
  sessions: {
    label: "Sessões",
    color: "#6B7280"
  },
  purchases: {
    label: "Compras",
    color: "#4B5563"
  },
  cpl: {
    label: "CPL",
    color: "#9CA3AF"
  },
  investment: {
    label: "Investimento",
    color: "#D1D5DB"
  },
  revenue: {
    label: "Faturamento",
    color: "#1F2937"
  },
  roas: {
    label: "ROAS",
    color: "#111827"
  },
  // Cores mais claras para período anterior
  previous_leads: {
    label: "Leads (Período Anterior)",
    color: "#9CA3AF"
  },
  previous_sessions: {
    label: "Sessões (Período Anterior)",
    color: "#D1D5DB"
  },
  previous_purchases: {
    label: "Compras (Período Anterior)",
    color: "#9CA3AF"
  },
  previous_cpl: {
    label: "CPL (Período Anterior)",
    color: "#E5E7EB"
  },
  previous_investment: {
    label: "Investimento (Período Anterior)",
    color: "#F3F4F6"
  },
  previous_revenue: {
    label: "Faturamento (Período Anterior)",
    color: "#6B7280"
  },
  previous_roas: {
    label: "ROAS (Período Anterior)",
    color: "#9CA3AF"
  }
} satisfies ChartConfig;

interface AnalyticsChartProps {
  analyticsData: any;
  isLoading: boolean;
  viewType: "geral" | "profissoes";
  selectedProfession?: string | null;
  dateRange?: any;
  selectedCard?: AnalyticsCardType;
}

// Memoized chart component
const MemoizedAnalyticsChart = memo(function AnalyticsChart({
  data,
  selectedMetric,
  visibleDataKeys
}: {
  data: any[];
  selectedMetric: string | null;
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
            // Se for dados por hora, manter o formato "XXh"
            if (value.endsWith('h')) {
              return value;
            }
            
            // Para exibição diária, mostrar o dia e mês para maior clareza
            const parts = value.split('/');
            return parts.length === 3 ? `${parts[0]}/${parts[1]}` : value;
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={35}
          tickFormatter={(value) => {
            const numValue = Number(value);
            
            // Format numbers - use generic formatting when showing multiple metrics
            if (!selectedMetric) {
              return numValue.toLocaleString('pt-BR');
            }
            
            // Format numbers based on metric type
            if (selectedMetric === 'cpl' || selectedMetric === 'investment') {
              if (numValue === 0) {
                return 'R$ 0';
              }
              return `R$ ${numValue.toLocaleString('pt-BR')}`;
            }
            if (selectedMetric === 'revenue') {
              return `R$ ${numValue.toLocaleString('pt-BR')}`;
            }
            if (selectedMetric === 'roas') {
              if (numValue === 0) {
                return '0x';
              }
              return `${numValue.toFixed(2)}x`;
            }
            return numValue.toLocaleString('pt-BR');
          }}
        />
        <ChartTooltip 
          cursor={false} 
          content={
            <ChartTooltipContent 
              labelFormatter={(label) => {
                // Se for dados por hora, mostrar "Hora: XXh"
                if (label.endsWith('h')) {
                  return `Hora: ${label}`;
                }
                return `Período: ${label}`;
              }}
              formatter={(value, name) => {
                const metricName = name as string;
                const numValue = Number(value);
                
                // Determinar o tipo base da métrica (removendo 'previous_' se existir)
                const baseMetric = metricName.startsWith('previous_') ? metricName.replace('previous_', '') : metricName;
                
                // Formatação específica por tipo de métrica
                if (baseMetric === 'cpl' || baseMetric === 'investment') {
                  // Para CPL e Investment zerados, mostrar "R$ 0"
                  if (numValue === 0) {
                    return 'R$ 0';
                  } else {
                    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                } else if (baseMetric === 'revenue') {
                  return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                } else if (baseMetric === 'roas') {
                  // Para ROAS zerado, mostrar "0x"
                  if (numValue === 0) {
                    return '0x';
                  } else {
                    return `${numValue.toFixed(2)}x`;
                  }
                } else if (baseMetric === 'sessions') {
                  return `${numValue.toLocaleString('pt-BR')} sessões`;
                } else if (baseMetric === 'purchases') {
                  return `${numValue.toLocaleString('pt-BR')} compras`;
                } else if (baseMetric === 'leads') {
                  return `${numValue.toLocaleString('pt-BR')} leads`;
                } else {
                  return `${numValue.toLocaleString('pt-BR')}`;
                }
              }}
            />
          } 
        />
        
        {/* Render lines for all visible metrics */}
        {visibleDataKeys.map(metric => {
          const isPreviousPeriod = metric.startsWith('previous_');
          return (
            <Line 
              key={metric}
              dataKey={metric} 
              type="monotone" 
              stroke={chartConfig[metric as keyof typeof chartConfig]?.color || "#1F2937"}
              strokeWidth={isPreviousPeriod ? 1.5 : 2}
              strokeDasharray={isPreviousPeriod ? "5 5" : "0"}
              connectNulls={true}
              dot={{ strokeWidth: isPreviousPeriod ? 1.5 : 2, r: isPreviousPeriod ? 2 : 3 }}
              activeDot={{ r: isPreviousPeriod ? 4 : 5 }}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
});

export default function AnalyticsChart({
  analyticsData,
  isLoading,
  viewType,
  selectedProfession,
  dateRange,
  selectedCard
}: AnalyticsChartProps) {
  const [timeFrame, setTimeFrame] = useState<"Daily" | "Weekly" | "Monthly">("Daily");

  // Fetch historical data for chart
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchHistoricalData = async () => {
    if (!dateRange) return;
    
    setLoadingChart(true);
    try {
      const params = new URLSearchParams();
      
      // Add date parameters
      const fromDate = dateRange.from.split('T')[0];
      const toDate = dateRange.to.split('T')[0];
      
      params.set('from', fromDate);
      params.set('to', toDate);
      params.set('chart_data', 'true'); // Flag to get historical data
      
      // Add profession filter if selected
      if (viewType === 'profissoes' && selectedProfession) {
        params.set('profession_id', selectedProfession);
      }
      
      const response = await fetch(`/api/dashboard/analytics?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const responseData = await response.json();
      
      if (responseData.success && responseData.chart_data) {
        setHistoricalData(responseData.chart_data);
      } else {
        setHistoricalData([]);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setHistoricalData([]);
    } finally {
      setLoadingChart(false);
    }
  };

  // Fetch historical data when dependencies change
  useEffect(() => {
    if (dateRange) {
      fetchHistoricalData();
    }
  }, [dateRange, viewType, selectedProfession]);

  // Process analytics data for chart
  const processAnalyticsData = useCallback((data: any[], metrics: string[]) => {
    if (!data || data.length === 0) return [];

    return data.map(item => {
      const dataPoint: any = {
        period: item.period || item.date,
        date: item.date
      };
      
      // Add data for each metric
      metrics.forEach(metric => {
        dataPoint[metric] = item[metric] || 0;
        // Also add previous period data
        dataPoint[`previous_${metric}`] = item[`previous_${metric}`] || 0;
      });
      
      return dataPoint;
    });
  }, []);

  // Get chart data based on selected card
  const chartData = useMemo(() => {
    // Check if we have hourly data (either sessions field or period ending with 'h')
    const hasHourlyData = historicalData.some(item => 
      item.sessions !== undefined || (item.period && item.period.endsWith('h'))
    );
    const baseMetrics = hasHourlyData ? ['sessions', 'leads', 'purchases', 'cpl', 'investment', 'revenue', 'roas'] : ['leads', 'purchases', 'cpl', 'investment', 'revenue', 'roas'];
    const metrics = selectedCard ? [selectedCard] : baseMetrics;
    return processAnalyticsData(historicalData, metrics);
  }, [historicalData, selectedCard, processAnalyticsData]);

  // Determine visible data keys
  const visibleDataKeys = useMemo(() => {
    // Check if we have hourly data (either sessions field or period ending with 'h')
    const hasHourlyData = historicalData.some(item => 
      item.sessions !== undefined || (item.period && item.period.endsWith('h'))
    );
    const baseMetrics = hasHourlyData ? ['sessions', 'leads', 'purchases', 'cpl', 'investment', 'revenue', 'roas'] : ['leads', 'purchases', 'cpl', 'investment', 'revenue', 'roas'];
    
    if (selectedCard) {
      // When a card is selected, show both current and previous period data
      return [selectedCard, `previous_${selectedCard}`];
    }
    
    return baseMetrics;
  }, [selectedCard, historicalData]);

  // Handle timeframe change
  const handleTimeFrameChange = useCallback((value: string) => {
    setTimeFrame(value as "Daily" | "Weekly" | "Monthly");
  }, []);

  // Get profession name from analyticsData if available
  const professionName = useMemo(() => {
    if (viewType === 'profissoes' && selectedProfession && analyticsData?.profession_data) {
      const profession = analyticsData.profession_data.find(
        (p: any) => p.profession_id === selectedProfession
      );
      return profession?.profession_name || null;
    }
    return null;
  }, [viewType, selectedProfession, analyticsData]);

  // Check if we have hourly data (either sessions field or period ending with 'h')
  const hasHourlyData = historicalData.some(item => 
    item.sessions !== undefined || (item.period && item.period.endsWith('h'))
  );
  const timeUnit = hasHourlyData ? "por Hora" : "Diária";

  const metricLabels = {
    leads: "Leads",
    sessions: "Sessões",
    purchases: "Compras",
    cpl: "CPL (Custo por Lead)",
    investment: "Investimento",
    revenue: "Faturamento",
    roas: "ROAS"
  };

  const chartTitle = useMemo(() => {
    let baseTitle = selectedCard 
      ? `Evolução ${timeUnit} - ${metricLabels[selectedCard as keyof typeof metricLabels]}`
      : `Evolução ${timeUnit} - Todas as Métricas`;
    
    // Add comparison indicator when showing single metric
    if (selectedCard) {
      baseTitle = `${baseTitle} (vs Período Anterior)`;
    }
    
    // Add profession name if in profession view
    if (professionName) {
      baseTitle = `${baseTitle} - ${professionName}`;
    }
    
    return baseTitle;
  }, [selectedCard, timeUnit, professionName]);

  if (isLoading || loadingChart) {
    return (
      <Card>
        <CardHeader className="relative">
          <CardTitle>Evolução das Métricas</CardTitle>
          <div className="absolute end-4 top-3">
            <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Diário</SelectItem>
                <SelectItem value="Weekly">Semanal</SelectItem>
                <SelectItem value="Monthly">Mensal</SelectItem>
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



  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="relative">
          <CardTitle>Evolução das Métricas</CardTitle>
          <div className="absolute end-4 top-3">
            <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Diário</SelectItem>
                <SelectItem value="Weekly">Semanal</SelectItem>
                <SelectItem value="Monthly">Mensal</SelectItem>
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



  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle>
          {chartTitle}
        </CardTitle>
        <div className="absolute end-4 top-3">
          <Select value={timeFrame} onValueChange={handleTimeFrameChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Diário</SelectItem>
              <SelectItem value="Weekly">Semanal</SelectItem>
              <SelectItem value="Monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <MemoizedAnalyticsChart 
          data={chartData} 
          selectedMetric={selectedCard || null}
          visibleDataKeys={visibleDataKeys}
        />
      </CardContent>
    </Card>
  );
} 