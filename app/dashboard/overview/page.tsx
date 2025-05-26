'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, RefreshCw, TrendingUp, AlertCircle, Ban, GitBranch, Download, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addDays, format } from 'date-fns'
import { DateRange as ReactDayPickerRange } from 'react-day-picker'
import { API_BASE_URL } from '@/app/config/api'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DateFilterButton, DateRange } from '@/app/dashboard/date-filter-button'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ActiveFunnelDetails {
  funnel_id: number;
  funnel_name: string;
  conversion_rate: number;
  previous_rate?: number;
  growth?: number;
  is_increasing?: boolean;
}

interface ProfessionData {
  profession_id: number;
  profession_name: string;
  conversion_rate: number;
  previous_rate?: number;
  growth: number;
  is_increasing: boolean;
  is_active?: boolean;
  active_funnels?: ActiveFunnelDetails[];
}

interface FunnelStats {
  total_active_funnels: number;
  professions_with_funnels: number;
}

interface ApiResponse {
  data: {
    professions: Record<string, ProfessionData>;
    processing_time_ms: number;
    queries_executed: number;
    funnel_stats: FunnelStats;
  };
  meta: {
    currentPeriod: {
      from: string;
      to: string;
      timeFrom: string;
      timeTo: string;
    };
    previousPeriod: {
      from: string;
      to: string;
      timeFrom: string;
      timeTo: string;
    };
  };
}

export default function OverviewPage() {
  // Obtendo ferramentas de navegação
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Estado para o período de datas com horário - inicializado com o dia atual
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  
  const [professions, setProfessions] = useState<ProfessionData[]>([]);
  console.log(professions)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adicionar um estado para armazenar as estatísticas de funis
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({
    total_active_funnels: 0,
    professions_with_funnels: 0
  });

  // Função para definir a data atual na URL ao iniciar
  useEffect(() => {
    // Verificar se já existem parâmetros de data na URL
    const hasFromParam = searchParams.has('from');
    
    // Se não existirem, definir a data atual
    if (!hasFromParam) {
      const today = new Date();
      const params = new URLSearchParams(searchParams.toString());
      
      // Formatar a data atual no formato ISO
      const formattedDate = format(today, 'yyyy-MM-dd');
      params.set('from', formattedDate);
      params.set('to', formattedDate);
      
      // Atualizar a URL sem recarregar a página
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, []);

  // Função para lidar com mudanças no filtro de data
  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
  };
  
  // Função para buscar dados da API
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        // Format date in ISO 8601 format: YYYY-MM-DD
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        params.append('from', fromDate);
        
        // Add time as separate parameter if available
        if (dateRange.fromTime) {
          params.append('timeFrom', dateRange.fromTime);
        }
        
        if (dateRange.to) {
          // Format date in ISO 8601 format: YYYY-MM-DD
          const toDate = format(dateRange.to, 'yyyy-MM-dd');
          params.append('to', toDate);
          
          // Add time as separate parameter if available
          if (dateRange.toTime) {
            params.append('timeTo', dateRange.toTime);
          }
        }
      }
      
      const url = `${API_BASE_URL}/dashboard/profession-conversion?${params.toString()}`;
      console.log('Chamando API:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status} (${response.statusText})`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('Dados recebidos:', data);
      
      // Convertendo o objeto de profissões em um array
      if (data && data.data && data.data.professions) {
        const professionsArray = Object.values(data.data.professions)
          // Ordenar por taxa de conversão (decrescente) e depois por nome (crescente)
          .sort((a, b) => {
            if (b.conversion_rate === a.conversion_rate) {
              return a.profession_name.localeCompare(b.profession_name);
            }
            return b.conversion_rate - a.conversion_rate;
          })
          // Remover a profissão "Unknown" e "Global" se não houver dados
          .filter(p => p.profession_name !== "Unknown" || p.conversion_rate > 0)
          // Garantir que a propriedade is_active esteja presente, defaultando para true se não definida
          .map(p => ({
            ...p,
            is_active: p.is_active !== undefined ? p.is_active : true,
            active_funnels: p.active_funnels || []
          }));
        
        setProfessions(professionsArray);
        
        // Atualizar as estatísticas de funis
        if (data.data.funnel_stats) {
          setFunnelStats({
            total_active_funnels: data.data.funnel_stats.total_active_funnels || 0,
            professions_with_funnels: data.data.funnel_stats.professions_with_funnels || 0
          });
        }
      } else {
        console.error('Estrutura de dados inválida:', data);
        setError('A API retornou dados em formato inválido');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Buscar dados quando o componente montar ou quando as datas mudarem
  useEffect(() => {
    fetchData();
  }, [dateRange]);
  
  // Garantir carregamento inicial mesmo se dateRange não mudar
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader pageTitle="Conversão da Captação" />
        
        <div className="flex items-center gap-2">
          <DateFilterButton 
            onChange={handleDateChange} 
          />
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10"
                  onClick={async () => {
                    try {
                      // Capturar a área principal do dashboard
                      const element = document.querySelector('.container') as HTMLElement;
                      if (!element) return;
                      
                      const canvas = await html2canvas(element, {
                        backgroundColor: '#ffffff',
                        scale: 2, // Maior qualidade
                        useCORS: true,
                        allowTaint: true,
                        height: element.scrollHeight,
                        width: element.scrollWidth,
                        scrollX: 0,
                        scrollY: 0
                      });
                      
                      // Criar link para download
                      const link = document.createElement('a');
                      link.download = `dashboard_conversao_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.png`;
                      link.href = canvas.toDataURL('image/png');
                      link.click();
                    } catch (error) {
                      console.error('Erro ao capturar screenshot:', error);
                    }
                  }}
                  disabled={isLoading || professions.length === 0}
                  title="Capturar screenshot da tela"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-100 border-gray-200 text-gray-800">
                <p>Capturar screenshot da tela</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Overview Section */}
      <div className="space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="p-4 mb-4 text-sm rounded-md bg-red-50 text-red-500 border border-red-200">
              {error}
            </div>
          )}
          
          {/* Status summary */}
          {!isLoading && professions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Resumo</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex gap-4">
                  <Card className="flex-1 border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Profissões ativas</h3>
                          <p className="text-2xl font-bold text-black">
                            {professions.filter(p => p.is_active !== false).length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Profissões inativas</h3>
                          <p className="text-2xl font-bold text-black">
                            {professions.filter(p => p.is_active === false).length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Funis ativos</h3>
                          <p className="text-2xl font-bold text-black">
                            {funnelStats.total_active_funnels}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <GitBranch className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1 border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Total de profissões</h3>
                          <p className="text-2xl font-bold text-black">
                            {professions.length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-500 font-bold">Σ</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Profissões</h2>
          
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col animate-pulse">
                        <div className="p-4 border-b">
                          <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="mt-2 flex justify-end">
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                        <div className="h-1 w-full bg-gray-100">
                          <div className="h-full bg-gray-300 w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TooltipProvider>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {professions.length === 0 && !isLoading ? (
                    <div className="col-span-full p-4 text-center text-gray-500 border rounded-md">
                      Nenhum dado de conversão encontrado para o período selecionado
                    </div>
                  ) : (
                    professions.map((profession) => (
                      <Card 
                        key={profession.profession_id} 
                        className={`overflow-hidden ${profession.is_active === false ? 'bg-gray-50' : 'hover:bg-muted'} cursor-pointer transition-all relative`}
                      >
                        {profession.is_active === false && (
                          <div className="absolute top-2 right-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200">
                                    <Ban className="h-4 w-4 text-gray-500" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-100 border-gray-200 text-gray-800">
                                  <p>Esta profissão está desativada no sistema</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="font-medium text-sm line-clamp-1">
                            {profession.profession_name}
                            {profession.is_active === false && (
                              <span className="ml-1 text-xs text-gray-500">(Desativada)</span>
                            )}
                          </CardTitle>
                          {profession.active_funnels && profession.active_funnels.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                                  <GitBranch className="h-4 w-4 text-gray-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-100 border-gray-200 text-gray-800 max-w-xs p-2">
                                <div className="font-semibold mb-1">Funis ativos ({profession.active_funnels.length})</div>
                                <ul className="text-xs space-y-1">
                                  {profession.active_funnels.map(funnel => (
                                    <li key={funnel.funnel_id} className="flex justify-between">
                                      <span>{funnel.funnel_name}</span>
                                      <span className="font-medium">
                                        {funnel.conversion_rate.toFixed(1).replace('.', ',')}%
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-1 pt-0">
                          <div className="text-3xl font-bold text-black">
                            {profession.conversion_rate.toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            {profession.growth === 0 ? (
                              <span>Sem alteração</span>
                            ) : (
                              <span className={profession.is_increasing ? "text-green-600" : "text-red-600"}>
                                {profession.is_increasing ? (
                                  <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                                ) : (
                                  <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                                )}
                                {Math.abs(profession.growth).toFixed(2).replace('.', ',')}% de {profession.is_increasing ? 'crescimento' : 'queda'} sobre os {profession.previous_rate?.toFixed(1).replace('.', ',') || '0,0'}% anteriores
                              </span>
                            )}
                          </div>

                          {profession.is_active === false && (
                            <div className="mt-3 text-xs flex items-center text-gray-500">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center cursor-help">
                                      <Ban className="h-3 w-3 mr-1 inline" />
                                      Profissão desativada
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-100 border-gray-200 text-gray-800 max-w-xs p-2">
                                    <div className="text-xs">
                                      <p className="font-semibold mb-1">Profissão Desativada</p>
                                      <p className="mb-1">Esta profissão não está disponível para captação no momento.</p>
                                      {profession.previous_rate !== undefined && profession.previous_rate > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <p className="font-medium">Últimos dados disponíveis:</p>
                                          <div className="flex justify-between mt-1">
                                            <span>Taxa anterior:</span>
                                            <span className="font-medium">{profession.previous_rate.toFixed(1).replace('.', ',')}%</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Variação:</span>
                                            <span className={profession.is_increasing ? "text-green-600" : "text-red-600"}>
                                              {profession.is_increasing ? "+" : ""}{profession.growth.toFixed(2).replace('.', ',')}%
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                          
                          {profession.active_funnels && profession.active_funnels.length > 0 && (
                            <div className="mt-3 border-t border-gray-100 pt-2">
                              <div className="flex items-center gap-1 mb-1.5">
                                <div className={`h-2 w-2 rounded-full ${profession.is_increasing ? "bg-green-500" : "bg-red-500"}`}></div>
                                <span className="text-xs font-medium text-gray-700">
                                  {profession.active_funnels.length} {profession.active_funnels.length === 1 ? 'funil ativo' : 'funis ativos'}
                                </span>
                              </div>
                              
                              <div className="text-xs space-y-2">
                                <div className="flex justify-between text-gray-800">
                                  <span>Taxa atual:</span>
                                  <span className={`font-medium ${profession.is_increasing ? "text-green-700" : "text-red-700"}`}>
                                    {profession.conversion_rate.toFixed(1).replace('.', ',')}%
                                  </span>
                                </div>
                                
                                {profession.previous_rate !== undefined && profession.previous_rate > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Taxa anterior:</span>
                                    <div>
                                      <span className="text-gray-700">{profession.previous_rate.toFixed(1).replace('.', ',')}%</span>
                                      <span className={`ml-1 ${profession.is_increasing ? "text-green-600" : "text-red-600"}`}>
                                        ({profession.is_increasing ? "+" : ""}{profession.growth.toFixed(1).replace('.', ',')}%)
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {profession.active_funnels.map(funnel => (
                                  <div key={funnel.funnel_id} className={`flex justify-between items-center py-1 px-2 rounded ${profession.is_increasing ? "bg-green-50" : "bg-red-50"}`}>
                                    <span className="text-gray-700 font-medium truncate max-w-[70%]">{funnel.funnel_name}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full ${profession.is_increasing ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} font-medium`}>
                                      {funnel.conversion_rate.toFixed(1).replace('.', ',')}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 