'use client'

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Profession {
  profession_id: number
  profession_name: string
  created_at: string
  meta_pixel: string
  meta_token: string
}

interface ProfessionResponse {
  data: Profession[]
  meta: {
    last_page: number
    limit: number
    page: number
    total: number
    valid_sort_fields: string[]
  }
}

interface ProfessionFilterProps {
  onFilterChange: (professionId: string | null) => void
  value?: string | null
}

export function ProfessionFilter({ onFilterChange, value }: ProfessionFilterProps) {
  const [professions, setProfessions] = useState<Profession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfessions() {
      try {
        const response = await fetch('/api/professions')
        const data: ProfessionResponse = await response.json()
        setProfessions(data.data || [])
      } catch (error) {
        console.error('Error fetching professions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfessions()
  }, [])

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <Select 
      value={value || 'all'}
      onValueChange={(value) => onFilterChange(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione a profissão" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as profissões</SelectItem>
        {professions.map((profession) => (
          <SelectItem 
            key={profession.profession_id} 
            value={profession.profession_id.toString()}
          >
            {profession.profession_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 