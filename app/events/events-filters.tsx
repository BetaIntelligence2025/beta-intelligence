'use client'

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ProfessionFilter } from "./profession-filter"
import { FunnelFilter } from "./funnel-filter"

interface EventsFiltersProps {
  onFilterChange: (filters: { 
    dateRange: DateRange | undefined
    professionId?: string | null 
    funnelId?: string | null
  }) => void
  initialFilters?: { 
    dateRange?: DateRange
    professionId?: string 
    funnelId?: string
  }
}

export function EventsFilters({ onFilterChange, initialFilters }: EventsFiltersProps) {
  const [date, setDate] = useState<DateRange | undefined>(
    initialFilters?.dateRange || undefined
  )
  const [professionId, setProfessionId] = useState<string | null>(
    initialFilters?.professionId || null
  )
  const [funnelId, setFunnelId] = useState<string | null>(
    initialFilters?.funnelId || null
  )

  const handleFunnelChange = (newFunnelId: string | null) => {
    setFunnelId(newFunnelId)
    onFilterChange({ 
      dateRange: date,
      professionId,
      funnelId: newFunnelId 
    })
  }

  const handleClearFilters = () => {
    setDate(undefined)
    setProfessionId(null)
    setFunnelId(null)
    onFilterChange({
      dateRange: undefined,
      professionId: null,
      funnelId: null
    })
  }

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
  }

  const handleProfessionChange = (newProfessionId: string | null) => {
    setProfessionId(newProfessionId)
    onFilterChange({ 
      dateRange: date,
      professionId: newProfessionId,
      funnelId
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && date?.from && date?.to) {
      onFilterChange({ 
        dateRange: date,
        professionId,
        funnelId
      })
    }
  }

  const hasActiveFilters = date?.from || date?.to || professionId || funnelId

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="grid gap-2">
          <Popover onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(date.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
                locale={ptBR}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <ProfessionFilter 
          onFilterChange={handleProfessionChange} 
          value={professionId}
        />
        <FunnelFilter 
          onFilterChange={handleFunnelChange}
          value={funnelId}
        />
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
} 