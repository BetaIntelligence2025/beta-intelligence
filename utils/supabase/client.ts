import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log("[SUPABASE-CLIENT] Criando cliente com URL:", supabaseUrl);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE-CLIENT] ERRO: Supabase URL ou chave anônima não definidas. Verifique suas variáveis de ambiente.');
  }
  
  try {
    const client = createBrowserClient(
      supabaseUrl!,
      supabaseKey!,
      {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-js/2.x'
          },
          // Sobrescrever fetch para detectar erros de CORS
          fetch: async (url, options = {}) => {
            console.log(`[SUPABASE-CLIENT] Fazendo requisição para: ${url}`);
            try {
              const response = await fetch(url, {
                ...options,
                headers: {
                  ...options.headers,
                  'X-Client-Info': 'supabase-js/2.x'
                }
              });
              console.log(`[SUPABASE-CLIENT] Resposta recebida: ${response.status} ${response.statusText}`);
              return response;
            } catch (error) {
              // Verificar se é um erro de CORS
              const errorString = String(error);
              if (errorString.includes('CORS') || errorString.includes('cross-origin')) {
                console.error('[SUPABASE-CLIENT] ERRO DE CORS DETECTADO:', error);
                console.error('[SUPABASE-CLIENT] URL da requisição:', url);
                console.error('[SUPABASE-CLIENT] Origem atual:', window.location.origin);
              } else {
                console.error('[SUPABASE-CLIENT] Erro na requisição:', error);
              }
              throw error;
            }
          }
        }
      }
    );
    
    console.log("[SUPABASE-CLIENT] Cliente criado com sucesso");
    
    // Sobrescrever métodos de autenticação para adicionar logs
    const originalSignIn = client.auth.signInWithPassword;
    client.auth.signInWithPassword = async (params: any) => {
      console.log("[SUPABASE-CLIENT] Chamando signInWithPassword com:", params);
      try {
        const result = await originalSignIn.call(client.auth, params);
        console.log("[SUPABASE-CLIENT] Resultado de signInWithPassword:", 
          result.error ? `Erro: ${result.error.message}` : "Sucesso");
        return result;
      } catch (e) {
        console.error("[SUPABASE-CLIENT] Exceção em signInWithPassword:", e);
        throw e;
      }
    };
    
    const originalSignUp = client.auth.signUp;
    client.auth.signUp = async (params: any) => {
      console.log("[SUPABASE-CLIENT] Chamando signUp com:", params);
      try {
        const result = await originalSignUp.call(client.auth, params);
        console.log("[SUPABASE-CLIENT] Resultado de signUp:", 
          result.error ? `Erro: ${result.error.message}` : "Sucesso");
        return result;
      } catch (e) {
        console.error("[SUPABASE-CLIENT] Exceção em signUp:", e);
        throw e;
      }
    };
    
    return client;
  } catch (e) {
    console.error("[SUPABASE-CLIENT] Erro ao criar cliente:", e);
    throw e;
  }
};
