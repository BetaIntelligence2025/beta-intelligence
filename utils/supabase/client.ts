import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL ou chave anônima não definidas. Verifique suas variáveis de ambiente.');
  }
  
  return createBrowserClient(
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
        }
      }
    }
  );
};
