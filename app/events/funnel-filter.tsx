'use client'

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Funnel {
  funnel_id: number
  funnel_name: string
  funnel_tag: string
  created_at: string
}

interface FunnelResponse {
  data: Funnel[]
  meta: {
    last_page: number
    limit: number
    page: number
    total: number
    valid_sort_fields: string[]
  }
}

interface FunnelFilterProps {
  onFilterChange: (funnelId: string | null) => void
  value?: string | null
}

export function FunnelFilter({ onFilterChange, value }: FunnelFilterProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFunnels() {
      try {
        const response = await fetch('/api/funnels')
        const data: FunnelResponse = await response.json()
        // Ordenar por funnel_name
        const sortedFunnels = [...(data.data || [])].sort((a, b) => 
          a.funnel_name.localeCompare(b.funnel_name)
        )
        setFunnels(sortedFunnels)
      } catch (error) {
        console.error('Error fetching funnels:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFunnels()
  }, [])

  // Encontrar o nome do funil selecionado
  const selectedFunnelName = value 
    ? funnels.find(f => f.funnel_id.toString() === value)?.funnel_name 
    : null

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <Select 
      value={value || 'all'}
      onValueChange={(value) => onFilterChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue>
          {selectedFunnelName || 'Todos os funis'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os funis</SelectItem>
        {funnels.map((funnel) => (
          <SelectItem 
            key={funnel.funnel_id} 
            value={funnel.funnel_id.toString()}
          >
            {funnel.funnel_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 