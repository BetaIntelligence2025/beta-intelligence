'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addDays, format } from 'date-fns'
import { DatePickerWithRange } from '@/components/date-range-picker'
import { DateRange } from 'react-day-picker'

interface ProfessionData {
  profession_id: number;
  profession_name: string;
  conversion_rate: number;
  growth: number;
  is_increasing: boolean;
}

interface ApiResponse {
  data: {
    professions: Record<string, ProfessionData>;
    processing_time_ms: number;
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
  // Estado para o período de datas
  const [date, setDate] = useState({
    from: new Date(),
    to: new Date(),
  })
  
  const [professions, setProfessions] = useState<ProfessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapper function to adapt the DateRange to our state type
  const handleDateChange = (newDate: DateRange | undefined) => {
    if (newDate?.from) {
      setDate({
        from: newDate.from,
        to: newDate.to || newDate.from,
      });
    }
  };
  
  // Função para buscar dados da API
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (date.from) {
        params.append('from', format(date.from, 'yyyy-MM-dd'));
      }
      
      if (date.to) {
        params.append('to', format(date.to, 'yyyy-MM-dd'));
      }
      
      const url = `http://localhost:8080/dashboard/profession-conversion?${params.toString()}`;
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
          .filter(p => p.profession_name !== "Unknown" || p.conversion_rate > 0);
        
        setProfessions(professionsArray);
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
  }, [date.from, date.to]);

  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader pageTitle="Conversão da Captação" />
        
        <div className="flex items-center gap-2">
          <DatePickerWithRange
            date={date} 
            setDate={handleDateChange} 
            className="w-[280px]"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {professions.length === 0 && !isLoading ? (
                <div className="col-span-full p-4 text-center text-gray-500 border rounded-md">
                  Nenhum dado de conversão encontrado para o período selecionado
                </div>
              ) : (
                professions.map((profession) => (
                  <Card key={profession.profession_id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col">
                        <div className="p-4 border-b">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium mb-1 line-clamp-1">{profession.profession_name}</p>
                              <div 
                                className={`text-xs flex items-center ${
                                  profession.is_increasing
                                    ? 'text-green-600' 
                                    : (profession.growth === 0 ? 'text-gray-500' : 'text-red-600')
                                }`}
                              >
                                {profession.growth === 0 ? (
                                  <span>Sem alteração</span>
                                ) : (
                                  <>
                                    {profession.is_increasing ? (
                                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ArrowDownIcon className="h-3 w-3 mr-1" />
                                    )}
                                    {Math.abs(profession.growth).toFixed(2)}% de crescimento
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-3xl font-bold">{profession.conversion_rate.toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 