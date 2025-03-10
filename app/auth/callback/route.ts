import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  console.log('[AUTH-CALLBACK] Iniciando processamento de callback');
  console.log('[AUTH-CALLBACK] Headers:', Object.fromEntries(request.headers.entries()));
  
  const requestUrl = new URL(request.url);
  console.log('[AUTH-CALLBACK] URL completa:', request.url);
  console.log('[AUTH-CALLBACK] Parâmetros de consulta:', Object.fromEntries(requestUrl.searchParams.entries()));
  
  const code = requestUrl.searchParams.get("code");
  console.log('[AUTH-CALLBACK] Código de autenticação presente:', code ? 'Sim' : 'Não');
  
  if (code) {
    try {
      console.log('[AUTH-CALLBACK] Criando cliente Supabase...');
      const supabase = await createClient();
      
      console.log('[AUTH-CALLBACK] Trocando código por sessão...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[AUTH-CALLBACK] Erro ao trocar código por sessão:', error);
        console.error('[AUTH-CALLBACK] Detalhes completos do erro:', JSON.stringify(error));
      } else {
        console.log('[AUTH-CALLBACK] Sessão criada com sucesso:', {
          user: data.session?.user?.email,
          expiresAt: data.session?.expires_at,
          accessToken: data.session?.access_token ? 'presente (primeiros 10 caracteres): ' + data.session.access_token.substring(0, 10) + '...' : 'ausente'
        });
        
        // Verificar se os cookies foram definidos
        console.log('[AUTH-CALLBACK] Cookies definidos:', request.cookies.getAll().map(c => c.name));
      }
    } catch (e) {
      console.error('[AUTH-CALLBACK] Exceção ao processar callback:', e);
      console.error('[AUTH-CALLBACK] Stack trace:', e instanceof Error ? e.stack : 'Não disponível');
    }
  } else {
    console.log('[AUTH-CALLBACK] Nenhum código de autenticação encontrado na URL');
  }

  // URL para redirecionar após a autenticação
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard';
  console.log(`[AUTH-CALLBACK] Redirecionando para: ${redirectTo}`);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
