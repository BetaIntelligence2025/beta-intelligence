import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Obter a URL base atual
    const baseUrl = request.nextUrl.origin;
    
    // Criar o cliente Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              // Garantir que os cookies sejam configurados corretamente
              const cookieOptions = {
                ...options,
                // Garantir que o cookie seja enviado em solicitações HTTPS
                secure: process.env.NODE_ENV === 'production',
                // Permitir que o cookie seja acessado pelo JavaScript
                httpOnly: true,
                // Definir o domínio do cookie
                domain: undefined, // Deixar o navegador definir automaticamente
                // Definir o caminho do cookie
                path: '/',
                // Definir a política de SameSite
                sameSite: 'lax' as const,
              };
              response.cookies.set(name, value, cookieOptions);
            });
          },
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          fetch: fetch.bind(globalThis),
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError);
    }

    // Obter a URL base atual
    const user = session?.user;

    // protected routes
    if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
      return NextResponse.redirect(new URL("/sign-in", baseUrl));
    }

    if (request.nextUrl.pathname === "/" && user) {
      return NextResponse.redirect(new URL("/dashboard", baseUrl));
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    console.error("Erro ao criar cliente Supabase:", e);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
