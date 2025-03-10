'use client'

import { useState, useEffect, useCallback } from "react"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateFilterProps {
  onChange?: (date: { 
    from?: Date; 
    to?: Date;
    fromTime?: string;
    toTime?: string;
  }) => void;
  initialDate?: {
    from?: Date;
    to?: Date;
    fromTime?: string;
    toTime?: string;
  };
}

export function DateFilter({ onChange, initialDate }: DateFilterProps) {
  // Estado para as datas
  const [selectedDates, setSelectedDates] = useState<DateRange | undefined>(() => {
    if (initialDate?.from) {
      return {
        from: new Date(initialDate.from),
        to: initialDate.to ? new Date(initialDate.to) : undefined
      }
    }
    return undefined
  })

  // Estado para o tempo
  const [showCustomTime, setShowCustomTime] = useState(Boolean(initialDate?.fromTime))
  const [fromTime, setFromTime] = useState(initialDate?.fromTime || "00:00")
  const [toTime, setToTime] = useState(initialDate?.toTime || "23:59")

  // Função para notificar mudanças
  const updateFilters = useCallback(() => {
    if (!onChange) return
    if (!selectedDates?.from) {
      onChange({
        from: undefined,
        to: undefined,
        fromTime: undefined,
        toTime: undefined
      })
      return
    }

    const from = new Date(selectedDates.from)
    const to = new Date(selectedDates.to || selectedDates.from)

    // Configura as horas
    if (showCustomTime) {
      const [fromHours, fromMinutes] = fromTime.split(":").map(Number)
      const [toHours, toMinutes] = toTime.split(":").map(Number)
      
      from.setHours(fromHours, fromMinutes, 0, 0)
      to.setHours(toHours, toMinutes, 59, 999)
    } else {
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
    }

    onChange({
      from,
      to,
      fromTime: showCustomTime ? fromTime : undefined,
      toTime: showCustomTime ? toTime : undefined
    })
  }, [onChange, selectedDates, showCustomTime, fromTime, toTime])

  // Handler para seleção de data
  const handleDateSelect = useCallback((newDate: DateRange | undefined) => {
    // Se está limpando a seleção
    if (!newDate?.from) {
      setSelectedDates(undefined)
      if (onChange) {
        onChange({
          from: undefined,
          to: undefined,
          fromTime: undefined,
          toTime: undefined
        })
      }
      return
    }

    // Atualiza o estado interno
    setSelectedDates(newDate)
    
    // Notifica mudança apenas quando tiver um intervalo completo (data inicial E final)
    if (onChange && newDate.to) {
      const from = new Date(newDate.from)
      const to = new Date(newDate.to)

      if (showCustomTime) {
        const [fromHours, fromMinutes] = fromTime.split(":").map(Number)
        const [toHours, toMinutes] = toTime.split(":").map(Number)
        
        from.setHours(fromHours, fromMinutes, 0, 0)
        to.setHours(toHours, toMinutes, 59, 999)
      } else {
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
      }

      onChange({
        from,
        to,
        fromTime: showCustomTime ? fromTime : undefined,
        toTime: showCustomTime ? toTime : undefined
      })
    } else if (onChange && !newDate.to) {
      // Quando apenas a data inicial está selecionada, atualizamos o estado mas não aplicamos o filtro
      onChange({
        from: new Date(newDate.from),
        to: undefined,
        fromTime: showCustomTime ? fromTime : undefined,
        toTime: undefined
      })
    }
  }, [onChange, showCustomTime, fromTime, toTime])

  // Handler para seleção rápida
  const handleQuickSelect = useCallback((period: "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth") => {
    const today = new Date()
    let from: Date
    let to: Date

    switch (period) {
      case "today":
        from = startOfDay(today)
        to = endOfDay(today)
        break
      case "yesterday":
        from = startOfDay(subDays(today, 1))
        to = endOfDay(subDays(today, 1))
        break
      case "last7":
        from = startOfDay(subDays(today, 6))
        to = endOfDay(today)
        break
      case "last30":
        from = startOfDay(subDays(today, 29))
        to = endOfDay(today)
        break
      case "thisMonth":
        from = startOfMonth(today)
        to = endOfMonth(today)
        break
      case "lastMonth":
        const lastMonth = subMonths(today, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        break
      default:
        return
    }

    const newDate = { from, to }
    setSelectedDates(newDate)
    setShowCustomTime(false)
    setFromTime("00:00")
    setToTime("23:59")

    if (onChange) {
      onChange({
        from: new Date(from),
        to: new Date(to),
        fromTime: undefined,
        toTime: undefined
      })
    }
  }, [onChange])

  // Handler para mudança de hora
  const handleTimeChange = useCallback((isStart: boolean, value: string) => {
    if (!selectedDates?.from) return

    if (isStart) {
      setFromTime(value)
    } else {
      setToTime(value)
    }

    // Só atualiza o filtro se tiver um intervalo completo
    if (onChange && selectedDates?.to) {
      const from = new Date(selectedDates.from)
      const to = new Date(selectedDates.to)
      const [hours, minutes] = value.split(":").map(Number)

      if (isStart) {
        from.setHours(hours, minutes, 0, 0)
        onChange({
          from,
          to,
          fromTime: value,
          toTime: showCustomTime ? toTime : undefined
        })
      } else {
        to.setHours(hours, minutes, 59, 999)
        onChange({
          from,
          to,
          fromTime: showCustomTime ? fromTime : undefined,
          toTime: value
        })
      }
    }
  }, [onChange, selectedDates, showCustomTime, fromTime, toTime])

  // Handler para toggle de hora personalizada
  const handleCustomTimeToggle = useCallback(() => {
    if (!selectedDates?.from) return

    const newShowCustomTime = !showCustomTime
    setShowCustomTime(newShowCustomTime)

    if (onChange && selectedDates?.to) {
      const from = new Date(selectedDates.from)
      const to = new Date(selectedDates.to)

      if (newShowCustomTime) {
        const [fromHours, fromMinutes] = fromTime.split(":").map(Number)
        const [toHours, toMinutes] = toTime.split(":").map(Number)
        
        from.setHours(fromHours, fromMinutes, 0, 0)
        to.setHours(toHours, toMinutes, 59, 999)

        onChange({
          from,
          to,
          fromTime,
          toTime
        })
      } else {
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)

        onChange({
          from,
          to,
          fromTime: undefined,
          toTime: undefined
        })
      }
    }
  }, [onChange, selectedDates, showCustomTime, fromTime, toTime])

  // Handler para limpar filtros
  const handleClear = useCallback(() => {
    setSelectedDates(undefined)
    setShowCustomTime(false)
    setFromTime("00:00")
    setToTime("23:59")
    
    if (onChange) {
      onChange({
        from: undefined,
        to: undefined,
        fromTime: undefined,
        toTime: undefined
      })
    }
  }, [onChange])

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4)
    const minute = (i % 4) * 15
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("today")}
        >
          Hoje
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("yesterday")}
        >
          Ontem
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("last7")}
        >
          Últimos 7 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("last30")}
        >
          Últimos 30 dias
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("thisMonth")}
        >
          Este mês
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => handleQuickSelect("lastMonth")}
        >
          Mês passado
        </Button>
      </div>

      <div className="border rounded-md">
        <CalendarComponent
          initialFocus
          mode="range"
          defaultMonth={selectedDates?.from}
          selected={selectedDates}
          onSelect={handleDateSelect}
          numberOfMonths={1}
          locale={ptBR}
          disabled={(date) => date > new Date() || date < new Date('2021-01-01')}
          classNames={{
            months: "space-y-2",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center gap-1",
            caption_label: "text-sm font-medium",
            nav: "flex items-center gap-1",
            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex w-full justify-between",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center",
            row: "flex w-full mt-1 justify-between",
            cell: "text-center text-sm relative p-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          weekStartsOn={0}
          toDate={new Date()}
          fromDate={new Date('2021-01-01')}
        />
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleCustomTimeToggle}
        >
          Personalizar hora
        </Button>

        {showCustomTime && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Hora início</Label>
              <Select value={fromTime} onValueChange={(value) => handleTimeChange(true, value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hora fim</Label>
              <Select value={toTime} onValueChange={(value) => handleTimeChange(false, value)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs"
        onClick={handleClear}
      >
        Limpar
      </Button>
    </div>
  )
} 