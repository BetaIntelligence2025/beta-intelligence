"use client"

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default async function Home() {
  const router = useRouter()
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    router.push("/events")
  }else {
    router.push("/sign-in")
  }

  return (
    <>
      <main className="flex-1 flex flex-col gap-6 px-4">
        <h2 className="font-medium text-md mb-4">Bem-vindo ao Beta Intelligence</h2>      
      </main>
    </>
  );
}
