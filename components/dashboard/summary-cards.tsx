"use client";

import { Braces, DollarSignIcon, Monitor, UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "../ui/count-animation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "@/app/dashboard/date-filter-button";
import { useActiveSessionCount } from "@/app/services/api";
import { DashboardDataItem } from "@/app/dashboard/types";

export type CardType = "leads" | "clients" | "sessions" | "conversions" | null;

interface SummaryCardsProps {
  onCardSelect?: (cardType: CardType) => void;
  selectedCard?: CardType;
  dateRange?: DateRange;
  dashboardData?: {
    data: DashboardDataItem[];
    isLoading?: boolean;
    errors?: string;
    profession_id?: string;
    funnel_id?: string;
  };
}

interface CardData {
  count: number;
  percentage: number;
  isPositive: boolean;
}

interface SummaryData {
  leads: CardData;
  clients: CardData;
  sessions: CardData;
  conversions: CardData;
  isLoading: boolean;
}

// Inicializa com valores padrão
const defaultSummaryData: SummaryData = {
  leads: { count: 0, percentage: 0, isPositive: true },
  clients: { count: 0, percentage: 0, isPositive: true },
  sessions: { count: 0, percentage: 0, isPositive: true },
  conversions: { count: 0, percentage: 0, isPositive: true },
  isLoading: true
};

export default function SummaryCards({ onCardSelect, selectedCard, dateRange, dashboardData }: SummaryCardsProps) {
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
  
  // Processar dados do dashboard
  useEffect(() => {
    if (!dashboardData) return;
    
    // Iniciar processamento apenas quando os dados estiverem disponíveis e não estiver carregando
    if (dashboardData.data.length > 0 && !dashboardData.isLoading) {
      // Inicializar contadores
      let leadsCount = 0;
      let clientsCount = 0;
      let sessionsCount = 0;
      
      // Contar cada tipo
      dashboardData.data.forEach(item => {
        if (item.type === 'leads') {
          leadsCount += item.count;
        } else if (item.type === 'clients') {
          clientsCount += item.count;
        } else if (item.type === 'sessions') {
          sessionsCount += item.count;
        }
      });
      
      // Calcular conversão
      const conversionRate = sessionsCount > 0 ? Math.round((leadsCount / sessionsCount) * 100) : 0;
      
      // Período anterior (mock - na implementação real, você compararia com dados anteriores)
      // Em uma versão completa, você buscaria dados do período anterior para comparação
      const previousData = {
        leads: Math.max(1, Math.round(leadsCount * 0.9)),
        clients: Math.max(1, Math.round(clientsCount * 0.8)),
        sessions: Math.max(1, Math.round(sessionsCount * 0.9)),
        conversions: Math.max(1, Math.round(conversionRate * 0.85))
      };
      
      // Atualizar dados de resumo
      setSummaryData({
        leads: calculateMetric(leadsCount, previousData.leads),
        clients: calculateMetric(clientsCount, previousData.clients),
        sessions: calculateMetric(sessionsCount, previousData.sessions),
        conversions: calculateMetric(conversionRate, previousData.conversions),
        isLoading: false
      });
      
      console.log('Summary cards updated with server action data:', { 
        leads: leadsCount, 
        clients: clientsCount, 
        sessions: sessionsCount, 
        conversions: conversionRate 
      });
    } else {
      // Se estiver carregando, atualizar o estado para mostrar o loader
      setSummaryData(prev => ({ ...prev, isLoading: dashboardData.isLoading ?? true }));
    }
  }, [dashboardData]);
  
  // Calcula métricas por tipo
  const calculateMetric = (current: number, previous: number): CardData => {
    if (previous === 0) {
      return {
        count: current,
        percentage: current > 0 ? 100 : 0,
        isPositive: current > 0
      };
    }
    
    const percentChange = ((current - previous) / previous) * 100;
    
    return {
      count: current,
      percentage: Math.abs(Math.round(percentChange * 10) / 10),
      isPositive: percentChange >= 0
    };
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
            <p className="text-xs text-muted-foreground">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <span className={summaryData.clients.isPositive ? "text-green-600" : "text-red-600"}>
                  {summaryData.clients.isPositive ? "+" : "-"}{summaryData.clients.percentage}%
                </span>
              )} do período anterior
            </p>
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
            <p className="text-xs text-muted-foreground">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <span className={summaryData.sessions.isPositive ? "text-green-600" : "text-red-600"}>
                  {summaryData.sessions.isPositive ? "+" : "-"}{summaryData.sessions.percentage}%
                </span>
              )} do período anterior
            </p>
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
            <p className="text-xs text-muted-foreground">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <span className={summaryData.leads.isPositive ? "text-green-600" : "text-red-600"}>
                  {summaryData.leads.isPositive ? "+" : "-"}{summaryData.leads.percentage}%
                </span>
              )} do período anterior
            </p>
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
            <p className="text-xs text-muted-foreground">
              {summaryData.isLoading ? (
                <span>Calculando...</span>
              ) : (
                <span className={summaryData.conversions.isPositive ? "text-green-600" : "text-red-600"}>
                  {summaryData.conversions.isPositive ? "+" : "-"}{summaryData.conversions.percentage}%
                </span>
              )} do período anterior
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
