import { EnvVarWarning } from "@/components/env-var-warning"
import HeaderAuth from "@/components/header-auth"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { hasEnvVars } from "@/utils/supabase/check-env-vars"
import { Geist } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { SidebarMenuLayout } from "@/components/sidebar-menu-layout"
import { QueryProvider } from "@/providers/query-provider"

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Beta Intelligence",
  description: "Beta Intelligence is a platform for data-driven decision-making",
}

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SidebarProvider>
              <div className="flex h-screen w-full">
                <SidebarMenuLayout />
                <SidebarInset className="flex-1 w-full overflow-auto">
                  <main className="min-h-screen w-full flex flex-col">
                    <nav className="w-full flex justify-between items-center border-b border-b-foreground/10 h-16 px-4">
                      <SidebarTrigger />
                      <div className="flex items-center gap-4">
                        {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                      </div>
                    </nav>
                    <div className="flex-1 flex flex-col items-center p-5">
                      <div className="flex flex-col w-full">{children}</div>
                    </div>
                    <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
                      <p>Powered by Beta</p>
                      <ThemeSwitcher />
                    </footer>
                  </main>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}