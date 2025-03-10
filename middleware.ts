import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log(`[MIDDLEWARE] Processando requisição: ${request.method} ${request.nextUrl.pathname}`);
  console.log(`[MIDDLEWARE] Origem: ${request.headers.get('origin') || 'não definida'}`);
  console.log(`[MIDDLEWARE] Referer: ${request.headers.get('referer') || 'não definido'}`);
  
  // Lidar com solicitações de preflight OPTIONS
  if (request.method === 'OPTIONS') {
    console.log('[MIDDLEWARE] Detectada solicitação OPTIONS (preflight CORS)');
    const response = new NextResponse(null, { status: 204 });
    
    // Configurar cabeçalhos CORS para preflight
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 horas
    
    console.log('[MIDDLEWARE] Respondendo preflight com cabeçalhos CORS');
    return response;
  }

  // Verifica se é uma rota que precisa de autenticação
  if (request.nextUrl.pathname.startsWith('/api/lead') || 
      request.nextUrl.pathname.startsWith('/api/client')) {
    
    const token = request.headers.get('authorization')
    
    if (!token) {
      console.log('[MIDDLEWARE] Acesso não autorizado a rota protegida');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    console.log('[MIDDLEWARE] Token de autorização presente para rota protegida');
    // Aqui você pode adicionar a lógica de verificação do token
    // Não limitamos a verificação a um domínio específico
  }
  
  // Adicionar cabeçalhos CORS para permitir solicitações de qualquer origem
  const response = NextResponse.next()
  
  // Permitir solicitações de qualquer origem
  response.headers.set('Access-Control-Allow-Origin', '*')
  // Permitir métodos específicos
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  // Permitir cabeçalhos específicos, incluindo X-Client-Info e apikey que o Supabase usa
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey')
  
  console.log('[MIDDLEWARE] Adicionados cabeçalhos CORS à resposta');
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
