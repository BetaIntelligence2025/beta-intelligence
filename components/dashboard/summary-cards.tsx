"use client";

import { ArrowDown, ArrowUp, Braces, DollarSignIcon, HelpCircle, Monitor, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "../ui/count-animation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format, subDays, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "@/app/dashboard/date-filter-button";
import { useActiveSessionCount } from "@/app/services/api";
import { DashboardDataItem, DashboardState, MetricWithComparison } from "@/app/dashboard/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type CardType = "leads" | "clients" | "sessions" | "conversions" | null;

// Usar interface compatível com os dados de string
interface DateRangeWithString {
  from: string;
  to?: string;
  time_from?: string | null;
  time_to?: string | null;
}

interface SummaryCardsProps {
  onCardSelect?: (cardType: CardType) => void;
  selectedCard?: CardType;
  dateRange?: DateRangeWithString;
  dashboardData?: DashboardState;
  previousPeriodData?: DashboardState;
}

interface CardData {
  count: number;
  previousCount: number | null; // Adicionado para armazenar o valor do período anterior
  percentage: number;
  isPositive: boolean;
  isComparable: boolean; // Adicionado para indicar se a comparação é possível
}

interface SummaryData {
  leads: CardData;
  clients: CardData;
  sessions: CardData;
  conversions: CardData;
  isLoading: boolean;
  previousPeriodLabel: string; // Adicionado para mostrar o nome do período anterior
}

// Inicializa com valores padrão
const defaultSummaryData: SummaryData = {
  leads: { count: 0, previousCount: null, percentage: 0, isPositive: true, isComparable: false },
  clients: { count: 0, previousCount: null, percentage: 0, isPositive: true, isComparable: false },
  sessions: { count: 0, previousCount: null, percentage: 0, isPositive: true, isComparable: false },
  conversions: { count: 0, previousCount: null, percentage: 0, isPositive: true, isComparable: false },
  isLoading: true,
  previousPeriodLabel: "período anterior"
};

export default function SummaryCards({ 
  onCardSelect, 
  selectedCard, 
  dateRange, 
  dashboardData,
  previousPeriodData 
}: SummaryCardsProps) {
  const [internalSelectedCard, setInternalSelectedCard] = useState<CardType>(selectedCard || null);
  const [summaryData, setSummaryData] = useState<SummaryData>(defaultSummaryData);
  
  // Extrair IDs de profissão e funil dos dados do dashboard, se disponíveis
  const professionId = dashboardData?.profession_id || undefined;
  const funnelId = dashboardData?.funnel_id || undefined;
  
  // Buscar dados de sessões ativas usando o hook, passando os filtros quando disponíveis
  const { 
    data: activeSessionsData,
    isLoading: isActiveSessionsLoading 
  } = useActiveSessionCount({
    ...(professionId && { profession_id: professionId }),
    ...(funnelId && { funnel_id: funnelId })
  });
  
  // Estado local para armazenar o número de sessões ativas
  const [activeSessions, setActiveSessions] = useState<number>(0);
  
  // Calcula métricas por tipo
  const calculateMetric = useCallback((current: number, previous: number): CardData => {
    // Verificar se é possível fazer uma comparação válida
    const isComparable = previous > 0;
    
    // Se o valor anterior for zero, não é possível calcular a porcentagem
    if (!isComparable) {
      return {
        count: current,
        previousCount: previous, // Armazenar o valor anterior mesmo que seja zero
        percentage: 0,
        isPositive: current > 0,
        isComparable: false
      };
    }
    
    // Calcular a variação percentual: ((valorAtual - valorAnterior) / valorAnterior) * 100
    const percentChange = ((current - previous) / previous) * 100;
    
    return {
      count: current,
      previousCount: previous,
      percentage: Math.abs(Math.round(percentChange * 10) / 10), // Arredondar para 1 casa decimal
      isPositive: percentChange >= 0,
      isComparable: true
    };
  }, []);
  
  // Função de clique de card otimizada para evitar re-renderizações
  const handleCardClick = useCallback((cardType: CardType) => {
    const newSelectedCard = internalSelectedCard === cardType ? null : cardType;
    setInternalSelectedCard(newSelectedCard);
    
    if (onCardSelect) {
      onCardSelect(newSelectedCard);
    }
  }, [internalSelectedCard, onCardSelect]);
  
  // Atualizar o internalSelectedCard quando o selectedCard externo mudar
  useEffect(() => {
    if (selectedCard !== internalSelectedCard) {
      setInternalSelectedCard(selectedCard || null);
    }
  }, [selectedCard]);
  
  // Memoização da formatação monetária
  const formatCurrency = useCallback((value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }, []);
  
  // Efeito para atualizar o número de sessões ativas quando os dados chegarem
  useEffect(() => {
    if (activeSessionsData) {
      // Aceitar tanto active_count quanto count
      const count = activeSessionsData.active_count || activeSessionsData.count || 0;
      setActiveSessions(count);
    }
  }, [activeSessionsData]);
  
  // Processar dados do dashboard
  useEffect(() => {
    if (!dashboardData) return;
    
    // Se está carregando, mostrar loader
    if (dashboardData.isLoading) {
      setSummaryData(prev => ({ ...prev, isLoading: true }));
      return;
    }
    
    // Usar diretamente os dados da API, que já vêm no formato correto
    if (dashboardData.raw) {
      // Tratar os dados como any para acessar a nova estrutura
      const rawData = dashboardData.raw as any;
      
      // Validar se temos os dados necessários
      if (!rawData.sessions || !rawData.leads || !rawData.conversion_rate) {
        console.error('Dados incompletos recebidos da API:', rawData);
        setSummaryData({
          ...defaultSummaryData,
          isLoading: false
        });
        return;
      }
      
      // Criar dados de card a partir dos dados da API
      const processedSummary: SummaryData = {
        leads: {
          count: rawData.leads?.current || 0,
          previousCount: rawData.leads?.previous || 0,
          percentage: rawData.leads?.percentage || 0,
          isPositive: rawData.leads?.is_increasing !== false,
          isComparable: !!rawData.leads?.previous && rawData.leads.previous > 0
        },
        clients: defaultSummaryData.clients, // Manter o padrão para clients
        sessions: {
          count: rawData.sessions?.current || 0,
          previousCount: rawData.sessions?.previous || 0,
          percentage: rawData.sessions?.percentage || 0,
          isPositive: rawData.sessions?.is_increasing !== false,
          isComparable: !!rawData.sessions?.previous && rawData.sessions.previous > 0
        },
        conversions: {
          count: rawData.conversion_rate?.current || 0,
          previousCount: rawData.conversion_rate?.previous || 0,
          percentage: rawData.conversion_rate?.percentage || 0,
          isPositive: rawData.conversion_rate?.is_increasing !== false,
          isComparable: !!rawData.conversion_rate?.previous && rawData.conversion_rate.previous > 0
        },
        isLoading: false,
        previousPeriodLabel: determinePreviousPeriodLabel(rawData)
      };
      
      setSummaryData(processedSummary);
      return;
    }
    
    // Se não temos dados, mostrar dados vazios
    setSummaryData({
      ...defaultSummaryData,
      isLoading: false
    });
  }, [dashboardData]);

  // Função simplificada para determinar o rótulo do período anterior
  const determinePreviousPeriodLabel = (data: any): string => {
    if (!data || !data.filters) return "período anterior";
    
    // Se há informações sobre o tipo de período, usar diretamente
    if (data.period_type) {
      const periodMap: Record<string, string> = {
        'day': 'dia anterior',
        'week': 'semana anterior',
        'month': 'mês anterior',
        'quarter': 'trimestre anterior',
        'year': 'ano anterior'
      };
      
      return periodMap[data.period_type] || 'período anterior';
    }
    
    // Se não tiver informação de tipo, tentar calcular pelo período
    if (data.filters.from && data.filters.to) {
      try {
        const startDate = new Date(data.filters.from);
        const endDate = new Date(data.filters.to);
        const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (daysDiff <= 1) return "dia anterior";
        if (daysDiff <= 7) return "semana anterior";
        if (daysDiff <= 31) return "mês anterior";
        if (daysDiff <= 90) return "trimestre anterior";
      } catch (e) {
        // Em caso de erro, retornar o padrão
      }
    }
    
    return "período anterior";
  };

  // Componente para exibir a variação percentual com ícone e tooltip
  const PercentageVariation = ({ data, label }: { data: CardData, label: string }) => {
    if (!data.isComparable) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-gray-500 flex items-center">
                Não comparável <HelpCircle className="ml-1 size-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs text-xs">
                Não foi possível calcular a variação porque o {label} não possui dados no período anterior ou é zero.
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "flex items-center",
              data.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {data.isPositive ? (
                <ArrowUp className="mr-1 size-3" />
              ) : (
                <ArrowDown className="mr-1 size-3" />
              )}
              {data.percentage}%
              <HelpCircle className="ml-1 size-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 max-w-xs text-xs">
              <div><strong>Período atual:</strong> {data.count}</div>
              <div><strong>{summaryData.previousPeriodLabel}:</strong> {data.previousCount}</div>
              <div><strong>Variação:</strong> {data.isPositive ? "+" : "-"}{data.percentage}%</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="overflow-hidden rounded-md">
      <div className="grid space-y-2 md:grid-cols-2 lg:grid-cols-4 lg:space-y-0">
        <Card 
          className={cn(
            "rounded-none transition-all opacity-60 bg-gray-50 cursor-not-allowed",
            (selectedCard || internalSelectedCard) === "clients" && "bg-gray-100 border-gray-300"
          )}
        >
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-medium">Connect Rate</CardTitle>
            <div className="absolute end-4 top-4 flex size-12 items-end justify-start rounded-full bg-gray-100 p-4">
              <UsersIcon className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              <span>Em breve</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Funcionalidade em desenvolvimento</span>
            </div>
            <div className="mt-2 rounded bg-gray-50 px-2 py-1">
              <p className="text-xs text-gray-400 italic">Funcionalidade em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "rounded-none hover:bg-muted cursor-pointer transition-all",
            (selectedCard || internalSelectedCard) === "sessions" && "bg-gray-100 border-gray-300"
          )}
          onClick={() => handleCardClick("sessions")}
        >
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-medium">Sessões na Captação</CardTitle>
            <div className="absolute end-4 top-4 flex size-12 items-end justify-start rounded-full bg-gray-100 p-4">
              <Monitor className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {summaryData.isLoading ? (
                <span>Carregando...</span>
              ) : (
                <CountAnimation number={summaryData.sessions.count} />
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <PercentageVariation data={summaryData.sessions} label="sessões" />
              )} em relação ao {summaryData.previousPeriodLabel}
            </div>
            <div className="mt-2 rounded bg-gray-50 px-2 py-1">
              <p className="text-xs font-medium">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500"></span>
                {isActiveSessionsLoading ? "Carregando..." : `${activeSessions} sessões ativas agora`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "rounded hover:bg-muted cursor-pointer transition-all",
            (selectedCard || internalSelectedCard) === "leads" && "bg-gray-100 border-gray-300"
          )}
          onClick={() => handleCardClick("leads")}
        >
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-medium">Leads</CardTitle>
            <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
              <Braces className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {summaryData.isLoading ? (
                <span>Carregando...</span>
              ) : (
                <CountAnimation number={summaryData.leads.count} />
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <PercentageVariation data={summaryData.leads} label="leads" />
              )} em relação ao {summaryData.previousPeriodLabel}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "rounded-none hover:bg-muted cursor-pointer transition-all",
            (selectedCard || internalSelectedCard) === "conversions" && "bg-gray-100 border-gray-300"
          )}
          onClick={() => handleCardClick("conversions")}
        >
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-medium">Conversão da Captação</CardTitle>
            <div className="absolute end-4 top-4 flex size-12 items-end justify-start rounded-full bg-gray-100 p-4">
              <DollarSignIcon className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">
              {summaryData.isLoading ? (
                <span>Carregando...</span>
              ) : (
                <>{summaryData.conversions.count}%</>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <PercentageVariation data={summaryData.conversions} label="conversão" />
              )} em relação ao {summaryData.previousPeriodLabel}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
