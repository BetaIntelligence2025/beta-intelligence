"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Braces, LayoutDashboard, LogOut, Users, ClipboardList, BarChart, FileSpreadsheet } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"

export function SidebarMenuLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Erro ao carregar usuário:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/sign-in")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  const getUserInitials = (email: string) => {
    if (!email) return "U"
    return email.charAt(0).toUpperCase()
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold"><span className="text-red-800">Beta</span> Intelligence</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/events"}>
              <Link href="/events">
                <Braces className="mr-2 h-4 w-4" />
                Eventos
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/pesquisas"}>
              <Link href="/pesquisas">
                <ClipboardList className="mr-2 h-4 w-4" />
                Pesquisas
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <div className="pt-4 pb-2 px-2 text-sm text-muted-foreground">
            Overview por etapa
          </div>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/overview"}>
              <Link href="/dashboard/overview">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Páginas de Captação
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/dashboard/analytics"}>
              <Link href="/dashboard/analytics">
                <BarChart className="mr-2 h-4 w-4" />
                Analytics Avançado
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="px-3 py-4 border-t">
        {user && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials(user.email)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-32">{user.email}</span>
                <span className="text-xs text-muted-foreground">Logado</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!user && !loading && (
          <div className="w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => router.push("/sign-in")}
            >
              Fazer login
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}