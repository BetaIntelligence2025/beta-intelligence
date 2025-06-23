"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DateFilterButton, DateRange } from '../date-filter-button';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import AnalyticsSummaryCards, { AnalyticsCardType } from './analytics-summary-cards';  
import AnalyticsVisualization from './analytics-visualization';
import AnalyticsChart from './analytics-chart';
import { CardType } from '@/components/dashboard/summary-cards';

// Interfaces
interface Profession {
  profession_id: string;
  profession_name: string;
}

interface DateRangeWithString {
  from: string;
  to: string;
  time_from?: string | null | undefined;
  time_to?: string | null | undefined;
}

interface AnalyticsData {
  overall_leads: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_purchases: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_cpl: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_investment: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_revenue: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_roas: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_roi?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_ctr?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_cpc?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  meta_available?: boolean;
  profession_data?: Array<{
    profession_id: string;
    profession_name: string;
    cpl: number;
    investment: number;
    revenue: number;
    roas: number;
    leads: number;
    purchases: number;
    previous_cpl?: number;
    previous_investment?: number;
    previous_revenue?: number;
    previous_roas?: number;
    previous_leads?: number;
    previous_purchases?: number;
    growth_cpl?: number;
    growth_investment?: number;
    growth_revenue?: number;
    growth_roas?: number;
    growth_leads?: number;
    growth_purchases?: number;
    is_increasing_cpl?: boolean;
    is_increasing_investment?: boolean;
    is_increasing_revenue?: boolean;
    is_increasing_roas?: boolean;
    is_increasing_leads?: boolean;
    is_increasing_purchases?: boolean;
  }>;
}

export default function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get active tab from URL or default to "geral"
  const urlTab = searchParams.get('tab') || 'geral';
  const [activeTab, setActiveTab] = useState(urlTab);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedCard, setSelectedCard] = useState<AnalyticsCardType>(null);
  
  // Profession states
  const [selectedProfession, setSelectedProfession] = useState<string | null>(searchParams.get('profession_id') || null);
  
  // Fetch professions data
  const { data: professions = [] } = useQuery({
    queryKey: ['professions'],
    queryFn: async () => {
      const response = await fetch('/api/professions');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Parse date range from search params
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
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    
    // Reset profession selection if going to geral tab
    if (value === 'geral') {
      params.delete('profession_id');
      setSelectedProfession(null);
    } else if (value === 'profissoes' && !selectedProfession) {
      // Se mudou para profissões mas não tem profissão selecionada, limpar dados
      setAnalyticsData(null);
    }
    
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  
  // Handle profession selection
  const handleProfessionChange = (value: string) => {
    setSelectedProfession(value);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('profession_id', value);
    
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  
  // Handle card selection for chart filtering
  const handleCardSelect = (cardType: AnalyticsCardType) => {
    setSelectedCard(cardType === selectedCard ? null : cardType);
  };
  
  // Sync state with URL
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    
    const professionId = searchParams.get('profession_id');
    const professionIdString = professionId ? String(professionId) : null;
    
    if (professionIdString !== selectedProfession) {
      setSelectedProfession(professionIdString);
    }
  }, [urlTab, searchParams, activeTab, selectedProfession]);
  
  // Initialize date params if they don't exist
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (!fromParam || !toParam) {
      const today = new Date();
      const brazilDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      
      const year = brazilDate.getFullYear();
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0');
      const day = String(brazilDate.getDate()).padStart(2, '0');
      
      const fromDate = `${year}-${month}-${day}T00:00:00-03:00`;
      const toDate = `${year}-${month}-${day}T23:59:59-03:00`;
      
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', fromDate);
      params.set('to', toDate);
      
        router.replace(`/dashboard/analytics?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);
  
  // Refresh data function
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add date parameters
      if (dateRange) {
        const fromDate = dateRange.from.split('T')[0];
        const toDate = dateRange.to.split('T')[0];
        
        params.set('from', fromDate);
        params.set('to', toDate);
        
        if (dateRange.time_from) params.set('time_from', dateRange.time_from);
        if (dateRange.time_to) params.set('time_to', dateRange.time_to);
      } else {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        params.set('from', formattedDate);
        params.set('to', formattedDate);
      }
      
      // Add profession filter if selected
      if (activeTab === 'profissoes' && selectedProfession) {
        params.set('profession_id', selectedProfession);
      }
      
      const response = await fetch(`/api/dashboard/analytics?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        if (response.status === 503) {
          console.warn('Nenhum dado real encontrado para o período selecionado');
          setAnalyticsData(null);
          return;
        }
        const errorText = await response.text();
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data) {
        console.warn('Nenhum dado de analytics disponível');
        setAnalyticsData(null);
        return;
      }
      
      setAnalyticsData(responseData.data);
    } catch (error) {
      console.error('Erro ao carregar dados de analytics:', error);
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, activeTab, selectedProfession]);
  
  // Download dashboard as image
  const downloadDashboard = async () => {
    const dashboardElement = document.getElementById('analytics-dashboard-container');
    if (!dashboardElement) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      link.href = imgData;
      link.download = `analytics_dashboard_${dataFormatada}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao gerar screenshot:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  console.log(analyticsData);
  
  // Load initial data - executa quando necessário
  useEffect(() => {
    if (dateRange && !isLoading) {
      refreshData();
    }
  }, [dateRange, activeTab, selectedProfession, refreshData]);
  
  return (
    <div id="analytics-dashboard-container" className="flex flex-col gap-4 p-4 md:p-8 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics Avançado</h1>
          <p className="text-gray-500 text-sm">Métricas detalhadas de performance e conversão</p>
        </div>
        
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="border shadow-sm rounded-lg">
          <TabsTrigger value="geral" className="px-4 py-1 text-sm">Dados Gerais</TabsTrigger>
          <TabsTrigger value="profissoes" className="px-4 py-1 text-sm">Por Profissão</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className={isLoading ? "opacity-60 pointer-events-none" : ""}>
          <div className="space-y-6">
            {/* Summary Cards */}
            <AnalyticsSummaryCards 
              analyticsData={analyticsData}
              isLoading={isLoading}
              viewType="geral"
              onCardSelect={handleCardSelect}
              selectedCard={selectedCard}
            />
            
            {/* Visualization */}
            <AnalyticsVisualization 
              analyticsData={analyticsData}
              isLoading={isLoading}
              viewType="geral"
              selectedProfession={null}
            />
            
            {/* Chart */}
            <AnalyticsChart
              analyticsData={analyticsData}
              isLoading={isLoading}
              viewType="geral"
              dateRange={dateRange}
              selectedCard={selectedCard}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="profissoes" className={isLoading ? "opacity-60 pointer-events-none" : ""}>
          <div className="space-y-6">
            {/* Profession Selector */}
            <div className="flex items-center justify-end gap-2">
              <Select 
                value={selectedProfession || ""}
                onValueChange={handleProfessionChange}
                disabled={isLoading || !professions || professions.length === 0}
              >
                <SelectTrigger className="w-[250px] h-9">
                  <SelectValue placeholder="Selecione uma profissão" />
                </SelectTrigger>
                <SelectContent>
                  {professions && Array.isArray(professions) && professions.map((profession: any) => {
                    if (!profession || !profession.profession_id) return null;
                    const professionId = String(profession.profession_id);
                    return (
                      <SelectItem 
                        key={professionId} 
                        value={professionId}
                      >
                        {profession.profession_name || `Profissão ${professionId}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Chart - Específico da profissão selecionada */}
            {selectedProfession && (
              <AnalyticsChart
                analyticsData={analyticsData}
                isLoading={isLoading}
                viewType="profissoes"
                selectedProfession={selectedProfession}
                dateRange={dateRange}
                selectedCard={selectedCard}
              />
            )}
            
            {/* Summary Cards */}
            <AnalyticsSummaryCards 
              analyticsData={analyticsData}
              isLoading={isLoading}
              viewType="profissoes"
              selectedProfession={selectedProfession}
              onCardSelect={handleCardSelect}
              selectedCard={selectedCard}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 