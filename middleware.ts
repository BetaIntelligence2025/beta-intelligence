import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const path = requestUrl.pathname
  
  
  // Criar cliente do Supabase
  const { supabase, response: supabaseResponse } = createClient(request)

  // Verificar se o usuário está autenticado
  const { data: { session } } = await supabase.auth.getSession()
  
  // Array de rotas protegidas (requerem autenticação)
  const protectedRoutes = ['/dashboard', '/usuarios', '/events']
  
  // Verificar se o caminho atual é uma rota protegida ou começa com uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(`${route}/`))
  
  // Se for uma rota protegida e o usuário não estiver autenticado, redirecionar para o login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/sign-in', requestUrl.origin)
    
    // Adicionar a URL de retorno como parâmetro para redirecionar após o login
    redirectUrl.searchParams.set('redirectTo', requestUrl.pathname)
    
    return NextResponse.redirect(redirectUrl.href)
  }
  
  // Adicionar cabeçalhos CORS a todas as respostas
  const response = supabaseResponse || NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info')
  
  // Tratamento especial para rotas de API relacionadas à autenticação
  if (path.includes('/api/auth') || path.includes('/sign-in') || path.includes('/sign-up')) {
    // Verificar conectividade com o Supabase antes de continuar
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl) {
        
        // Tentativa de ping para verificar se o domínio é resolvido
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000) // timeout de 2 segundos
          
          const pingResponse = await fetch(`${supabaseUrl}/ping`, { 
            method: 'GET',
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
        } catch (error) {
          console.error("[MIDDLEWARE] Falha ao conectar com Supabase:", error)
          
          // Se for um erro de DNS, retornamos uma resposta amigável
          if (
            error instanceof Error && 
            (error.message.includes('ENOTFOUND') || 
             error.message.includes('getaddrinfo') ||
             error.message.includes('domain'))
          ) {
            
            // Se o cliente estiver solicitando a página de login, incluímos uma mensagem
            if (request.method === 'GET' && (path === '/sign-in' || path === '/sign-up')) {
              const url = new URL('/sistema-indisponivel', requestUrl.origin)
              return NextResponse.redirect(url)
            }
            
            // Para requisições de API, retornamos um erro JSON
            if (request.method === 'POST') {
              return new NextResponse(
                JSON.stringify({ 
                  error: 'Serviço temporariamente indisponível. Não foi possível conectar ao servidor de autenticação.',
                  code: 'service_unavailable',
                  details: 'Problema de DNS ao conectar com o Supabase'
                }),
                {
                  status: 503,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info'
                  }
                }
              )
            }
          }
        }
      }
    } catch (error) {
      console.error("[MIDDLEWARE] Erro ao verificar conectividade:", error)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
