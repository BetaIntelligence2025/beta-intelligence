'use client'

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfessionFilterProps {
  onFilterChange?: (professionIds: string[]) => void
  values?: string[]
  searchTerm?: string
}

export function ProfessionFilter({ onFilterChange, values = [], searchTerm = "" }: ProfessionFilterProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(values)
  
  useEffect(() => {
    setSelectedIds(values)
  }, [values])
  
  const { data: professions, isLoading } = useQuery({
    queryKey: ["professions"],
    queryFn: async () => {
      const response = await fetch("/api/professions")
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

  if (!Array.isArray(professions) || professions.length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Nenhum profissional encontrado</div>
  }

  const filteredProfessions = professions
    .filter(p => p && (p.profession_id || p.id))
    .filter(p => {
      if (!searchTerm) return true
      const name = p.profession_name || p.name || ""
      return name.toLowerCase().includes(searchTerm.toLowerCase())
    })

  if (filteredProfessions.length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Nenhum profissional encontrado com esse termo</div>
  }

  return (
    <div className="space-y-1">
      {filteredProfessions.map((p: any) => {
        const id = String(p.profession_id || p.id)
        const name = p.profession_name || p.name || `Profissional ${id}`
        const isSelected = selectedIds.includes(id)
        
        return (
          <Button
            key={id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm h-8 gap-2 px-1",
              isSelected && "bg-gray-100"
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