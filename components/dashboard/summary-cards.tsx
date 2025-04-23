"use client";

import { ArrowDown, ArrowUp, Braces, DollarSignIcon, HelpCircle, Monitor, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "../ui/count-animation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { format, subDays, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "@/app/dashboard/date-filter-button";
import { useActiveSessionCount } from "@/app/services/api";
import { DashboardDataItem } from "@/app/dashboard/types";
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
  dashboardData?: {
    data: DashboardDataItem[];
    isLoading?: boolean;
    errors?: string;
    profession_id?: string;
    funnel_id?: string;
  };
  previousPeriodData?: {
    data: DashboardDataItem[];
    isLoading?: boolean;
  };
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
  
  // Função para determinar o rótulo do período anterior com base no intervalo de datas atual
  const getPreviousPeriodLabel = useCallback((range?: DateRangeWithString): string => {
    if (!range || !range.from || !range.to) return "período anterior";
    
    // Calcula a duração do período atual em dias
    const currentPeriodStart = new Date(range.from);
    const currentPeriodEnd = range.to ? new Date(range.to) : new Date();
    const daysDiff = Math.round(
      (currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Determina o rótulo com base na duração
    if (daysDiff <= 1) return "dia anterior";
    if (daysDiff <= 7) return "semana anterior";
    if (daysDiff <= 31) return "mês anterior";
    if (daysDiff <= 90) return "trimestre anterior";
    return "período anterior";
  }, []);

  // Processar dados do dashboard
  useEffect(() => {
    if (!dashboardData) return;
    
    // Iniciar processamento apenas quando os dados estiverem disponíveis e não estiver carregando
    if (dashboardData.data.length > 0 && !dashboardData.isLoading) {
      // Inicializar contadores para o período atual
      let leadsCount = 0;
      let clientsCount = 0;
      let sessionsCount = 0;
      
      // Contar cada tipo para o período atual
      dashboardData.data.forEach(item => {
        if (item.type === 'leads') {
          leadsCount += item.count;
        } else if (item.type === 'clients') {
          clientsCount += item.count;
        } else if (item.type === 'sessions') {
          sessionsCount += item.count;
        }
      });
      
      // Calcular conversão para o período atual
      const conversionRate = sessionsCount > 0 ? Math.round((leadsCount / sessionsCount) * 100) : 0;
      
      // Inicializar contadores para o período anterior
      let previousLeadsCount = 0;
      let previousClientsCount = 0;
      let previousSessionsCount = 0;
      let previousConversionRate = 0;
      
      // Se temos dados do período anterior, calcular contagens
      const hasPreviousPeriodData = previousPeriodData && 
                                   previousPeriodData.data && 
                                   previousPeriodData.data.length > 0;
      
      if (hasPreviousPeriodData) {
        previousPeriodData?.data.forEach(item => {
          if (item.type === 'leads') {
            previousLeadsCount += item.count;
          } else if (item.type === 'clients') {
            previousClientsCount += item.count;
          } else if (item.type === 'sessions') {
            previousSessionsCount += item.count;
          }
        });
        
        // Calcular taxa de conversão anterior
        previousConversionRate = previousSessionsCount > 0 
          ? Math.round((previousLeadsCount / previousSessionsCount) * 100) 
          : 0;
      }
      
      // Determinar o rótulo do período anterior
      const periodLabel = getPreviousPeriodLabel(dateRange);
      
      // Atualizar dados de resumo com valores de ambos os períodos
      setSummaryData({
        leads: calculateMetric(leadsCount, previousLeadsCount),
        clients: calculateMetric(clientsCount, previousClientsCount),
        sessions: calculateMetric(sessionsCount, previousSessionsCount),
        conversions: calculateMetric(conversionRate, previousConversionRate),
        isLoading: false,
        previousPeriodLabel: periodLabel
      });
      
      console.log('Summary cards updated with real data comparison:', { 
        current: { 
          leads: leadsCount, 
          clients: clientsCount, 
          sessions: sessionsCount, 
          conversions: conversionRate 
        },
        previous: {
          leads: previousLeadsCount,
          clients: previousClientsCount,
          sessions: previousSessionsCount,
          conversions: previousConversionRate
        }
      });
    } else {
      // Se estiver carregando, atualizar o estado para mostrar o loader
      setSummaryData(prev => ({ ...prev, isLoading: dashboardData.isLoading ?? true }));
    }
  }, [dashboardData, previousPeriodData, dateRange, getPreviousPeriodLabel]);
  
  // Calcula métricas por tipo
  const calculateMetric = (current: number, previous: number): CardData => {
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
              {summaryData.isLoading ? (
                <span>Carregando...</span>
              ) : (
                <>{summaryData.clients.count}%</>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <PercentageVariation data={summaryData.clients} label="connect rate" />
              )} em relação ao {summaryData.previousPeriodLabel}
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
