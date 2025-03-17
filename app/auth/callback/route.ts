import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  
  const requestUrl = new URL(request.url);
  
  const code = requestUrl.searchParams.get("code");
  
  if (code) {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    } catch (e) {
      console.error('[AUTH-CALLBACK] Exceção ao processar callback:', e);
      console.error('[AUTH-CALLBACK] Stack trace:', e instanceof Error ? e.stack : 'Não disponível');
    }
  }

  // URL para redirecionar após a autenticação
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard';
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
