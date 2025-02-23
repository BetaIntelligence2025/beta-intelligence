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
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
