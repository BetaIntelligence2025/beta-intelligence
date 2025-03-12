"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  console.log("[SIGN-UP] Iniciando cadastro com email:", email);
  console.log("[SIGN-UP] Origin:", origin);
  console.log("[SIGN-UP] Redirect URL:", `${origin}/auth/callback`);

  if (!email || !password) {
    console.log("[SIGN-UP] Erro: Email e senha são obrigatórios");
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // Chamando supabase.auth.signUp
  console.log("[SIGN-UP] Chamando supabase.auth.signUp...");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  // Registrando resultado
  console.log("[SIGN-UP] Resposta do Supabase:", { 
    success: !error, 
    user: data?.user ? { 
      id: data.user.id, 
      email: data.user.email,
      emailConfirmed: data.user.email_confirmed_at ? 'sim' : 'não'
    } : null,
    session: data?.session ? 'presente' : 'ausente'
  });

  if (error) {
    console.error("[SIGN-UP] Erro:", error.code, error.message);
    console.error("[SIGN-UP] Detalhes completos:", error);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    console.log("[SIGN-UP] Sucesso! Usuário cadastrado.");
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";
  
  console.log("[SIGN-IN] Iniciando login com email:", email);
  
  // Criando cliente Supabase
  console.log("[SIGN-IN] Criando cliente Supabase...");
  const supabase = await createClient();
  
  // Tentando fazer login
  console.log("[SIGN-IN] Chamando supabase.auth.signInWithPassword...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Registrando resultado
  console.log("[SIGN-IN] Resposta do Supabase:", { 
    success: !error, 
    user: data?.user ? { 
      id: data.user.id, 
      email: data.user.email 
    } : null,
    session: data?.session ? {
      accessToken: data.session.access_token ? 'presente' : 'ausente',
      expiresAt: data.session.expires_at
    } : 'ausente'
  });

  // Se houver erro, redirecionar com mensagem de erro
  if (error) {
    console.error("[SIGN-IN] Erro:", error.code, error.message);
    console.error("[SIGN-IN] Detalhes completos:", error);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Se login for bem-sucedido, redirecionar para a página solicitada ou dashboard
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
    console.error(error.message);
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
