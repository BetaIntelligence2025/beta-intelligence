"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SummaryCards from '@/components/dashboard/summary-cards';
import VisualizationByPeriod from './visualization-client';
import { DateFilterButton, DateRange } from './date-filter-button';
import { TimeFrame, DashboardState, DashboardDataItem } from './types';
import { CardType } from '@/components/dashboard/summary-cards';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ChevronDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { subDays, subMonths, parseISO, differenceInDays, format } from 'date-fns';

// Interfaces para profissões e funis
interface Profession {
  profession_id: string;
  profession_name: string;
}

interface Funnel {
  funnel_id: string;
  funnel_name: string;
}

// Interface para armazenar o intervalo de datas do período anterior
interface PreviousPeriod {
  from: string;
  to: string;
  time_from?: string | null;
  time_to?: string | null;
}

// Usar a mesma interface que o componente date-filter-button.tsx
interface DateRangeWithString {
  from: string;
  to: string;
  time_from?: string | null | undefined;
  time_to?: string | null | undefined;
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Log para debug dos parâmetros da URL
  useEffect(() => {
    console.log("URL completa:", window.location.href);
    console.log("Todos os parâmetros:", Object.fromEntries(searchParams.entries()));
    console.log("profession_id da URL:", searchParams.get('profession_id'));
  }, [searchParams]);
  
  // Get active tab from URL or default to "geral"
  const urlTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(urlTab);
  
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const [dashboardData, setDashboardData] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Funnel and profession states
  const [selectedProfession, setSelectedProfession] = useState<string | null>(searchParams.get('profession_id') || null);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(searchParams.get('funnel_id') || null);
  const [selectedProfessionName, setSelectedProfessionName] = useState<string | null>(null);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(searchParams.get('funnel_id') || null);
  
  // Estado para armazenar os dados do período anterior
  const [previousPeriodData, setPreviousPeriodData] = useState<DashboardState | null>(null);
  const [isLoadingPreviousPeriod, setIsLoadingPreviousPeriod] = useState(false);
  
  // Parse default time frame from URL or use "Daily"
  const timeFrame = (searchParams.get('timeFrame') || 'Daily') as TimeFrame;
  
  // Fetch professions data
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: async () => {
      const response = await fetch('/api/professions');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
    enabled: activeTab === 'funis'
  });
  
  // Fetch funnels data for selected profession with proper caching
  const { data: funnels = [], isLoading: isLoadingFunnels } = useQuery({
    queryKey: ['funnels', selectedProfession],
    queryFn: async () => {
      if (!selectedProfession) return [];
      
      // Use query parameter instead of path parameter
      const response = await fetch(`/api/professions/funnels?profession_id=${selectedProfession}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!selectedProfession && activeTab === 'funis',
    staleTime: 60000, // Cache results for 1 minute
  });
  
  // Parse date range from search params if it exists - usando useMemo para evitar recriação do objeto
  const dateRange = useMemo((): DateRangeWithString | undefined => {
    const fromParam = searchParams.get('from');
    const timeFromParam = searchParams.get('time_from');
    const timeToParam = searchParams.get('time_to');
    
    if (fromParam) {
      const toParam = searchParams.get('to') || fromParam;
      
      return {
        from: fromParam,
        to: toParam,
        time_from: timeFromParam,
        time_to: timeToParam
      };
    }
    return undefined;
  }, [searchParams]);
  
  // Função para trocar de tab
  const handleTabChange = (value: string) => {
    // Atualizar estado local imediatamente
    setActiveTab(value);
    
    // Atualizar URL sem recarregar a página
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    
    // Reset funnel and profession selection if going to geral tab
    if (value === 'geral') {
      params.delete('funnel_id');
      params.delete('profession_id');
      setSelectedFunnel(null);
      setActiveFunnelId(null);
      setSelectedProfession(null);
    }
    
    // Usar replace em vez de push para evitar entradas extras no histórico
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Após mudar a tab, forçar atualização de dados
    setTimeout(() => {
      if (value === 'geral') {
        refreshData();
      } else if (value === 'funis' && selectedProfession) {
        refreshFunnelData(selectedProfession, selectedFunnel);
      }
    }, 10);
  };
  
  // Handle profession selection
  const handleProfessionChange = (value: string) => {
    setSelectedProfession(value);
    setSelectedFunnel(null);
    
    // Update profession name
    if (value && professions && Array.isArray(professions)) {
      const foundProfession = professions.find((p: any) => p && p.profession_id === value);
      if (foundProfession) {
        setSelectedProfessionName(foundProfession.profession_name);
      }
    } else {
      setSelectedProfessionName(null);
    }
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set('profession_id', value);
    } else {
      params.delete('profession_id');
    }
    
    params.delete('funnel_id'); // Clear funnel selection when changing profession
    
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Load data for this profession
    refreshFunnelData(value, null);
  };
  
  // Handle funnel selection
  const handleFunnelChange = (value: string) => {
    // If "all" is selected, treat it as null (no specific funnel)
    const funnelValue = value === 'all' ? null : value;
    
    // Força a atualização do estado local imediatamente
    setActiveFunnelId(funnelValue);
    
    // Pequeno timeout para garantir que a UI atualize antes da navegação
    setTimeout(() => {
      // Update URL and other state
      setSelectedFunnel(funnelValue);
      
      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      if (funnelValue) {
        params.set('funnel_id', funnelValue);
      } else {
        params.delete('funnel_id');
      }
      
      router.replace(`?${params.toString()}`, { scroll: false });
      
      // Load data for this funnel
      refreshFunnelData(selectedProfession, funnelValue);
    }, 0);
  };
  
  // Sincronizar o estado com a URL quando a URL mudar
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    
    // Sync profession and funnel from URL
    const professionId = searchParams.get('profession_id');
    const funnelId = searchParams.get('funnel_id');
    
    if (professionId !== selectedProfession) {
      setSelectedProfession(professionId);
    }
    
    if (funnelId !== selectedFunnel) {
      setSelectedFunnel(funnelId);
      setActiveFunnelId(funnelId);
    }
  }, [urlTab, activeTab, searchParams]);
  
  // Efeito para inicializar os parâmetros de data se não existirem (com flag para evitar múltiplas execuções)
  const initialUrlSetupRef = useRef(false);
  
  useEffect(() => {
    // Evitar execução múltipla
    if (initialUrlSetupRef.current) return;
    initialUrlSetupRef.current = true;
    
    // Verificar se já existe filtro de data na URL
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    // Se não tiver datas na URL, adicionar a data atual no horário de Brasília
    if (!fromParam || !toParam) {
      const today = new Date();
      // Converter para horário de Brasília
      const brazilDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      
      // Formatar as datas no formato esperado pela API
      const year = brazilDate.getFullYear();
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
      const day = String(brazilDate.getDate()).padStart(2, '0');
      
      const fromDate = `${year}-${month}-${day}T00:00:00-03:00`;
      const toDate = `${year}-${month}-${day}T23:59:59-03:00`;
      
      // Criar novos parâmetros mantendo os existentes
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', fromDate);
      params.set('to', toDate);
      
      // Atualizar URL sem recarregar a página, usando replace em vez de push para não adicionar ao histórico
      setTimeout(() => {
        router.replace(`/dashboard?${params.toString()}`, { scroll: false });
      }, 0);
    }
  }, []);
  
  // Função para atualizar os dados
  async function refreshData() {
    // Só carregar dados se estiver na tab geral
    if (activeTab !== 'geral') return;

    setIsLoading(true);
    try {
      // Construir parâmetros para o endpoint unificado
      const params = new URLSearchParams();
      
      // Adicionar parâmetros de data no formato YYYY-MM-DD
      if (dateRange) {
        const fromDate = dateRange.from.split('T')[0];
        const toDate = dateRange.to.split('T')[0];
        
        params.set('from', fromDate);
        params.set('to', toDate);
        
        if (dateRange.time_from) params.set('time_from', dateRange.time_from);
        if (dateRange.time_to) params.set('time_to', dateRange.time_to);
      } else {
        // Se não houver dateRange, usar a data atual
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        params.set('from', formattedDate);
        params.set('to', formattedDate);
      }
      
      // Adicionar outros parâmetros
      params.set('time_frame', timeFrame.toLowerCase());
      params.set('landingPage', 'lp.vagasjustica.com.br');
      
      // Usar o endpoint unificado
      const response = await fetch(`/api/dashboard/unified?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.data) {
        throw new Error('Formato de resposta inválido: campo "data" não encontrado');
      }
      
      // Simplificar: usar os dados brutos diretamente
      setDashboardData({
        data: [],
        isLoading: false,
        timeFrame,
        summary: {
          sessions: responseData.data.sessions,
          leads: responseData.data.leads,
          conversions: responseData.data.conversion_rate,
          clients: 0
        },
        raw: responseData.data
      });
      
      // Atualizar dados do período anterior (sem transformações)
      setPreviousPeriodData({
        data: [],
        isLoading: false,
        period: responseData.data.filters ? {
          from: responseData.data.filters.previous_from,
          to: responseData.data.filters.previous_to
        } : null,
        raw: responseData.data
      });
      
      setIsLoadingPreviousPeriod(false);
    } catch (error) {
      // Definir estado com erro para feedback na UI, sem usar valores padrão
      setDashboardData({
        data: [],
        isLoading: false,
        errors: error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados',
        summary: {
          sessions: 0,
          leads: 0,
          conversions: 0,
          clients: 0
        }
      });
      
      // Limpar dados do período anterior
      setPreviousPeriodData(null);
      setIsLoadingPreviousPeriod(false);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Função para atualizar os dados de funis
  async function refreshFunnelData(professionId: string | null, funnelId: string | null) {
    // Evitar requisições duplicadas para os mesmos dados
    if (isLoading) return;
    
    // Preservar o estado de seleção visual antes de iniciar o carregamento
    const currentActiveFunnelId = funnelId;
    
    setIsLoading(true);
    try {
      // Construir parâmetros para o endpoint unificado
      const params = new URLSearchParams();
      
      // Adicionar parâmetros de data no formato YYYY-MM-DD
      if (dateRange) {
        const fromDate = dateRange.from.split('T')[0];
        const toDate = dateRange.to.split('T')[0];
        
        params.set('from', fromDate);
        params.set('to', toDate);
        
        if (dateRange.time_from) params.set('time_from', dateRange.time_from);
        if (dateRange.time_to) params.set('time_to', dateRange.time_to);
      } else {
        // Se não houver dateRange, usar a data atual
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        params.set('from', formattedDate);
        params.set('to', formattedDate);
      }
      
      // Adicionar parâmetros de filtro
      params.set('time_frame', timeFrame.toLowerCase());
      params.set('landingPage', 'lp.vagasjustica.com.br');
      
      // Adicionar ID de profissão e funil, se disponíveis
      if (professionId) {
        params.set('profession_id', professionId);
      }
      
      if (funnelId) {
        params.set('funnel_id', funnelId);
      }
      
      // Usar o endpoint unificado
      const response = await fetch(`/api/dashboard/unified?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.data) {
        throw new Error('Formato de resposta inválido: campo "data" não encontrado');
      }
      
      // Simplificar: usar os dados brutos diretamente
      setDashboardData({
        data: [],
        isLoading: false,
        source: funnelId ? 'funnel' : 'profession',
        funnel_id: funnelId,
        profession_id: professionId,
        timeFrame,
        summary: {
          sessions: responseData.data.sessions,
          leads: responseData.data.leads,
          conversions: responseData.data.conversion_rate,
          clients: 0
        },
        raw: responseData.data
      });
      
      // Atualizar dados do período anterior
      setPreviousPeriodData({
        data: [],
        isLoading: false,
        period: responseData.data.filters ? {
          from: responseData.data.filters.previous_from,
          to: responseData.data.filters.previous_to
        } : null,
        raw: responseData.data
      });
      
      setIsLoadingPreviousPeriod(false);
      
      // Restaurar o estado de seleção visual após carregar os dados
      setActiveFunnelId(currentActiveFunnelId);
    } catch (error) {
      // Definir dados básicos mesmo em caso de erro
      setDashboardData({
        data: [],
        isLoading: false,
        source: funnelId ? 'funnel' : 'profession',
        funnel_id: funnelId,
        profession_id: professionId,
        timeFrame,
        errors: error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados de funil',
        summary: {
          sessions: 0,
          leads: 0,
          conversions: 0,
          clients: 0
        }
      });
      
      // Limpar dados do período anterior
      setPreviousPeriodData(null);
      setIsLoadingPreviousPeriod(false);
      
      // Restaurar o estado de seleção visual mesmo em caso de erro
      setActiveFunnelId(currentActiveFunnelId);
    } finally {
      setIsLoading(false);
    }
  }
  
  // Função para baixar a tela atual como imagem
  async function downloadDashboard() {
    const dashboardElement = document.getElementById('dashboard-container');
    if (!dashboardElement) return;
    
    setIsDownloading(true);
    try {
      // Configurações para melhor qualidade
      const canvas = await html2canvas(dashboardElement, {
        scale: 2, // Escala 2x para melhor qualidade
        useCORS: true, // Permitir imagens de outros domínios
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Converter para PNG
      const imgData = canvas.toDataURL('image/png');
      
      // Criar link para download
      const link = document.createElement('a');
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      link.href = imgData;
      link.download = `dashboard_${dataFormatada}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      // Ignorar erros
    } finally {
      setIsDownloading(false);
    }
  }
  
  // Carregar dados iniciais apenas uma vez quando estiver na tab geral
  useEffect(() => {
    if (!dashboardData && !isLoading && activeTab === 'geral') {
      refreshData();
    }
  }, [dashboardData, isLoading, activeTab]);
  
  // Carregar dados iniciais para a tab de funis quando selecionada
  useEffect(() => {
    // Only fetch if we have a profession selected, no data yet, or data for a different profession/funnel
    const needsDataRefresh = 
      !dashboardData || 
      dashboardData.error || 
      dashboardData.profession_id !== selectedProfession || 
      dashboardData.funnel_id !== selectedFunnel;
      
    if (activeTab === 'funis' && !isLoading && selectedProfession && needsDataRefresh) {
      refreshFunnelData(selectedProfession, selectedFunnel);
    } else if (activeTab === 'funis' && !isLoading && !selectedProfession && professions && professions.length > 0) {
      // Se não tiver profissão selecionada, usar a primeira
      const firstProfession = professions[0].profession_id;
      setSelectedProfession(firstProfession);
      
      // Atualizar URL
      const params = new URLSearchParams(searchParams.toString());
      params.set('profession_id', firstProfession);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, selectedProfession, selectedFunnel]);  // Removed isLoading and dashboardData to prevent loops
  
  // Atualizar quando os parâmetros de URL mudarem para dados
  // Usando uma string como dependência para evitar renderizações desnecessárias
  const searchParamsString = useMemo(() => {
    return JSON.stringify({
      timeFrame,
      dateRange
    });
  }, [timeFrame, dateRange]);
  
  useEffect(() => {
    // Se tiver alguma das tabs ativas e não estiver carregando, atualizar dados
    if (activeTab === 'geral' && !isLoading) {
      refreshData();
    } else if (activeTab === 'funis' && !isLoading && selectedProfession) {
      refreshFunnelData(selectedProfession, selectedFunnel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, timeFrame, activeTab]);
  
  // Função para lidar com a seleção de cards
  const handleCardSelect = (cardType: CardType) => {
    setSelectedCard(cardType);
  };
  
  // Determinar o título do card de visualização
  const visualizationTitle = useMemo(() => {
    if (activeTab === 'funis') {
      if (selectedFunnel) {
        const funnel = funnels.find((f: any) => f.funnel_id === selectedFunnel);
        return funnel ? `Visualização do Funil: ${funnel.funnel_name}` : 'Visualização do Funil';
      }
      if (selectedProfession) {
        const profession = professions.find((p: any) => p.profession_id === selectedProfession);
        return profession ? `Visualização da Profissão: ${profession.profession_name}` : 'Visualização da Profissão';
      }
      return 'Visualização por Período';
    }
    return 'Visualização por Período';
  }, [activeTab, selectedFunnel, selectedProfession, funnels, professions]);
  
  // Função para atualizar diretamente o nome da profissão quando encontrar
  const updateProfessionDirectly = (id: string | null, name: string | null) => {
    console.log(`Atualizando diretamente - ID: ${id}, Nome: ${name}`);
    setSelectedProfession(id);
    setSelectedProfessionName(name);
  };

  // Effect para inicializar o nome da profissão ao carregar a página
  useEffect(() => {
    const initProfession = async () => {
      const profId = searchParams.get('profession_id');
      if (!profId) return;
      
      try {
        const response = await fetch(`/api/professions`);
        if (response.ok) {
          const data = await response.json();
          const profIdNumber = parseInt(profId, 10);
          
          if (data.data && Array.isArray(data.data)) {
            const foundProf = data.data.find((p: any) => p && p.profession_id === profIdNumber);
            
            if (foundProf && foundProf.profession_name) {
              console.log("Inicialização direta:", foundProf.profession_name);
              updateProfessionDirectly(profId, foundProf.profession_name);
            }
          }
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      }
    };
    
    initProfession();
  }, [searchParams]);
  
  // Derivar o nome da profissão a partir do ID selecionado e dados carregados usando useMemo
  const professionDisplayName = useMemo(() => {
    // Se não temos uma profissão selecionada, retornar o placeholder
    if (!selectedProfession) return "Selecione profissão";
    
    // Se temos um nome já salvo no estado, usá-lo (para caso de carregar da API)
    if (selectedProfessionName) return selectedProfessionName;
    
    // Verificar se temos dados de profissões e procurar pelo ID
    if (professions && Array.isArray(professions) && professions.length > 0) {
      const foundProfession = professions.find((p: any) => p && p.profession_id === selectedProfession);
      if (foundProfession && foundProfession.profession_name) {
        return foundProfession.profession_name;
      }
    }
    
    // Se não encontramos em nenhum lugar, mostrar estado de carregamento
    return "Carregando...";
  }, [selectedProfession, selectedProfessionName, professions]);
  
  // Efeito para sincronizar activeFunnelId com selectedFunnel
  useEffect(() => {
    setActiveFunnelId(selectedFunnel);
  }, [selectedFunnel]);
  
  // Ordenar os funis: ativos primeiro, depois inativos
  const sortedFunnels = useMemo(() => {
    if (!funnels || !Array.isArray(funnels)) return [];
    
    return [...funnels].sort((a, b) => {
      // Se ambos têm o mesmo status, manter a ordem original
      const aActive = a?.is_active !== false;
      const bActive = b?.is_active !== false;
      
      // Ordenar ativos primeiro, depois inativos
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // Para funis com o mesmo status, ordenar por nome
      return (a?.funnel_name || '').localeCompare(b?.funnel_name || '');
    });
  }, [funnels]);
  
  return (
    <div id="dashboard-container" className="flex flex-col gap-4 p-4 md:p-8 bg-white">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="border shadow-sm rounded-lg">
            <TabsTrigger value="geral" className="px-4 py-1 text-sm">Geral</TabsTrigger>
            <TabsTrigger value="funis" className="px-4 py-1 text-sm">Profissão</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <DateFilterButton />
            <Button 
              variant="outline" 
              size="sm"
              onClick={activeTab === 'geral' ? refreshData : () => refreshFunnelData(selectedProfession, selectedFunnel)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button  
              size="sm"
              onClick={downloadDashboard}
              disabled={isDownloading || isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Gerando...' : 'Download'}
            </Button>
          </div>
        </div>

        <TabsContent value="geral" className={isLoading ? "opacity-60 pointer-events-none" : ""}>
          <SummaryCards 
            dashboardData={dashboardData || undefined} 
            onCardSelect={handleCardSelect}
            selectedCard={selectedCard}
            dateRange={dateRange}
            previousPeriodData={previousPeriodData || undefined}
          />
          
          <div className="mt-4">
            <VisualizationByPeriod 
              title="Visualização por Período" 
              dashboardData={dashboardData || undefined}
              selectedCard={selectedCard}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="funis" className={isLoading ? "opacity-60 pointer-events-none" : ""}>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Select 
                value={selectedProfession || undefined}
                onValueChange={handleProfessionChange}
                disabled={isLoading || !professions || professions.length === 0}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Selecione profissão">
                    {selectedProfessionName || 
                      (selectedProfession 
                        ? "Carregando..." 
                        : "Selecione profissão")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {professions && Array.isArray(professions) && professions.map((profession: any) => {
                    if (!profession || !profession.profession_id) return null;
                    return (
                      <SelectItem 
                        key={profession.profession_id} 
                        value={profession.profession_id}
                      >
                        {profession.profession_name || `Profissão ${profession.profession_id}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProfession && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button 
                  variant={activeFunnelId === null ? "default" : "outline"}
                  size="sm"
                  className={`text-xs font-medium ${activeFunnelId === null ? "bg-primary text-primary-foreground border-primary shadow-sm" : ""}`}
                  onClick={() => handleFunnelChange('all')}
                  disabled={isLoadingFunnels}
                >
                  Visão Geral
                </Button>
                
                {!isLoadingFunnels && sortedFunnels && sortedFunnels.length > 0 && sortedFunnels.map((funnel: any) => {
                  if (!funnel || !funnel.funnel_id) return null;
                  
                  // Check if funnel is active
                  const isActive = funnel.is_active !== false; // Treat undefined as active
                  const isSelected = activeFunnelId === funnel.funnel_id;
                  
                  return (
                    <Button 
                      key={funnel.funnel_id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`text-xs font-medium 
                        ${!isActive ? "opacity-60 border-dashed" : ""} 
                        ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : ""}
                      `}
                      onClick={() => handleFunnelChange(funnel.funnel_id)}
                      title={isSelected ? "Funil selecionado" : (!isActive ? "Funil inativo" : "Clique para selecionar")}
                    >
                      {funnel.funnel_name || 'Funil sem nome'}
                      {!isActive && <span className="ml-1 text-xs">(Desativado)</span>}
                      {isSelected && <span className="sr-only">(Selecionado)</span>}
                    </Button>
                  );
                })}
                
                
                {!isLoadingFunnels && (!funnels || !Array.isArray(funnels) || funnels.length === 0) && (
                  <div className="text-sm text-gray-500">Nenhum funil encontrado para esta profissão</div>
                )}
                
                {isLoadingFunnels && <div className="text-xs text-gray-500">Carregando funis...</div>}
              </div>
            )}
          </div>
          
          {/* Cards de dados para funis */}
          {selectedProfession && (
            <>
              <SummaryCards 
                dashboardData={dashboardData || undefined} 
                onCardSelect={handleCardSelect}
                selectedCard={selectedCard}
                dateRange={dateRange}
                previousPeriodData={previousPeriodData || undefined}
              />
              
              <div className="mt-4">
                <VisualizationByPeriod 
                  title=""
                  dashboardData={dashboardData || undefined}
                  selectedCard={selectedCard}
                />
              </div>
            </>
          )}
          
          {!selectedProfession && (
            <div className="text-center p-8">
              <h3 className="text-xl font-medium mb-2">Selecione uma profissão</h3>
              <p className="text-gray-500">
                Para visualizar os dados de funis, selecione primeiro uma profissão.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}