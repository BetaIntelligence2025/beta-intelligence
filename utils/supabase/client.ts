import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL ou chave anônima não definidas. Verifique suas variáveis de ambiente.');
  }
  
  // Função para verificar se o URL do Supabase é válido
  const isValidURL = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // Verificar se a URL é válida
  if (!isValidURL(supabaseUrl)) {
    throw new Error(`URL do Supabase inválida: ${supabaseUrl}`);
  }
  
  try {
    // Mostrar na console o host que estamos tentando acessar para diagnóstico
    const supabaseHost = new URL(supabaseUrl).hostname;
    
    const client = createBrowserClient(
      supabaseUrl,
      supabaseKey,
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
          // Sobrescrever fetch para detectar erros de CORS e DNS
          fetch: async (url, options = {}) => {
            
            // Verificar se a URL é válida e obter hostname para diagnóstico
            let hostname = "";
            try {
              const urlObj = typeof url === 'string' ? new URL(url) : url instanceof URL ? url : new URL(url.url);
              hostname = urlObj.hostname;
            } catch (e) {
              throw new Error(`URL inválida: ${url}`);
            }
            
            try {
              const response = await fetch(url, {
                ...options,
                headers: {
                  ...options.headers,
                  'X-Client-Info': 'supabase-js/2.x'
                }
              });
              return response;
            } catch (error) {
              const errorString = String(error);
              
              // Verificar diferentes tipos de erros
              if (errorString.includes('CORS') || errorString.includes('cross-origin')) {
                throw new Error(`Erro de CORS ao conectar com o servidor Supabase. Verifique sua configuração.`);
              } 
              else if (errorString.includes('ERR_NAME_NOT_RESOLVED')) {
                throw new Error(`Erro de DNS: Não foi possível resolver o nome do servidor Supabase (${hostname}). Verifique sua conexão com a internet.`);
              }
              else if (errorString.includes('Failed to fetch')) {
                throw new Error(`Erro de conectividade ao tentar acessar o servidor Supabase. Verifique sua conexão com a internet.`);
              }
              else {
                throw error;
              }
            }
          }
        }
      }
    );
    
      
    // Sobrescrever métodos de autenticação para adicionar logs
    const originalSignIn = client.auth.signInWithPassword;
    client.auth.signInWithPassword = async (params: any) => {
      try {
        // Tentar fazer ping antes da autenticação
        try {
          const pingResponse = await fetch(`${supabaseUrl}/ping`, { 
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
          });
        } catch (pingError) {
          console.error("[SUPABASE-CLIENT] Erro no ping:", pingError);
          // Continuar mesmo com erro no ping, apenas para logging
        }
        
        const result = await originalSignIn.call(client.auth, params);
        return result;
      } catch (e) {
        console.error("[SUPABASE-CLIENT] Exceção em signInWithPassword:", e);
        throw e;
      }
    };
    
    const originalSignUp = client.auth.signUp;
    client.auth.signUp = async (params: any) => {
      try {
        const result = await originalSignUp.call(client.auth, params);
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
