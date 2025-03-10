import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Verifica se é uma rota que precisa de autenticação
  if (request.nextUrl.pathname.startsWith('/api/lead') || 
      request.nextUrl.pathname.startsWith('/api/client')) {
    
    const token = request.headers.get('authorization')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    // Aqui você pode adicionar a lógica de verificação do token
    // Não limitamos a verificação a um domínio específico
  }
  
  // Adicionar cabeçalhos CORS para permitir solicitações de qualquer origem
  const response = NextResponse.next()
  
  // Permitir solicitações de qualquer origem
  response.headers.set('Access-Control-Allow-Origin', '*')
  // Permitir métodos específicos
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  // Permitir cabeçalhos específicos
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
