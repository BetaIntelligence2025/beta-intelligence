'use client'

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Definir os tipos de dados para questões e respostas
interface SurveyResponse {
  resposta_id: string
  texto_opcao: string
  score: number
  num_respostas: number
  percentual_participacao: number
  num_vendas: number
  taxa_conversao_percentual: number
}

interface SurveyQuestion {
  pergunta_id: string
  texto_pergunta: string
  respostas: SurveyResponse[]
}

interface SurveyDetailsProps {
  surveyId: string
}

export function SurveyDetails({ surveyId }: SurveyDetailsProps) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar os detalhes da pesquisa quando o componente montar ou o ID mudar
  useEffect(() => {
    if (!surveyId) return;
    
    const fetchSurveyDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/pesquisas/${surveyId}`);
        
        if (!response.ok) {
          throw new Error(`Falha ao buscar detalhes: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
          setSelectedQuestionId(data[0].pergunta_id);
        } else {
          setQuestions([]);
          setError('Nenhuma questão encontrada para esta pesquisa');
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes da pesquisa:', err);
        setError('Erro ao carregar os detalhes da pesquisa');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSurveyDetails();
  }, [surveyId]);

  // Encontrar a questão selecionada
  const selectedQuestion = questions.find(q => q.pergunta_id === selectedQuestionId);

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        Nenhum dado disponível para esta pesquisa
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      {/* Navegação das questões */}
      <Tabs
        defaultValue={selectedQuestionId}
        value={selectedQuestionId}
        onValueChange={(value) => setSelectedQuestionId(value)}
        className="w-full"
      >
        <TabsList className="flex w-full overflow-x-auto">
          {questions.map((question) => (
            <TabsTrigger
              key={question.pergunta_id}
              value={question.pergunta_id}
              className="px-4 py-2"
            >
              {question.texto_pergunta}
            </TabsTrigger>
          ))}
        </TabsList>

        {questions.map((question) => (
          <TabsContent
            key={question.pergunta_id}
            value={question.pergunta_id}
            className="mt-4"
          >
            {selectedQuestion && (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">Score (PESO)</th>
                      <th className="px-3 py-3 text-left font-semibold">Faixa Etária</th>
                      <th className="px-3 py-3 text-center font-semibold">Nº de Respostas</th>
                      <th className="px-3 py-3 text-center font-semibold">Participação no Total</th>
                      <th className="px-3 py-3 text-center font-semibold">Nº de Vendas</th>
                      <th className="px-3 py-3 text-center font-semibold">% de Conversão em Vendas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {question.respostas.map((resposta) => (
                      <tr key={resposta.resposta_id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 text-center">{resposta.score}</td>
                        <td className="px-3 py-4">{resposta.texto_opcao}</td>
                        <td className="px-3 py-4 text-center">{resposta.num_respostas}</td>
                        <td className="px-3 py-4 text-center">{resposta.percentual_participacao}%</td>
                        <td className="px-3 py-4 text-center">{resposta.num_vendas}</td>
                        <td className="px-3 py-4 text-center">{resposta.taxa_conversao_percentual}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 