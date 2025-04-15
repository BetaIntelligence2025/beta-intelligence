"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SummaryCards from '@/components/dashboard/summary-cards';
import VisualizationByPeriod from './visualization-client';
import { DateFilterButton } from './date-filter-button';
import { TimeFrame } from './types';
import { CardType } from '@/components/dashboard/summary-cards';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get active tab from URL or default to "geral"
  const urlTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(urlTab);
  
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Parse default time frame from URL or use "Daily"
  const timeFrame = (searchParams.get('timeFrame') || 'Daily') as TimeFrame;
  
  // Parse date range from search params if it exists - usando useMemo para evitar recriação do objeto
  const dateRange = useMemo(() => {
    const fromParam = searchParams.get('from');
    const timeFromParam = searchParams.get('time_from');
    const timeToParam = searchParams.get('time_to');
    
    console.log('Dashboard Page - Parâmetros da URL:', {
      from: fromParam,
      to: searchParams.get('to'),
      time_from: timeFromParam,
      time_to: timeToParam
    });
    
    if (fromParam) {
      return {
        from: fromParam,
        to: searchParams.get('to') || fromParam,
        time_from: timeFromParam,
        time_to: timeToParam
      };
    }
    return null;
  }, [searchParams]);
  
  // Função para trocar de tab
  const handleTabChange = (value: string) => {
    // Atualizar estado local imediatamente
    setActiveTab(value);
    
    // Atualizar URL sem recarregar a página
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    
    // Usar replace em vez de push para evitar entradas extras no histórico
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  
  // Sincronizar o estado com a URL quando a URL mudar
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);
  
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
      console.log('Inicializando dashboard com data atual:', { fromDate, toDate });
      
      // Usar setTimeout para garantir que a atualização da URL aconteça após a renderização inicial
      setTimeout(() => {
        router.replace(`/dashboard?${params.toString()}`, { scroll: false });
      }, 0);
    }
  }, []); // Sem dependências para executar apenas uma vez
  
  // Função para atualizar os dados
  async function refreshData() {
    // Só carregar dados se estiver na tab geral
    if (activeTab !== 'geral') return;

    setIsLoading(true);
    try {
      // Fetch data using API endpoint instead of server action
      const params = new URLSearchParams();
      params.set('timeFrame', timeFrame);
      
      if (dateRange) {
        params.set('from', dateRange.from);
        params.set('to', dateRange.to);
        if (dateRange.time_from) params.set('time_from', dateRange.time_from);
        if (dateRange.time_to) params.set('time_to', dateRange.time_to);
        params.set('landingPage', 'lp.vagasjustica.com.br');
        
        console.log('Dashboard Page - Enviando parâmetros para API:', {
          from: dateRange.from,
          to: dateRange.to,
          time_from: dateRange.time_from,
          time_to: dateRange.time_to
        });
      }
      
      // Add cache busting parameter
      params.set('_t', Date.now().toString());
      
      const response = await fetch(`/api/dashboard/data?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const newData = await response.json();
      setDashboardData(newData);
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
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
      // Mostrar notificação
      console.log("Gerando imagem do dashboard...");
      
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
      
      console.log("Download concluído!");
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
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
  
  // Atualizar quando os parâmetros de URL mudarem para dados
  // Usando uma string como dependência para evitar renderizações desnecessárias
  const searchParamsString = useMemo(() => {
    return JSON.stringify({
      timeFrame,
      dateRange
    });
  }, [timeFrame, dateRange]);
  
  useEffect(() => {
    // Não fazer requisição se não estiver na tab geral
    if (activeTab === 'geral') {
      refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString, activeTab]);
  
  // Função para lidar com a seleção de cards
  const handleCardSelect = (cardType: CardType) => {
    setSelectedCard(cardType);
  };
  
  return (
    <div id="dashboard-container" className="flex flex-col gap-4 p-4 md:p-8 bg-white">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <DateFilterButton />
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
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
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-4">
        <TabsList className="mb-4 w-auto border  shadow-sm rounded-lg">
          <TabsTrigger value="geral" className="px-4 py-1 text-sm">Geral</TabsTrigger>
          <TabsTrigger value="funis" className="px-4 py-1 text-sm">Funis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="geral" className={isLoading ? "opacity-60 pointer-events-none" : ""}>
          <SummaryCards 
            dashboardData={dashboardData} 
            onCardSelect={handleCardSelect}
            selectedCard={selectedCard}
          />
          
          <div className="mt-4">
            <VisualizationByPeriod 
              title="Visualização por Período" 
              dashboardData={dashboardData}
              selectedCard={selectedCard}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="funis" className="p-4 border rounded-md bg-gray-50">
          <div className="text-center p-8">
            <h3 className="text-xl font-medium mb-2">Funis em desenvolvimento</h3>
            <p className="text-gray-500">
              Esta seção mostrará visualizações de funis de conversão e jornadas de usuários.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => handleTabChange('geral')}>
                Voltar para Dashboard Geral
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}