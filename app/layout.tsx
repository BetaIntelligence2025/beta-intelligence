import { EnvVarWarning } from "@/components/env-var-warning"
import HeaderAuth from "@/components/header-auth"
import { hasEnvVars } from "@/utils/supabase/check-env-vars"
import { Geist } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarMenuLayout } from "@/components/sidebar-menu-layout"
import { QueryProvider } from "@/providers/query-provider"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL}` 
  : typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Beta Intelligence",
  description: "Beta Intelligence is a platform for data-driven decision-making",
}

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Verifica se o usuário está autenticado
  const cookieStore = cookies()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  return (
    <html lang="pt-br" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light" disableTransitionOnChange>
            {isAuthenticated ? (
              // Layout para usuários autenticados - com sidebar
              <SidebarProvider>
                <div className="flex h-screen w-full">
                  <SidebarMenuLayout />
                  <SidebarInset className="flex-1 w-full overflow-auto">
                    <main className="min-h-screen w-full flex flex-col">
                      <div className="flex-1 h-full flex flex-col items-center p-5">
                        <div className="flex flex-col w-full h-full">{children}</div>
                      </div>
                    </main>
                  </SidebarInset>
                </div>
              </SidebarProvider>
            ) : (
              // Layout para usuários não autenticados - sem sidebar
              <main className="min-h-screen w-full">
                {children}
              </main>
            )}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}