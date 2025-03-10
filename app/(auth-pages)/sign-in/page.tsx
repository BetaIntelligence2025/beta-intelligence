"use client";

import { FormMessage, Message } from "@/components/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Criar cliente Supabase diretamente no cliente
      const supabase = createClient();
      
      // Tentar login diretamente no cliente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setMessage({
          error: error.message
        });
      } else {
        // Login bem-sucedido, redirecionar para dashboard
        router.push("/dashboard");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido";
      setMessage({
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      <form onSubmit={handleLogin} className="items-center justify-center flex flex-col w-full">
        <h1 className="text-2xl font-medium">Sign in</h1>
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" 
            required 
          />
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              className="text-xs text-foreground underline"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-foreground text-background hover:bg-foreground/90 
              inline-flex h-10 items-center justify-center rounded-md px-4 py-2 
              text-sm font-medium transition-colors focus-visible:outline-none 
              focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none 
              disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign in'}
          </button>
          {message && <FormMessage message={message} />}
        </div>
      </form>
    </div>
  );
}
