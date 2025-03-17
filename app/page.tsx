"use client"

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Usuário autenticado - redirecionar para o dashboard
          router.replace("/events");
        } else {
          // Usuário não autenticado - redirecionar para login
          router.replace("/sign-in");
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        // Em caso de erro, redirecionar para login
        router.replace("/sign-in");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // Mostrar tela de carregamento enquanto decide para onde redirecionar
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-medium mb-2">Beta Intelligence</h2>
        <p className="text-gray-500">Carregando o sistema...</p>
      </div>
    </div>
  );
}
