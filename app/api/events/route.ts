import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { API_ENDPOINTS } from '@/app/config/api'

// Usar a configuração centralizada de API
const EVENTS_ENDPOINT = API_ENDPOINTS.EVENTS

console.log(`API configurada para usar: ${EVENTS_ENDPOINT}`)

export async function GET(request: NextRequest) {
  try {
    console.log('Recebendo requisição para /api/events')
    const { searchParams } = new URL(request.url)
    console.log('Query params:', Object.fromEntries(searchParams.entries()))
    
    // Criar uma nova instância de URLSearchParams para a requisição ao backend
    const params = new URLSearchParams()
    
    // Transferir todos os parâmetros da requisição para os parâmetros da chamada ao backend
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      // Para o caso de advanced_filters, garantir que é uma string JSON válida
      if (key === 'advanced_filters') {
        try {
          // Testar se é JSON válido
          JSON.parse(value)
          params.append(key, value)
        } catch (err) {
          console.error('Erro ao processar advanced_filters:', err)
          // Não adicionar um valor inválido
        }
      } else {
        params.append(key, value)
      }
    })
    
    console.log('Enviando requisição para o backend:', `${EVENTS_ENDPOINT}?${params.toString()}`)
    
    // Fazer a requisição para o backend
    const response = await axios.get(`${EVENTS_ENDPOINT}?${params.toString()}`)
    
    console.log('Resposta do backend recebida com sucesso')
    
    // Retornar os dados recebidos do backend
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao processar requisição para eventos:', error)
    
    // Verificar se é um erro do Axios (resposta do backend)
    if (axios.isAxiosError(error) && error.response) {
      console.error('Erro do backend:', error.response.status, error.response.data)
      
      // Retornar o erro com o mesmo status code e dados do backend
      return NextResponse.json(
        error.response.data,
        { status: error.response.status }
      )
    }
    
    // Erro genérico (não relacionado à resposta do backend)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 