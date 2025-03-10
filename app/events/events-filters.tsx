'use client'

import { useState, useEffect } from "react"
import { Search, Filter, X, ChevronLeft, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from "@/components/ui/badge"
import { ProfessionFilter } from "./profession-filter"
import { FunnelFilter } from "./funnel-filter"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { DateFilter } from "./date-filter"

interface EventsFiltersProps {
  onFilterChange?: (filters: { 
    professionId?: string | null | undefined; 
    funnelId?: string | null | undefined;
    dateFrom?: string | null | undefined;
    dateTo?: string | null | undefined;
    timeFrom?: string | null | undefined;
    timeTo?: string | null | undefined;
  }) => void;
  initialFilters?: {
    professionId?: string;
    funnelId?: string;
    dateFrom?: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
  };
}

export function EventsFilters({ onFilterChange, initialFilters = {} }: EventsFiltersProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"main" | "professions" | "funnels">("main")
  
  const [professionIds, setProfessionIds] = useState<string[]>(() => {
    if (initialFilters?.professionId) {
      return initialFilters.professionId.split(',');
    }
    const urlParam = searchParams.get('profession_id');
    return urlParam ? urlParam.split(',') : [];
  });

  const [funnelIds, setFunnelIds] = useState<string[]>(() => {
    if (initialFilters?.funnelId) {
      return initialFilters.funnelId.split(',');
    }
    const urlParam = searchParams.get('funnel_id');
    return urlParam ? urlParam.split(',') : [];
  });

  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
    fromTime?: string;
    toTime?: string;
  } | undefined>(() => {
    if (!initialFilters?.dateFrom) return undefined;
    return {
      from: new Date(initialFilters.dateFrom),
      to: initialFilters.dateTo ? new Date(initialFilters.dateTo) : undefined,
      fromTime: initialFilters.timeFrom,
      toTime: initialFilters.timeTo
    };
  });
  
  const updateUrl = () => {
    if (dateRange?.from && !dateRange?.to) {
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString())
    
    // Preservar o parâmetro de página atual
    const currentPage = params.get('page') || '1';
    
    if (professionIds.length > 0) {
      params.set('profession_id', professionIds.join(','))
    } else {
      params.delete('profession_id')
    }
    
    if (funnelIds.length > 0) {
      params.set('funnel_id', funnelIds.join(','))
    } else {
      params.delete('funnel_id')
    }

    if (dateRange?.from) {
      params.set('from', dateRange.from.toISOString())
      
      if (dateRange.to) {
        params.set('to', dateRange.to.toISOString())
      } else {
        params.delete('to')
      }
      
      if (dateRange.fromTime) {
        params.set('time_from', dateRange.fromTime)
      } else {
        params.delete('time_from')
      }
      
      if (dateRange.toTime) {
        params.set('time_to', dateRange.toTime)
      } else {
        params.delete('time_to')
      }
    } else {
      params.delete('from')
      params.delete('to')
      params.delete('time_from')
      params.delete('time_to')
    }
    
    // Garantir que o parâmetro de página seja mantido
    params.set('page', currentPage);
    
    const newUrl = `/events?${params.toString()}`
    router.push(newUrl, { scroll: false })
    
    if (onFilterChange) {
      onFilterChange({
        professionId: professionIds.length > 0 ? professionIds[0] : null,
        funnelId: funnelIds.length > 0 ? funnelIds[0] : null,
        dateFrom: dateRange?.from ? dateRange.from.toISOString() : null,
        dateTo: dateRange?.to ? dateRange.to.toISOString() : null,
        timeFrom: dateRange?.fromTime || null,
        timeTo: dateRange?.toTime || null
      });
    }
    
    window.dispatchEvent(new CustomEvent('refetch-events'))
  }
  
  useEffect(() => {
    if (!(dateRange?.from && !dateRange?.to)) {
      updateUrl()
    }
  }, [professionIds, funnelIds, dateRange])
  
  const handleProfessionChange = (newIds: string[]) => {
    setProfessionIds(newIds)
  }
  
  const handleFunnelChange = (newIds: string[]) => {
    setFunnelIds(newIds)
  }

  const handleDateChange = (newDate: { 
    from?: Date; 
    to?: Date;
    fromTime?: string;
    toTime?: string;
  }) => {
    if (!newDate.from) {
      setDateRange(undefined)
      return
    }
    
    if (newDate.from && !newDate.to) {
      setDateRange({
        from: newDate.from,
        fromTime: newDate.fromTime
      })
      return
    }
    
    setDateRange(newDate)
  }

  const handleClearFilters = () => {
    setProfessionIds([]);
    setFunnelIds([]);
    setDateRange(undefined);
    setSearchQuery("");
    setActiveFilter("main");
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Preservar o parâmetro de página atual
    const currentPage = params.get('page') || '1';
    
    params.delete('profession_id');
    params.delete('funnel_id');
    params.delete('from');
    params.delete('to');
    params.delete('time_from');
    params.delete('time_to');
    
    // Garantir que o parâmetro de página seja mantido
    params.set('page', currentPage);
    
    router.push(`/events?${params.toString()}`, { scroll: false });
    
    if (onFilterChange) {
      onFilterChange({
        professionId: null,
        funnelId: null,
        dateFrom: null,
        dateTo: null,
        timeFrom: null,
        timeTo: null
      });
    }
    
    window.dispatchEvent(new CustomEvent('refetch-events'));
  }

  const getFilterButtonText = () => {
    if (professionIds.length === 0 && funnelIds.length === 0) {
      return "Filtrar por profissões/funis"
    }

    const parts = []
    if (professionIds.length > 0) {
      parts.push(`${professionIds.length} ${professionIds.length === 1 ? 'profissional' : 'profissionais'}`)
    }
    if (funnelIds.length > 0) {
      parts.push(`${funnelIds.length} ${funnelIds.length === 1 ? 'funil' : 'funis'}`)
    }
    return parts.join(', ') || "Filtrar por profissões/funis"
  }

  const renderFilterContent = () => {
    if (activeFilter === "main") {
      return (
        <div className="py-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10"
              onClick={() => setActiveFilter("professions")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar por Profissões
              {professionIds.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {professionIds.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10"
              onClick={() => setActiveFilter("funnels")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar por Funis
              {funnelIds.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {funnelIds.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex items-center p-2 border-b sticky top-0 bg-white z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 mr-2"
            onClick={() => {
              setActiveFilter("main")
              setSearchQuery("")
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center px-2 py-1 rounded-md border">
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                placeholder={activeFilter === "professions" ? "Buscar por profissional" : "Buscar por funil"}
                className="border-0 p-0 focus-visible:ring-0 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="py-2 overflow-hidden">
          {activeFilter === "professions" ? (
            <div className="px-2">
              <ProfessionFilter 
                onFilterChange={handleProfessionChange}
                values={professionIds}
                searchTerm={searchQuery}
              />
            </div>
          ) : (
            <div className="px-2">
              <FunnelFilter
                onFilterChange={handleFunnelChange}
                values={funnelIds}
                searchTerm={searchQuery}
              />
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-sm h-10"
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">{getFilterButtonText()}</span>
                </div>
                {professionIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 flex-shrink-0">
                    {professionIds.length}
                  </Badge>
                )}
                {funnelIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 flex-shrink-0">
                    {funnelIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              {renderFilterContent()}
              
              {(professionIds.length > 0 || funnelIds.length > 0) && (
                <div className="border-t p-2 sticky bottom-0 bg-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full text-center justify-center text-muted-foreground h-8 text-xs"
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 gap-2 flex items-center justify-between min-w-[220px]",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  {dateRange?.from ? (
                    <span className="text-sm">
                      {dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                          {dateRange.fromTime && ` ${dateRange.fromTime}`} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                          {dateRange.toTime && ` ${dateRange.toTime}`}
                        </>
                      ) : (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                          {dateRange.fromTime && ` ${dateRange.fromTime}`} <span className="text-muted-foreground">(selecione a data final)</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm">Selecione um período</span>
                  )}
                </div>
                {dateRange?.from && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDateRange(undefined)
                      
                      // Limpar parâmetros de data da URL diretamente
                      const params = new URLSearchParams(searchParams.toString());
                      
                      // Preservar o parâmetro de página atual
                      const currentPage = params.get('page') || '1';
                      
                      params.delete('from');
                      params.delete('to');
                      params.delete('time_from');
                      params.delete('time_to');
                      
                      // Garantir que o parâmetro de página seja mantido
                      params.set('page', currentPage);
                      
                      router.push(`/events?${params.toString()}`, { scroll: false });
                      
                      // Notificar mudança
                      if (onFilterChange) {
                        onFilterChange({
                          professionId: professionIds.length > 0 ? professionIds[0] : null,
                          funnelId: funnelIds.length > 0 ? funnelIds[0] : null,
                          dateFrom: null,
                          dateTo: null,
                          timeFrom: null,
                          timeTo: null
                        });
                      }
                      
                      window.dispatchEvent(new CustomEvent('refetch-events'));
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateFilter
                onChange={handleDateChange}
                initialDate={dateRange}
              />
            </PopoverContent>
          </Popover>
          
          {/* Clear filters button */}
          {(dateRange?.from && dateRange?.to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-10 px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
      
      {/* Active filters summary */}
      {(dateRange?.from && dateRange?.to) && (
        <div className="flex flex-wrap gap-2 items-center mt-2">
          {dateRange?.from && dateRange?.to && (
            <Badge variant="secondary" className="h-7 px-2 flex items-center gap-1">
              <span>
                {format(dateRange.from, "dd/MM", { locale: ptBR })}
                {dateRange.fromTime && ` ${dateRange.fromTime}`} -{" "}
                {format(dateRange.to, "dd/MM", { locale: ptBR })}
                {dateRange.toTime && ` ${dateRange.toTime}`}
              </span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setDateRange(undefined)
                  
                  // Limpar parâmetros de data da URL diretamente
                  const params = new URLSearchParams(searchParams.toString());
                  
                  // Preservar o parâmetro de página atual
                  const currentPage = params.get('page') || '1';
                  
                  params.delete('from');
                  params.delete('to');
                  params.delete('time_from');
                  params.delete('time_to');
                  
                  // Garantir que o parâmetro de página seja mantido
                  params.set('page', currentPage);
                  
                  router.push(`/events?${params.toString()}`, { scroll: false });
                  
                  // Notificar mudança
                  if (onFilterChange) {
                    onFilterChange({
                      professionId: professionIds.length > 0 ? professionIds[0] : null,
                      funnelId: funnelIds.length > 0 ? funnelIds[0] : null,
                      dateFrom: null,
                      dateTo: null,
                      timeFrom: null,
                      timeTo: null
                    });
                  }
                  
                  window.dispatchEvent(new CustomEvent('refetch-events'));
                }}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}