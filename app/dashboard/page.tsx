"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import SummaryCards, { CardType } from "@/components/dashboard/summary-cards";
import VisualizationByPeriod from "./visualization-by-period";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw } from "lucide-react";
import { DateFilterButton, DateRange } from "./date-filter-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDashboardDataAction } from "./actions";

export default function Dashboard() {
  const defaultDateRange = useMemo(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    return {
      from: lastMonth,
      to: today
    };
  }, []);
  
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const [activeTab, setActiveTab] = useState("geral");
  const [dashboardData, setDashboardData] = useState<{
    data: any[];
    isLoading: boolean;
    errors?: string;
  }>({ data: [], isLoading: true });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const handleDateRangeChange = useCallback((dateRange: DateRange | undefined) => {
    if (!dateRange) {
      setCurrentDateRange(defaultDateRange);
      return;
    }
    
    if (JSON.stringify(currentDateRange) !== JSON.stringify(dateRange)) {
      setCurrentDateRange(dateRange);
    }
  }, [currentDateRange, defaultDateRange]);
  
  // Função para capturar screenshot da dashboard
  const captureScreenshot = useCallback(async () => {
    if (!dashboardRef.current) return;
    
    try {
      setIsDownloading(true);
      
      // Importar html2canvas dinamicamente apenas quando for necessário
      const html2canvas = (await import('html2canvas')).default;
      
      // Captura a tela da dashboard
      const canvas = await html2canvas(dashboardRef.current, {
        logging: false,
        scale: 2, // Escala 2x para melhor qualidade
        useCORS: true, // Permite carregar imagens de outros domínios
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Converte o canvas para uma URL de dados
      const image = canvas.toDataURL('image/png');
      
      // Cria um elemento <a> para baixar a imagem
      const link = document.createElement('a');
      
      // Formata a data atual para o nome do arquivo
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const fileName = `dashboard_${dateStr}_${timeStr}.png`;
      
      link.download = fileName;
      link.href = image;
      link.click();
      
    } catch (error) {
      alert('Não foi possível capturar a tela. Por favor, tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Função para buscar dados da dashboard usando server actions
  const fetchDashboardData = useCallback(async () => {
    setDashboardData(prev => ({ ...prev, isLoading: true }));
    setIsRefreshing(true);
    
    try {
      // Formatar datas para API
      const formatDate = (date: Date | undefined) => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00:00Z`;
      };
      
      const from = formatDate(currentDateRange?.from);
      const to = formatDate(currentDateRange?.to);
      const dateRangeParam = from && to ? { from, to } : null;
      
      // Usar server action para buscar dados
      const result = await fetchDashboardDataAction(
        "Daily", // Usar diário como padrão
        dateRangeParam,
        undefined // Sem filtro por tipo de card
      );
      
      setDashboardData({ 
        data: result.data, 
        isLoading: false, 
        errors: result.errors 
      });
    } catch (error) {
      setDashboardData(prev => ({ 
        ...prev, 
        isLoading: false,
        errors: error instanceof Error ? error.message : 'Erro desconhecido' 
      }));
    } finally {
      setIsRefreshing(false);
      
      // Desabilitar botão por 2 segundos após refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
      }, 2000);
    }
  }, [currentDateRange]);
  
  // Buscar dados quando o componente montar ou quando a data mudar
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, currentDateRange]);
  
  const handleCardSelect = useCallback((cardType: CardType) => {
    setSelectedCard(cardType);
  }, []);
  
  const clearCardSelection = useCallback(() => {
    setSelectedCard(null);
  }, []);
  
  const selectedCardName = useMemo(() => {
    switch (selectedCard) {
      case 'leads': return 'Leads';
      case 'clients': return 'Clientes';
      case 'sessions': return 'Sessões';
      case 'conversions': return 'Conversões';
      default: return '';
    }
  }, [selectedCard]);
  
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);
  
  return (
    <div ref={dashboardRef}>
      <div className="mb-4 flex flex-col justify-between space-y-6 lg:flex-row lg:items-center lg:space-y-2">
        <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">Dashboard</h2>
        <div>
          <div className="flex items-center space-x-2">
            <DateFilterButton onChange={handleDateRangeChange} />
            <Button 
              size="sm" 
              variant="outline"
              className="gap-2"
              onClick={fetchDashboardData}
              disabled={isRefreshing || refreshTimeoutRef.current !== null}
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button 
              size="sm" 
              className="gap-2"
              onClick={captureScreenshot}
              disabled={isDownloading}
            >
              <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
              {isDownloading ? 'Gerando...' : 'Download'}
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="geral" value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="funis">Funis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="geral" className="space-y-4">
          <SummaryCards 
            onCardSelect={handleCardSelect} 
            selectedCard={selectedCard} 
            dateRange={currentDateRange}
            dashboardData={dashboardData}
          />
          
          <div className="mt-4">
            {selectedCard && (
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full h-3 w-3 mr-2" 
                       style={{ 
                         backgroundColor: selectedCard === 'leads' ? "#1F2937" : // Cinza escuro
                                          selectedCard === 'clients' ? "#4B5563" : // Cinza médio
                                          selectedCard === 'sessions' ? "#6B7280" : // Cinza medio-claro
                                          "#9CA3AF" // Cinza claro para conversions
                       }} />
                  <span className="text-sm font-medium">
                    Visualizando dados de: <strong>{selectedCardName}</strong>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCardSelection} 
                  className="text-xs"
                >
                  Limpar seleção
                </Button>
              </div>
            )}
            <VisualizationByPeriod 
              title={selectedCard ? selectedCardName : "Dados"} 
              dateRange={currentDateRange}
              selectedCard={selectedCard}
              dashboardData={dashboardData}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="funis" className="space-y-4">
          <div className="flex flex-col items-center justify-center p-8 rounded-md border border-dashed">
            <h3 className="text-xl font-semibold mb-2">Visualização de Funis</h3>
            <p className="text-gray-500 text-center mb-4">
              Esta visualização mostrará os funis de conversão do seu negócio.
            </p>
            <p className="text-sm text-muted-foreground">
              Em desenvolvimento. Disponível em breve.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}