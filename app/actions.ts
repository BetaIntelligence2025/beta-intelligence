"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || "/events";
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email e senha são obrigatórios",
    );
  }

  // Validação de domínio de email - permitir apenas @cursobeta.com.br
  if (!email.endsWith('@cursobeta.com.br')) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Apenas emails com domínio @cursobeta.com.br são permitidos",
    );
  }

  try {
    // Registrar usuário sem confirmação de email
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(redirectTo, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").href}`,
        data: {
          email_confirmed: true
        }
      },
    });

    if (error) {
      console.error("Erro ao registrar usuário:", error.message);
      return encodedRedirect("error", "/sign-up", error.message);
    }

    // Verificar se o usuário foi criado com sucesso
    if (!data?.user?.id) {
      console.error("Usuário não foi criado corretamente");
      return encodedRedirect("error", "/sign-up", "Erro ao criar usuário. Tente novamente mais tarde.");
    }

    // Se a configuração 'confirmação de email' estiver ativada no Supabase,
    // informamos ao usuário que ele precisa confirmar o email
    if (data?.user?.identities && data.user.identities.length === 0) {
      return encodedRedirect(
        "success", 
        "/sign-in", 
        "Conta criada com sucesso! Verifique seu email para ativar sua conta ou entre em contato com a administração."
      );
    }
    
    // Tentar fazer login imediatamente (funciona se a confirmação estiver desativada no Supabase)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Se conseguiu fazer login, redireciona para o dashboard
    if (!signInError) {
      console.log("Login automático realizado com sucesso");
      return redirect(redirectTo);
    }
    
    // Se não conseguir fazer login automático, redireciona para página de login
    console.warn("Não foi possível fazer login automático:", signInError.message);
    return encodedRedirect(
      "success", 
      "/sign-in", 
      "Conta criada com sucesso! Faça login para continuar."
    );
    
  } catch (error) {
    console.error("Exceção não tratada ao registrar usuário:", error);
    return encodedRedirect(
      "error", 
      "/sign-up", 
      "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde."
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  
  // Criando cliente Supabase
  const supabase = await createClient();
  
  // Tentando fazer login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(redirectTo);
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/dashboard/reset-password`,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/dashboard/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
