'use client'

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function Signup() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<Message | null>(null);
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(true);
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  useEffect(() => {
    // Processar mensagens nos parâmetros de busca
    const type = searchParams.get('type');
    const text = searchParams.get('text');
    
    if (type && text) {
      if (type === 'error') {
        setMessage({ error: text });
      } else if (type === 'success') {
        setMessage({ success: text });
      } else {
        setMessage({ message: text });
      }
    }
  }, [searchParams]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    if (value) {
      // Validar se o email termina com @cursobeta.com.br
      setIsValidEmail(value.endsWith('@cursobeta.com.br'));
    } else {
      setIsValidEmail(true); // Não mostrar erro quando campo estiver vazio
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isValidEmail) {
      e.preventDefault();
      setMessage({ error: "Apenas emails com domínio @cursobeta.com.br são permitidos" });
    }
  };

  return (
    <div className="flex min-h-screen w-full justify-center items-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl"><span className="text-red-800">Beta</span> Intelligence</span>
            </div>
          </div>
        </div>
        <Card className="border shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-2 pb-2">
            <h1 className="text-2xl font-bold text-center">Cadastre-se</h1>
            <p className="text-muted-foreground text-sm text-center">
              Crie sua conta para acessar o Beta Intelligence
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" action={signUpAction} onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input 
                  name="email" 
                  id="email"
                  placeholder="seu@cursobeta.com.br" 
                  className={`transition-all focus:ring-2 focus:ring-primary/20 ${!isValidEmail ? 'border-red-500' : ''}`} 
                  required 
                  value={email}
                  onChange={handleEmailChange}
                />
                {!isValidEmail && (
                  <p className="text-red-500 text-xs mt-1">
                    Apenas emails com domínio @cursobeta.com.br são permitidos
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Sua senha"
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                  minLength={6}
                  required
                />
              </div>
              
              <input type="hidden" name="redirectTo" value={redirectTo} />
              
              <SubmitButton 
                pendingText="Cadastrando..." 
                className="w-full bg-primary hover:bg-primary/90 transition-all"
                disabled={!isValidEmail}
              >
                Cadastrar
              </SubmitButton>
              
              {message && (
                <div className="animate-fadeIn">
                  <FormMessage message={message} />
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link className="text-primary hover:underline transition-all" href="/sign-in">
                    Faça login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Beta Intelligence &copy; {new Date().getFullYear()}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}