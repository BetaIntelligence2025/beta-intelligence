'use client'

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface FunnelFilterProps {
  onFilterChange?: (funnelIds: string[]) => void
  values?: string[]
  searchTerm?: string
}

export function FunnelFilter({ 
  onFilterChange,
  values = [], 
  searchTerm = ""
}: FunnelFilterProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(values)
  
  useEffect(() => {
    setSelectedIds(values)
  }, [values])
  
  const { data: funnels, isLoading } = useQuery({
    queryKey: ["funnels"],
    queryFn: async () => {
      const response = await fetch("/api/funnels")
      const data = await response.json()
      return data?.data || []
    }
  })

  const handleSelect = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id]
    
    setSelectedIds(newIds)
    if (onFilterChange) {
      onFilterChange(newIds)
    }
  }
  
  if (isLoading) {
    return <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
  }

  if (!Array.isArray(funnels) || funnels.length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Nenhum funil encontrado</div>
  }

  const filteredFunnels = funnels
    .filter(f => f && (f.funnel_id || f.id))
    .filter(f => {
      if (!searchTerm) return true
      const name = f.funnel_tag || f.name || ""
      return name.toLowerCase().includes(searchTerm.toLowerCase())
    })

  if (filteredFunnels.length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Nenhum funil encontrado com esse termo</div>
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
      {filteredFunnels.map((f: any) => {
        const id = String(f.funnel_id || f.id)
        const name = f.funnel_tag || f.name || `Funil ${id}`
        const isSelected = selectedIds.includes(id)
        
        return (
          <Button
            key={id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm h-8 gap-2",
              isSelected && "bg-accent"
            )}
            onClick={() => handleSelect(id)}
          >
            <Filter className="h-4 w-4 flex-shrink-0" />
            {name}
          </Button>
        )
      })}
    </div>
  )
} 