'use client'

import { useState, useEffect, useCallback } from "react"
import { Calendar as CalendarIcon, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays, setHours, setMinutes, setSeconds, isTuesday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { 
  formatISOWithBrazilTimezone, 
  generateWebinarCycleDates, 
  isValidWebinarDate 
} from "@/app/lib/webinar-utils"

interface WebinarCycleFilterProps {
  onChange?: (cycleData: {
    type: 'captacao' | 'vendas';
    pesquisa_inicio?: string;
    pesquisa_fim?: string;
    venda_inicio?: string;
    venda_fim?: string;
  }) => void;
  initialType?: 'captacao' | 'vendas';
  initialDate?: Date;
}

export function WebinarCycleFilter({ onChange, initialType = 'captacao', initialDate }: WebinarCycleFilterProps) {
  // Estado para controlar a data selecionada (apenas terças-feiras)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  // Estado para controlar o tipo de filtro de ciclo
  const [filterType, setFilterType] = useState<'captacao' | 'vendas'>(initialType as 'captacao' | 'vendas');
  // Estado para controlar o popover
  const [isOpen, setIsOpen] = useState(false);

  // Função para verificar se é terça-feira
  const isTuesdayDate = (date: Date) => {
    return isTuesday(date);
  };

  // Usando a função do utilitário centralizado para gerar datas do ciclo
  const generateCycleDates = useCallback((tuesdayDate: Date) => {
    if (!isValidWebinarDate(tuesdayDate)) {
      throw new Error("A data deve ser uma terça-feira");
    }
    
    try {
      // Usar a implementação centralizada
      return generateWebinarCycleDates(tuesdayDate);
    } catch (error) {
      console.error("Erro ao gerar datas do ciclo:", error);
      throw error;
    }
  }, []);

  // Efeito para inicializar com a primeira terça-feira disponível se nenhuma data for fornecida
  useEffect(() => {
    if (!selectedDate && !initialDate) {
      const today = new Date();
      let nextTuesday = new Date(today);
      
      // Avançar até a próxima terça-feira
      while (!isTuesdayDate(nextTuesday)) {
        nextTuesday.setDate(nextTuesday.getDate() + 1);
      }
      
      setSelectedDate(nextTuesday);
    }
  }, [selectedDate, initialDate]);

  // Função para aplicar o filtro
  const applyFilter = useCallback(() => {
    if (!selectedDate || !isTuesdayDate(selectedDate)) {
      return;
    }

    const cycleDates = generateCycleDates(selectedDate);
    
    if (onChange) {
      onChange({
        type: filterType,
        ...cycleDates
      });
    }
    
    setIsOpen(false);
  }, [selectedDate, filterType, onChange, generateCycleDates]);

  // Handler de seleção de data
  const handleDateSelect = (date: Date | undefined) => {
    if (date && isTuesdayDate(date)) {
      setSelectedDate(date);
    } else if (date) {
      // Se não for terça-feira, encontrar a próxima terça-feira
      let nextTuesday = new Date(date);
      while (!isTuesdayDate(nextTuesday)) {
        nextTuesday.setDate(nextTuesday.getDate() + 1);
      }
      setSelectedDate(nextTuesday);
    }
  };

  // Render do componente
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left w-full md:w-[240px] pl-3 text-muted-foreground font-normal",
            selectedDate && "text-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            <span>
              {`Ciclo de ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`}
            </span>
          ) : (
            <span>Selecione um ciclo</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 pb-0">
          <div className="space-y-2 mb-3">
            <div className="font-medium text-sm">Tipo de filtro</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterType === 'captacao' ? "default" : "outline"}
                onClick={() => setFilterType('captacao')}
                className="flex-1"
              >
                Captação
              </Button>
              <Button
                size="sm"
                variant={filterType === 'vendas' ? "default" : "outline"}
                onClick={() => setFilterType('vendas')}
                className="flex-1"
              >
                Vendas
              </Button>
            </div>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => !isTuesdayDate(date)}
          modifiers={{ selected: selectedDate ? [selectedDate] : [] }}
          locale={ptBR}
          initialFocus
        />
        <div className="p-3 border-t flex justify-between">
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={applyFilter}
            disabled={!selectedDate || !isTuesdayDate(selectedDate)}
          >
            <Check className="h-4 w-4 mr-2" />
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 