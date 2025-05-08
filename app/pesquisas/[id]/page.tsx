'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Loader2, ArrowLeft, Calendar, Filter, X } from "lucide-react"
import { DateFilter } from "@/app/events/date-filter"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Definir os tipos de dados para questões e respostas conforme documentação da API
interface SurveyResponse {
  resposta_id?: string // Campo opcional mantido para compatibilidade
  texto_opcao: string
  score_peso: number
  num_respostas: number
  percentual_participacao: number
  num_vendas: number
  taxa_conversao_percentual: number
  percentual_vendas: number
}

interface SurveyQuestion {
  pergunta_id: string
  texto_pergunta: string
  profissao: string
  respostas: SurveyResponse[]
}

// Interface para os filtros de data
interface DateRangeFilters {
  data_inicio?: string
  data_fim?: string
  pesquisa_inicio?: string
  pesquisa_fim?: string
  venda_inicio?: string
  venda_fim?: string
}

// Interface para armazenar datas por tipo de filtro
interface FilterDateRange {
  from?: Date
  to?: Date
  fromTime?: string
  toTime?: string
}

// Tipos de filtro
type FilterType = 'data' | 'pesquisa' | 'venda'

export default function SurveyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Extrair o ID da URL e garantir que seja uma string válida
  // Este ID é o survey_id na API, conforme documentação
  const surveyId = Array.isArray(params.id) 
    ? params.id[0] 
    : typeof params.id === 'string'
      ? params.id
      : '';
  
  console.log('survey_id obtido da URL:', surveyId);
  
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [surveyName, setSurveyName] = useState("Detalhes da Pesquisa")
  const [surveyInfo, setSurveyInfo] = useState<{
    profissao?: string;
    funil?: string;
  }>({});
  
  // Estados para filtros
  const [currentEditingFilter, setCurrentEditingFilter] = useState<FilterType | null>(null)
  const [tempDateRange, setTempDateRange] = useState<FilterDateRange | undefined>()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<{
    data?: FilterDateRange
    pesquisa?: FilterDateRange
    venda?: FilterDateRange
  }>({})

  // Inicializar filtros com valores da URL
  useEffect(() => {
    const newActiveFilters: typeof activeFilters = {}
    
    // Buscar parâmetros para cada tipo de filtro
    const filterTypes: FilterType[] = ['data', 'pesquisa', 'venda']
    
    filterTypes.forEach((type) => {
      const fromKey = type === 'data' ? 'data_inicio' : `${type}_inicio`
      const toKey = type === 'data' ? 'data_fim' : `${type}_fim`
      
      const from = searchParams.get(fromKey)
      const to = searchParams.get(toKey)
      
      if (from) {
        newActiveFilters[type] = {
          from: new Date(from),
          to: to ? new Date(to) : undefined
        }
      }
    })
    
    setActiveFilters(newActiveFilters)
  }, [searchParams])

  // Função para atualizar a URL
  const updateUrl = (filters: DateRangeFilters) => {
    const current = new URLSearchParams(searchParams.toString())
    
    // Remover filtros existentes
    Object.keys(filters).forEach(key => {
      current.delete(key)
    })
    
    // Adicionar novos filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        current.set(key, value)
      }
    })
    
    const url = `${window.location.pathname}?${current.toString()}`
    router.push(url)
  }

  // Formatação de data para exibição
  const formatDateForDisplay = (dateRange?: FilterDateRange): string => {
    if (!dateRange?.from) return ''
    
    let formattedDate = format(dateRange.from, "dd/MM/yy", { locale: ptBR })
    if (dateRange.to) {
      formattedDate += ` - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`
    }
    
    return formattedDate
  }

  // Tradução de tipos de filtro
  const filterTypeNames: Record<FilterType, string> = {
    data: 'Geral',
    pesquisa: 'Pesquisa',
    venda: 'Vendas'
  }

  // Handler para limpar todos os filtros
  const handleClearFilters = () => {
    setActiveFilters({})
    
    // Criar nova URL sem parâmetros de filtro
    const current = new URLSearchParams(searchParams.toString())
    
    // Remover todos os filtros de data
    const filterParams = [
      'data_inicio', 'data_fim', 
      'pesquisa_inicio', 'pesquisa_fim', 
      'venda_inicio', 'venda_fim'
    ]
    
    filterParams.forEach(param => {
      current.delete(param)
    })
    
    const url = `${window.location.pathname}?${current.toString()}`
    router.push(url)
  }

  // Handler para remover um filtro específico
  const removeFilter = (type: FilterType) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[type]
      return newFilters
    })
    
    // Atualizar URL removendo os parâmetros do filtro
    const current = new URLSearchParams(searchParams.toString())
    
    if (type === 'data') {
      current.delete('data_inicio')
      current.delete('data_fim')
    } else {
      current.delete(`${type}_inicio`)
      current.delete(`${type}_fim`)
    }
    
    const url = `${window.location.pathname}?${current.toString()}`
    router.push(url)
  }

  // Handler para abrir modal de data para um tipo específico
  const openDateFilterForType = (type: FilterType) => {
    setCurrentEditingFilter(type)
    setTempDateRange(activeFilters[type] || undefined)
  }

  // Handler para atualização de filtros de data
  const handleDateChange = (date: FilterDateRange) => {
    if (!currentEditingFilter) return
    
    setTempDateRange(date)
  }

  // Adicionar função de formatação de data com timezone de Brasília
  const formatDateWithBrasiliaTimezone = (date: Date): string => {
    if (!date) return ''
    const isoDate = date.toISOString()
    return isoDate.replace('Z', '-03:00')
  }

  // Handler para aplicar o filtro de data temporário
  const applyCurrentFilter = () => {
    if (!currentEditingFilter) return
    
    setActiveFilters(prev => ({
      ...prev,
      [currentEditingFilter]: tempDateRange
    }))
    
    // Criar objeto de filtros para atualizar a URL
    const filters: DateRangeFilters = {}
    
    // Definir os nomes dos parâmetros baseados no tipo de filtro
    let fromParam: keyof DateRangeFilters
    let toParam: keyof DateRangeFilters
    
    if (currentEditingFilter === 'data') {
      fromParam = 'data_inicio'
      toParam = 'data_fim'
    } else if (currentEditingFilter === 'pesquisa') {
      fromParam = 'pesquisa_inicio'
      toParam = 'pesquisa_fim'
    } else {
      fromParam = 'venda_inicio'
      toParam = 'venda_fim'
    }
    
    // Atualizar filtros para o tipo atual com formato correto para a API
    if (tempDateRange?.from) {
      // Usar formato ISO8601 com timezone de Brasília
      const formattedDate = formatDateWithBrasiliaTimezone(tempDateRange.from)
      filters[fromParam] = formattedDate
    }
    
    if (tempDateRange?.to) {
      // Usar formato ISO8601 com timezone de Brasília e configurar para final do dia
      const toDate = new Date(tempDateRange.to)
      toDate.setHours(23, 59, 59, 999)
      const formattedDate = formatDateWithBrasiliaTimezone(toDate)
      filters[toParam] = formattedDate
    }
    
    // Atualizar URL com os novos filtros
    updateUrl(filters)
    
    // Fechar modal após aplicar
    setCurrentEditingFilter(null)
    setTempDateRange(undefined)
  }

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.keys(activeFilters).length > 0
  
  // Obter o total de filtros ativos
  const getActiveFiltersCount = (): number => {
    return Object.keys(activeFilters).length
  }

  // Buscar os detalhes da pesquisa quando o componente montar
  useEffect(() => {
    if (!surveyId) {
      console.error('ID da pesquisa não encontrado');
      setError('ID da pesquisa não encontrado');
      setLoading(false);
      return;
    }
    
    const fetchSurveyDetails = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log(`Iniciando busca de dados para pesquisa com ID: ${surveyId}`);
        
        // Analisar o ID para ver se ele é ou contém um formato numérico
        let idForApi = surveyId;
        if (!/^\d+$/.test(surveyId)) {
          // Tentar extrair um ID numérico se estiver no formato profissao_pesquisa_0001
          const matches = surveyId.match(/(\d+)$/);
          if (matches && matches[1]) {
            idForApi = matches[1];
            console.log(`ID provavelmente gerado a partir do nome. Extraindo componente numérico: ${idForApi}`);
          }
          
          // Tentar extrair informações da pesquisa do próprio ID
          const idParts = surveyId.split('_');
          if (idParts.length >= 2) {
            const possibleProfissao = idParts[0]?.charAt(0).toUpperCase() + idParts[0]?.slice(1);
            const possibleFunil = idParts.length > 2 ? idParts[1]?.charAt(0).toUpperCase() + idParts[1]?.slice(1) : '';
            
            if (possibleProfissao) {
              setSurveyInfo({
                profissao: possibleProfissao,
                funil: possibleFunil || 'Padrão'
              });
            }
          }
        }
        
        // Construir URL com filtros e parâmetros
        const apiParams = new URLSearchParams();
        
        // Adicionar todos os parâmetros de busca da URL atual
        searchParams.forEach((value, key) => {
          if (value.trim() !== '') {
            apiParams.append(key, value);
          }
        });
        
        // Construir URL para o endpoint /api/pesquisas/:id conforme padrão da documentação
        // Mantemos o ID original na URL pois o backend já implementa a lógica de extração de IDs numéricos
        const apiUrl = `/api/pesquisas/${surveyId}${apiParams.toString() ? `?${apiParams.toString()}` : ''}`;
        
        console.log(`Chamando API para detalhes: ${apiUrl} (ID numérico extraído: ${idForApi !== surveyId ? idForApi : 'nenhum'})`)
        
        // Fazer a requisição para a API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Erro na resposta da API: ${response.status}`, errorData);
          
          if (response.status === 404) {
            throw new Error(`Pesquisa com ID ${surveyId} não encontrada.`);
          } else {
            throw new Error(`Falha ao buscar detalhes: ${response.status} - ${errorData.error || 'Erro desconhecido'}`);
          }
        }
        
        const data = await response.json();
        console.log(`Dados recebidos: ${Array.isArray(data) ? data.length : 0} questões`);
        
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data)
          setSelectedQuestionId(data[0].pergunta_id)
          
          // Extrair informações da primeira questão para o título
          if (data[0]) {
            // Obter profissão diretamente da resposta
            const profissao = data[0].profissao;
            
            // Tentar extrair funil do surveyId se estiver em formato como "advogado_vendas_0001"
            let funil = '';
            const idParts = surveyId.split('_');
            if (idParts.length > 1) {
              // O segundo elemento geralmente é o funil (advogado_vendas_0001)
              funil = idParts[1]?.charAt(0).toUpperCase() + idParts[1]?.slice(1);
            }
            
            // Atualizar informações da pesquisa
            setSurveyInfo({
              profissao,
              funil
            });
            
            // Construir nome da pesquisa com profissão e funil (se disponíveis)
            let surveyTitle = "Detalhes da Pesquisa";
            if (profissao) {
              surveyTitle = `${profissao}`;
              if (funil) {
                surveyTitle += ` - ${funil}`;
              }
            }
            
            setSurveyName(surveyTitle);
          }
        } else {
          setQuestions([])
          setError('Nenhuma questão encontrada para esta pesquisa')
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da pesquisa:', err)
        setError(err.message || 'Erro ao carregar os detalhes da pesquisa')
      } finally {
        setLoading(false)
      }
    }
    
    fetchSurveyDetails()
  }, [surveyId, searchParams])
  
  // Voltar para a lista de pesquisas
  const handleBack = () => {
    router.back()
  }

  // Encontrar a questão selecionada
  const selectedQuestion = questions.find(q => q.pergunta_id === selectedQuestionId)

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center text-sm text-gray-500 mb-1">
          <button 
            onClick={handleBack}
            className="hover:text-gray-700 flex items-center"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Voltar para pesquisas
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{surveyInfo.profissao || 'Pesquisa'}</span>
          {surveyInfo.funil && (
            <>
              <span className="mx-2">/</span>
              <span className="text-gray-700">{surveyInfo.funil}</span>
            </>
          )}
        </div>
        
        <PageHeader pageTitle={surveyName} />
        
        {surveyInfo.profissao && surveyInfo.funil && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <div className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200">
              {surveyInfo.profissao}
            </div>
            <div className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
              {surveyInfo.funil}
            </div>
          </div>
        )}
      </div>
      
      {/* Área de filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Filtro principal */}
        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
            >
              <Filter className="h-3.5 w-3.5 mr-2" />
              <span className="text-sm">Filtros {getActiveFiltersCount() > 0 ? `(${getActiveFiltersCount()})` : ''}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]" align="start" sideOffset={5}>
            <div className="p-3">
              <h4 className="font-medium mb-2">Filtros de data</h4>
              <div className="space-y-3">
                <div 
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDateFilterForType('data')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-sm">Período Geral</span>
                  </div>
                  {activeFilters.data ? (
                    <span className="text-xs text-blue-600">
                      {formatDateForDisplay(activeFilters.data)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Selecionar</span>
                  )}
                </div>
                
                <div 
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDateFilterForType('pesquisa')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-sm">Período de Respostas</span>
                  </div>
                  {activeFilters.pesquisa ? (
                    <span className="text-xs text-blue-600">
                      {formatDateForDisplay(activeFilters.pesquisa)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Selecionar</span>
                  )}
                </div>
                
                <div 
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDateFilterForType('venda')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-sm">Período de Vendas</span>
                  </div>
                  {activeFilters.venda ? (
                    <span className="text-xs text-blue-600">
                      {formatDateForDisplay(activeFilters.venda)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Selecionar</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 pt-0 border-t mt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  handleClearFilters()
                  setIsFiltersOpen(false)
                }}
                className="text-sm"
                disabled={!hasActiveFilters}
              >
                Limpar filtros
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsFiltersOpen(false)}
                className="text-sm"
              >
                Fechar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Indicador de filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(activeFilters).map(([type, dateRange]) => (
              <div 
                key={type}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs text-blue-700">
                  {filterTypeNames[type as FilterType]}: {formatDateForDisplay(dateRange)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 text-blue-700 hover:bg-blue-100"
                  onClick={() => removeFilter(type as FilterType)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Botão limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 flex items-center"
            onClick={handleClearFilters}
            title="Limpar todos os filtros"
          >
            <X className="h-4 w-4 mr-1" />
            <span className="text-sm">Limpar filtros</span>
          </Button>
        )}
      </div>
      
      {/* Modal de filtro de data */}
      {currentEditingFilter && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 w-[320px] max-w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Filtrar período: {filterTypeNames[currentEditingFilter]}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentEditingFilter(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <DateFilter 
                onChange={handleDateChange} 
                initialDate={tempDateRange} 
                preventAutoSelect={true}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentEditingFilter(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={applyCurrentFilter}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          Nenhum dado disponível para esta pesquisa
        </div>
      ) : (
        <>
          {/* Navegação das questões - Estilo melhorado */}
          <div className="w-full mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Perguntas da Pesquisa</h3>
              <div className="text-sm text-gray-500">
                {questions.length} {questions.length === 1 ? 'questão' : 'questões'} disponíveis
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border">
              <div className="flex flex-wrap gap-2">
                {questions.map((question) => (
                  <button
                    key={question.pergunta_id}
                    onClick={() => setSelectedQuestionId(question.pergunta_id)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 
                      ${selectedQuestionId === question.pergunta_id 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {question.texto_pergunta}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conteúdo da pergunta selecionada */}
          {questions.map((question) => (
            question.pergunta_id === selectedQuestionId && (
              <div key={question.pergunta_id} className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {question.texto_pergunta}
                    </h2>
                    {question.profissao && (
                      <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 inline-flex items-center">
                        <span className="font-medium mr-1">Profissão:</span> {question.profissao}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-center font-semibold">Score</th>
                        <th className="px-4 py-3 text-left font-semibold">Opção de Resposta</th>
                        <th className="px-4 py-3 text-center font-semibold">Nº de Respostas</th>
                        <th className="px-4 py-3 text-center font-semibold">Participação</th>
                        <th className="px-4 py-3 text-center font-semibold">Nº de Vendas</th>
                        <th className="px-4 py-3 text-center font-semibold">Conversão</th>
                        <th className="px-4 py-3 text-center font-semibold">% das Vendas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {question.respostas.map((resposta, index) => (
                        <tr 
                          key={resposta.resposta_id || index} 
                          className={`hover:bg-gray-50 ${index === 0 ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                        >
                          <td className="px-4 py-3 text-center font-medium">{resposta.score_peso}</td>
                          <td className="px-4 py-3">{resposta.texto_opcao}</td>
                          <td className="px-4 py-3 text-center">{resposta.num_respostas.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">{resposta.percentual_participacao.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-center">{resposta.num_vendas.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">{resposta.taxa_conversao_percentual.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-center">{resposta.percentual_vendas.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </>
      )}
    </div>
  )
} 