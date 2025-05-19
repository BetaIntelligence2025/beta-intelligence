'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Loader2, ArrowLeft } from "lucide-react"
import { formatISOWithBrazilTimezoneAndCorrectTime } from "@/app/lib/webinar-utils"

// Definir os tipos de dados para questões e respostas conforme documentação da API
interface SurveyResponse {
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
  respostas: SurveyResponse[]
}

interface Survey {
  pesquisa_id: number
  nome_pesquisa: string
  profissao: string
  funil: string
  total_leads: number
  total_respostas: number
  total_vendas: number
  taxa_resposta_percentual: number
  taxa_conversao_percentual: number
  tempo_medio_resposta: number
  tempo_medio_resposta_por_usuario: number
  questoes: SurveyQuestion[]
}

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
  const [surveyData, setSurveyData] = useState<Survey | null>(null)

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
            // Tratamento especial para venda_inicio
            if (key === 'venda_inicio') {
              try {
                const vendaInicioDate = new Date(value);
                
                // Verificar se é terça-feira (dia 2)
                if (vendaInicioDate.getDay() !== 2) {
                  console.log(`Data de venda_inicio não é terça-feira (${vendaInicioDate.getDay()}), ajustando para próxima terça`);
                  // Encontrar próxima terça
                  while (vendaInicioDate.getDay() !== 2) {
                    vendaInicioDate.setDate(vendaInicioDate.getDate() + 1);
                  }
                }
                
                // Formatar com a função dedicada
                const formattedDate = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
                console.log(`Formatando venda_inicio para API: ${formattedDate} (original: ${value})`);
                
                apiParams.append(key, formattedDate);
              } catch (error) {
                console.error('Erro ao formatar venda_inicio:', error);
                apiParams.append(key, value); // Fallback para valor original
              }
            } else {
              apiParams.append(key, value);
            }
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
        
        // API agora retorna um array com um objeto de pesquisa completo
        if (Array.isArray(data) && data.length > 0) {
          const survey = data[0] as Survey;
          console.log(`Dados recebidos: pesquisa "${survey.nome_pesquisa}" com ${survey.questoes?.length || 0} questões`);
          
          // Salvar o objeto de pesquisa completo
          setSurveyData(survey);
          
          // Extrair as questões da pesquisa
          if (Array.isArray(survey.questoes) && survey.questoes.length > 0) {
            setQuestions(survey.questoes);
            setSelectedQuestionId(survey.questoes[0].pergunta_id);
            
            // Atualizar informações da pesquisa a partir do objeto recebido
            setSurveyInfo({
              profissao: survey.profissao,
              funil: survey.funil
            });
            
            // Construir nome da pesquisa com dados da resposta
            setSurveyName(survey.nome_pesquisa || "Detalhes da Pesquisa");
          } else {
            setQuestions([]);
            setError('Nenhuma questão encontrada para esta pesquisa');
          }
        } else {
          setQuestions([]);
          setError('Nenhuma pesquisa encontrada com este ID');
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da pesquisa:', err);
        setError(err.message || 'Erro ao carregar os detalhes da pesquisa');
        setQuestions([]); // Garantir que questions esteja vazio
      } finally {
        setLoading(false);
      }
    }
    
    fetchSurveyDetails();
  }, [surveyId, searchParams]);
  
  // Voltar para a lista de pesquisas
  const handleBack = () => {
    // Verificar se venda_inicio está presente para preservar ao retornar
    const vendaInicio = searchParams.get('venda_inicio');
    
    if (vendaInicio) {
      try {
        // Garantir que o horário está correto (20:30:00)
        const vendaInicioDate = new Date(vendaInicio);
        
        // Verificar se é terça-feira (dia 2)
        if (vendaInicioDate.getDay() !== 2) {
          console.log("Data de venda_inicio não é terça-feira, ajustando para próxima terça");
          // Encontrar próxima terça
          while (vendaInicioDate.getDay() !== 2) {
            vendaInicioDate.setDate(vendaInicioDate.getDate() + 1);
          }
        }
        
        // Formatar com a função dedicada
        const formattedDate = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
        console.log(`Formatando venda_inicio para voltar: ${formattedDate} (original: ${vendaInicio})`);
        
        // Construir URL com filtro preservado e formatado corretamente
        router.push(`/pesquisas?venda_inicio=${encodeURIComponent(formattedDate)}`);
      } catch (error) {
        console.error('Erro ao formatar venda_inicio:', error);
        // Fallback para o valor original em caso de erro
        router.push(`/pesquisas?venda_inicio=${encodeURIComponent(vendaInicio)}`);
      }
    } else {
      router.back();
    }
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
          {/* Resumo da pesquisa */}
          {surveyData && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white shadow-sm rounded-lg border p-4">
                <div className="text-sm text-gray-500 mb-1">Total de Leads</div>
                <div className="text-2xl font-bold">{surveyData.total_leads?.toLocaleString() || 0}</div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg border p-4">
                <div className="text-sm text-gray-500 mb-1">Total de Respostas</div>
                <div className="text-2xl font-bold">{surveyData.total_respostas?.toLocaleString() || 0}</div>
                <div className="text-sm text-blue-600 mt-1">
                  Taxa: {(surveyData.taxa_resposta_percentual || 0).toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg border p-4">
                <div className="text-sm text-gray-500 mb-1">Total de Vendas</div>
                <div className="text-2xl font-bold">{surveyData.total_vendas?.toLocaleString() || 0}</div>
                <div className="text-sm text-green-600 mt-1">
                  Taxa: {(surveyData.taxa_conversao_percentual || 0).toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-white shadow-sm rounded-lg border p-4">
                <div className="text-sm text-gray-500 mb-1">Tempo Médio de Resposta</div>
                <div className="text-2xl font-bold">{(surveyData.tempo_medio_resposta || 0).toFixed(1)} seg</div>
                <div className="text-sm text-gray-500 mt-1">
                  Por usuário: {(surveyData.tempo_medio_resposta_por_usuario || 0).toFixed(1)} seg
                </div>
              </div>
            </div>
          )}

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
          {selectedQuestion && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedQuestion.texto_pergunta}
                  </h2>
                  {surveyData && (
                    <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 inline-flex items-center">
                      <span className="font-medium mr-1">Profissão:</span> {surveyData.profissao}
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
                    {selectedQuestion.respostas && selectedQuestion.respostas.map((resposta, index) => (
                      <tr 
                        key={`${resposta.texto_opcao || ''}-${index}`}
                        className={`hover:bg-gray-50 ${index === 0 ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
                      >
                        <td className="px-4 py-3 text-center font-medium">{resposta.score_peso}</td>
                        <td className="px-4 py-3">{resposta.texto_opcao}</td>
                        <td className="px-4 py-3 text-center">{resposta.num_respostas?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{resposta.percentual_participacao?.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">{resposta.num_vendas?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{resposta.taxa_conversao_percentual?.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">{resposta.percentual_vendas?.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 