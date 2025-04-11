"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DateFilter } from "../events/date-filter";

export type DateRange = {
  from?: Date;
  to?: Date;
  fromTime?: string;
  toTime?: string;
};

interface DateFilterButtonProps {
  onChange?: (dateRange: DateRange | undefined) => void;
}

export function DateFilterButton({ onChange }: DateFilterButtonProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // Função para converter string da URL em objeto de data
  function parseDateFromUrl() {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');
    
    if (from) {
      try {
        // Parse dates from URL parameters
        // For 'from' date, remove time part to get just the date
        const fromDate = from.split('T')[0];
        const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
        const fromDateObj = new Date(fromYear, fromMonth - 1, fromDay);
        
        let toDateObj: Date | undefined = undefined;
        if (to) {
          const toDate = to.split('T')[0];
          const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
          toDateObj = new Date(toYear, toMonth - 1, toDay);
        }
        
        return {
          from: fromDateObj,
          to: toDateObj,
          fromTime: timeFrom || undefined,
          toTime: timeTo || undefined
        };
      } catch (e) {
        console.error('Error parsing dates from URL:', e);
        return undefined;
      }
    }
    return undefined;
  }
  
  // Parse the date from URL parameters ao inicializar
  const [dateRange, setDateRange] = useState<DateRange | undefined>(parseDateFromUrl());

  // Sincronizar o componente quando os parâmetros da URL mudarem
  useEffect(() => {
    const newDateRange = parseDateFromUrl();
    
    // Comparar se o novo range é diferente do atual para evitar loops
    const currentFromDate = dateRange?.from?.toISOString();
    const currentToDate = dateRange?.to?.toISOString();
    const newFromDate = newDateRange?.from?.toISOString();
    const newToDate = newDateRange?.to?.toISOString();
    
    if (
      newFromDate !== currentFromDate || 
      newToDate !== currentToDate ||
      newDateRange?.fromTime !== dateRange?.fromTime ||
      newDateRange?.toTime !== dateRange?.toTime
    ) {
      setDateRange(newDateRange);
    }
  }, [searchParams]);

  // Use effect to notify parent component of date changes
  useEffect(() => {
    if (onChange) {
      onChange(dateRange);
    }
  }, [dateRange, onChange]);
  
  // Handle date filter changes
  const handleDateChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    
    // Update URL with date parameters
    const params = new URLSearchParams(searchParams.toString());
    
    if (newDateRange.from) {
      // Format start date no fuso horário de Brasília (-03:00)
      const fromYear = newDateRange.from.getFullYear();
      const fromMonth = String(newDateRange.from.getMonth() + 1).padStart(2, '0');
      const fromDay = String(newDateRange.from.getDate()).padStart(2, '0');
      const fromDate = `${fromYear}-${fromMonth}-${fromDay}T00:00:00-03:00`;
      
      params.set('from', fromDate);
      
      if (newDateRange.to) {
        // Format end date no fuso horário de Brasília (-03:00)
        const toYear = newDateRange.to.getFullYear();
        const toMonth = String(newDateRange.to.getMonth() + 1).padStart(2, '0');
        const toDay = String(newDateRange.to.getDate()).padStart(2, '0');
        const toDate = `${toYear}-${toMonth}-${toDay}T23:59:59-03:00`;
        
        params.set('to', toDate);
      } else {
        params.delete('to');
      }
      
      if (newDateRange.fromTime) {
        params.set('time_from', newDateRange.fromTime);
      } else {
        params.delete('time_from');
      }
      
      if (newDateRange.toTime) {
        params.set('time_to', newDateRange.toTime);
      } else {
        params.delete('time_to');
      }
    } else {
      params.delete('from');
      params.delete('to');
      params.delete('time_from');
      params.delete('time_to');
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  // Handle clearing the date filter
  const handleClearDateFilter = () => {
    setDateRange(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('from');
    params.delete('to');
    params.delete('time_from');
    params.delete('time_to');
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9",
              dateRange && "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
            )}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
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
                    {dateRange.fromTime && ` ${dateRange.fromTime}`}
                  </>
                )}
              </span>
            ) : (
              <span className="text-sm">Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]" align="start" sideOffset={5}>
          <DateFilter onChange={handleDateChange} initialDate={dateRange} />
        </PopoverContent>
      </Popover>

      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleClearDateFilter}
          title="Limpar filtro de período"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 