'use client'

import { useState, useEffect } from "react"
import { Search, Filter, X, ChevronLeft, Calendar, SlidersHorizontal, Plus, Trash2 } from "lucide-react"
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
import { columns } from "./columns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AdvancedFilter {
  id: string;
  property: string;
  operator: string;
  value: string;
}

interface EventsFiltersProps {
  onFilterChange?: (filters: { 
    professionId?: string | null | undefined; 
    funnelId?: string | null | undefined;
    dateFrom?: string | null | undefined;
    dateTo?: string | null | undefined;
    timeFrom?: string | null | undefined;
    timeTo?: string | null | undefined;
    advancedFilters?: AdvancedFilter[];
    filterCondition?: 'AND' | 'OR';
  }) => void;
  initialFilters?: {
    professionId?: string;
    funnelId?: string;
    dateFrom?: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
    advancedFilters?: AdvancedFilter[];
    filterCondition?: 'AND' | 'OR';
  };
}

export function EventsFilters({ onFilterChange, initialFilters = {} }: EventsFiltersProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"main" | "professions" | "funnels" | "advanced">("main")
  
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

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([
    { id: '1', property: 'user.fullname', operator: 'equals', value: '' }
  ]);
  
  const [filterCondition, setFilterCondition] = useState<'AND' | 'OR'>('AND');
  
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [pendingAdvancedFilters, setPendingAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [pendingFilterCondition, setPendingFilterCondition] = useState<'AND' | 'OR'>('AND');
  
  // Flag para evitar loops infinitos de atualização
  const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);
  
  // Inicializar os estados a partir da URL na primeira montagem
  useEffect(() => {
    // Se temos initialFilters, eles têm prioridade
    if (Object.keys(initialFilters).length > 0) return;
    
    // Carregar da URL
    const urlProfessionIds = searchParams.get('profession_id');
    if (urlProfessionIds) {
      setProfessionIds(urlProfessionIds.split(','));
    }
    
    const urlFunnelIds = searchParams.get('funnel_id');
    if (urlFunnelIds) {
      setFunnelIds(urlFunnelIds.split(','));
    }
    
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const fromTime = searchParams.get('time_from');
    const toTime = searchParams.get('time_to');
    
    if (fromDate) {
      setDateRange({
        from: new Date(fromDate),
        to: toDate ? new Date(toDate) : undefined,
        fromTime: fromTime || undefined,
        toTime: toTime || undefined
      });
    }
    
    try {
      const advancedFiltersParam = searchParams.get('advanced_filters');
      if (advancedFiltersParam) {
        const parsedFilters = JSON.parse(advancedFiltersParam);
        // Remover quaisquer filtros baseados em event_time
        const validFilters = parsedFilters.filter((f: AdvancedFilter) => f.property !== 'event_time');
        
        if (validFilters.length > 0) {
          setAdvancedFilters(validFilters);
        }
      }
    } catch (e) {
      console.error('Erro ao processar filtros avançados da URL na inicialização:', e);
    }
    
    const urlFilterCondition = searchParams.get('filter_condition') as 'AND' | 'OR';
    if (urlFilterCondition) {
      setFilterCondition(urlFilterCondition);
    }
  }, [searchParams, initialFilters]);
  
  // Sincronizar o estado com a URL sempre que ela mudar
  useEffect(() => {
    setIsUpdatingFromUrl(true);
    
    // Atualizar professionIds a partir da URL
    const urlProfessionIds = searchParams.get('profession_id');
    const newProfessionIds = urlProfessionIds ? urlProfessionIds.split(',') : [];
    if (JSON.stringify(newProfessionIds) !== JSON.stringify(professionIds)) {
      setProfessionIds(newProfessionIds);
    }
    
    // Atualizar funnelIds a partir da URL
    const urlFunnelIds = searchParams.get('funnel_id');
    const newFunnelIds = urlFunnelIds ? urlFunnelIds.split(',') : [];
    if (JSON.stringify(newFunnelIds) !== JSON.stringify(funnelIds)) {
      setFunnelIds(newFunnelIds);
    }
    
    // Atualizar dateRange a partir da URL
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const fromTime = searchParams.get('time_from');
    const toTime = searchParams.get('time_to');
    
    const newDateRange = fromDate 
      ? {
          from: new Date(fromDate),
          to: toDate ? new Date(toDate) : undefined,
          fromTime: fromTime || undefined,
          toTime: toTime || undefined
        } 
      : undefined;
    
    // Comparação simples para evitar atualizações desnecessárias
    const currentFromDate = dateRange?.from?.toISOString();
    const currentToDate = dateRange?.to?.toISOString();
    
    if (
      (fromDate !== currentFromDate) || 
      (toDate !== currentToDate) || 
      (fromTime !== dateRange?.fromTime) || 
      (toTime !== dateRange?.toTime)
    ) {
      setDateRange(newDateRange);
    }
    
    // Atualizar advancedFilters a partir da URL
    try {
      const advancedFiltersParam = searchParams.get('advanced_filters');
      console.log('Parâmetro de filtros avançados na URL:', advancedFiltersParam);
      
      let newAdvancedFilters;
      
      if (advancedFiltersParam) {
        const parsedFilters = JSON.parse(advancedFiltersParam);
        console.log('Filtros avançados parseados:', parsedFilters);
        // Remover quaisquer filtros baseados em event_time
        const validFilters = parsedFilters.filter((f: AdvancedFilter) => f.property !== 'event_time');
        
        newAdvancedFilters = validFilters.length > 0 
          ? validFilters 
          : [{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }];
      } else {
        // Se não há filtros na URL, reseta para o filtro padrão vazio
        newAdvancedFilters = [{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }];
      }
      
      // Só atualiza se os filtros forem realmente diferentes
      if (JSON.stringify(newAdvancedFilters) !== JSON.stringify(advancedFilters)) {
        console.log('Atualizando filtros avançados para:', newAdvancedFilters);
        setAdvancedFilters(newAdvancedFilters);
      }
    } catch (e) {
      console.error('Erro ao processar filtros avançados da URL:', e);
      // Em caso de erro, reseta para o filtro padrão vazio
      setAdvancedFilters([{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }]);
    }
    
    // Atualizar filterCondition a partir da URL
    const urlFilterCondition = searchParams.get('filter_condition') as 'AND' | 'OR';
    if (urlFilterCondition && urlFilterCondition !== filterCondition) {
      setFilterCondition(urlFilterCondition);
    } else if (!urlFilterCondition && filterCondition !== 'AND') {
      setFilterCondition('AND');
    }
    
    // Definir um timeout para resetar a flag, garantindo que os estados tenham tempo de atualizar
    setTimeout(() => {
      setIsUpdatingFromUrl(false);
    }, 100);
    
  }, [searchParams]);
  
  useEffect(() => {
    if (isUpdatingFromUrl) return; // Não atualizar a URL se a mudança veio da própria URL
    
    if (advancedFilterOpen) {
      setPendingAdvancedFilters([...advancedFilters]);
      setPendingFilterCondition(filterCondition);
    }
  }, [advancedFilterOpen, advancedFilters, filterCondition, isUpdatingFromUrl]);
  
  useEffect(() => {
    if (isUpdatingFromUrl) return; // Não atualizar a URL se a mudança veio da própria URL
    
    if (!(dateRange?.from && !dateRange?.to)) {
      updateUrl();
    }
  }, [professionIds, funnelIds, dateRange, advancedFilters, filterCondition, isUpdatingFromUrl]);
  
  const updateUrl = () => {
    // Se estamos atualizando a partir da URL, não precisamos atualizar de volta
    if (isUpdatingFromUrl) return;

    // Evitar atualização se tiver só data inicial sem data final
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
    
    // Adicionar filtros avançados à URL
    const filtersWithValues = advancedFilters.filter(f => f.value.trim() !== '');
    if (filtersWithValues.length > 0) {
      params.set('advanced_filters', JSON.stringify(filtersWithValues));
      params.set('filter_condition', filterCondition);
    } else {
      params.delete('advanced_filters');
      params.delete('filter_condition');
    }
    
    // Garantir que o parâmetro de página seja mantido
    params.set('page', currentPage);
    
    // Preservar parâmetros de ordenação e limite
    const sortBy = searchParams.get('sortBy');
    const sortDirection = searchParams.get('sortDirection');
    const limit = searchParams.get('limit');
    
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDirection) params.set('sortDirection', sortDirection);
    if (limit) params.set('limit', limit);
    
    const newUrl = `/events?${params.toString()}`
    router.push(newUrl, { scroll: false })
    
    if (onFilterChange) {
      onFilterChange({
        professionId: professionIds.length > 0 ? professionIds.join(',') : null,
        funnelId: funnelIds.length > 0 ? funnelIds.join(',') : null,
        dateFrom: dateRange?.from ? dateRange.from.toISOString() : null,
        dateTo: dateRange?.to ? dateRange.to.toISOString() : null,
        timeFrom: dateRange?.fromTime || null,
        timeTo: dateRange?.toTime || null,
        advancedFilters: filtersWithValues.length > 0 ? filtersWithValues : undefined,
        filterCondition: filtersWithValues.length > 0 ? filterCondition : undefined
      });
    }
    
    window.dispatchEvent(new CustomEvent('refetch-events'))
  }
  
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

  const handleAdvancedFilterChange = (index: number, field: keyof AdvancedFilter, value: string) => {
    const newFilters = [...pendingAdvancedFilters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setPendingAdvancedFilters(newFilters);
  };

  const addFilter = () => {
    const newId = (pendingAdvancedFilters.length + 1).toString();
    setPendingAdvancedFilters([...pendingAdvancedFilters, { id: newId, property: 'user.fullname', operator: 'equals', value: '' }]);
  };

  const removeFilter = (index: number) => {
    if (pendingAdvancedFilters.length <= 1) return;
    const newFilters = pendingAdvancedFilters.filter((_, i) => i !== index);
    setPendingAdvancedFilters(newFilters);
  };

  const saveAdvancedFilters = () => {
    // Filtrar qualquer filtro de data (event_time) antes de salvar
    const validFilters = pendingAdvancedFilters.filter(
      (f) => f.property !== 'event_time'
    );
    
    // Se não sobrarem filtros válidos, adicionamos um filtro padrão vazio
    const filtersToSave = validFilters.length > 0 
      ? validFilters 
      : [{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }];
      
    setAdvancedFilters(filtersToSave);
    setFilterCondition(pendingFilterCondition);
    setAdvancedFilterOpen(false);
    // updateUrl será chamado pelo useEffect quando advancedFilters ou filterCondition mudarem
  };

  const handleClearFilters = () => {
    setProfessionIds([]);
    setFunnelIds([]);
    setDateRange(undefined);
    setSearchQuery("");
    setActiveFilter("main");
    setAdvancedFilters([{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }]);
    setFilterCondition('AND');
    
    const params = new URLSearchParams(searchParams.toString());
    
    // Preservar parâmetros de página, ordenação e limite
    const currentPage = params.get('page') || '1';
    const sortBy = params.get('sortBy');
    const sortDirection = params.get('sortDirection');
    const limit = params.get('limit');
    
    // Limpar todos os parâmetros de filtro
    params.delete('profession_id');
    params.delete('funnel_id');
    params.delete('from');
    params.delete('to');
    params.delete('time_from');
    params.delete('time_to');
    params.delete('advanced_filters');
    params.delete('filter_condition');
    
    // Restaurar parâmetros preservados
    params.set('page', currentPage);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDirection) params.set('sortDirection', sortDirection);
    if (limit) params.set('limit', limit);
    
    router.push(`/events?${params.toString()}`, { scroll: false });
    
    if (onFilterChange) {
      onFilterChange({
        professionId: null,
        funnelId: null,
        dateFrom: null,
        dateTo: null,
        timeFrom: null,
        timeTo: null,
        advancedFilters: undefined,
        filterCondition: undefined
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
        <div className="p-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10"
              onClick={() => {
                setActiveFilter("professions")
                setSearchQuery("")
              }}
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
              onClick={() => {
                setActiveFilter("funnels")
                setSearchQuery("")
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar por Funis
              {funnelIds.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {funnelIds.length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10"
              onClick={() => {
                setPendingAdvancedFilters([...advancedFilters]);
                setPendingFilterCondition(filterCondition);
                setAdvancedFilterOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros Avançados
              {advancedFilters.some(f => f.value.trim() !== '') && (
                <Badge variant="secondary" className="ml-auto">
                  {advancedFilters.filter(f => f.value.trim() !== '').length}
                </Badge>
              )}
            </Button>
          </div>
          
          <hr className="my-2" />
          
          {/* Buttons */}
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleClearFilters}
            >
              Limpar
            </Button>
          </div>
        </div>
      )
    }
    
    if (activeFilter === "professions") {
      return (
        <div className="p-2 w-full">
          <div className="flex items-center mb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 px-2"
              onClick={() => {
                setActiveFilter("main")
                setSearchQuery("")
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar profissão..."
              className="pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-2">
            <ProfessionFilter 
              values={professionIds} 
              onFilterChange={handleProfessionChange}
              searchTerm={searchQuery}
            />
          </div>
        </div>
      )
    }
    
    if (activeFilter === "funnels") {
      return (
        <div className="p-2 w-full">
          <div className="flex items-center mb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 px-2"
              onClick={() => {
                setActiveFilter("main")
                setSearchQuery("")
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funil..."
              className="pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-2">
            <FunnelFilter 
              values={funnelIds} 
              onFilterChange={handleFunnelChange}
              searchTerm={searchQuery}
            />
          </div>
        </div>
      )
    }

    if (activeFilter === "advanced") {
      return (
        <div className="py-2 min-w-[400px]">
          <div className="flex items-center pb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 px-2"
              onClick={() => setActiveFilter("main")}
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <span className="font-medium ml-2">Filtros Avançados</span>
          </div>
          
          <hr className="my-2" />
          
          <div className="p-2">
            <h3 className="text-sm font-medium mb-4">Use filtros avançados para encontrar eventos específicos</h3>
            
            {pendingAdvancedFilters.map((filter, index) => (
              <div key={filter.id} className="mb-4 space-y-3">
                {index > 0 && (
                  <div className="flex items-center justify-start my-2">
                    <div className="text-sm font-medium text-center px-4 py-1 bg-gray-100 rounded-md">
                      {pendingFilterCondition}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Label className="text-xs mb-1 block">Propriedade</Label>
                    <Select
                      value={filter.property}
                      onValueChange={(value) => handleAdvancedFilterChange(index, 'property', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns
                          // Removemos a opção de data do filtro avançado pois já existe um filtro específico para datas
                          .filter(column => column.accessorKey !== 'event_time')
                          .map((column) => (
                          <SelectItem key={column.accessorKey} value={column.accessorKey}>
                            {column.header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs mb-1 block">Operador</Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => handleAdvancedFilterChange(index, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">igual a</SelectItem>
                        <SelectItem value="contains">contém</SelectItem>
                        <SelectItem value="not_contains">não contém</SelectItem>
                        <SelectItem value="not_equals">diferente de</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs mb-1 block">Valor</Label>
                    {filter.property === "event_type" ? (
                      <Select
                        value={filter.value}
                        onValueChange={(value) => handleAdvancedFilterChange(index, 'value', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEAD">LEAD</SelectItem>
                          <SelectItem value="INITIATE_CHECKOUT">INITIATE_CHECKOUT</SelectItem>
                          <SelectItem value="ADD_PAYMENT_INFO">ADD_PAYMENT_INFO</SelectItem>
                          <SelectItem value="PURCHASE">PURCHASE</SelectItem>
                          <SelectItem value="PAGEVIEW">PAGEVIEW</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={filter.value}
                        onChange={(e) => handleAdvancedFilterChange(index, 'value', e.target.value)}
                        placeholder="Valor"
                      />
                    )}
                  </div>
                  
                  <div className="col-span-1 flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFilter(index)}
                      disabled={pendingAdvancedFilters.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingAdvancedFilters.length > 1 && (
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Condição entre filtros</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={pendingFilterCondition === 'AND' ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setPendingFilterCondition('AND')}
                      className="text-xs"
                    >
                      AND (E)
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={pendingFilterCondition === 'OR' ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setPendingFilterCondition('OR')}
                      className="text-xs"
                    >
                      OR (OU)
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-3 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={addFilter}
              >
                <Plus className="h-4 w-4" />
                Adicionar outro filtro
              </Button>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 flex whitespace-nowrap",
              (professionIds.length > 0 || funnelIds.length > 0 || advancedFilters.some(f => f.value.trim() !== '')) && 
              "bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400"
            )}
          >
            <Filter className="h-3.5 w-3.5 mr-2" />
            {getFilterButtonText()}
            {advancedFilters.some(f => f.value.trim() !== '') && (
              <Badge variant="secondary" className="ml-2">
                {advancedFilters.filter(f => f.value.trim() !== '').length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[260px]" align="start" sideOffset={5}>
          {renderFilterContent()}
        </PopoverContent>
      </Popover>

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

      {/* Advanced Filters Dialog */}
      <Dialog open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Use filtros avançados para encontrar eventos específicos com base em qualquer propriedade.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {pendingAdvancedFilters.map((filter, index) => (
              <div key={filter.id} className="mb-4 space-y-3">
                {index > 0 && (
                  <div className="flex items-center justify-start my-2">
                    <div className="text-sm font-medium text-center px-4 py-1 bg-gray-100 rounded-md">
                      {pendingFilterCondition}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Label className="text-xs mb-1 block">Propriedade</Label>
                    <Select
                      value={filter.property}
                      onValueChange={(value) => handleAdvancedFilterChange(index, 'property', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns
                          // Removemos a opção de data do filtro avançado pois já existe um filtro específico para datas
                          .filter(column => column.accessorKey !== 'event_time')
                          .map((column) => (
                          <SelectItem key={column.accessorKey} value={column.accessorKey}>
                            {column.header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs mb-1 block">Operador</Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => handleAdvancedFilterChange(index, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">igual a</SelectItem>
                        <SelectItem value="contains">contém</SelectItem>
                        <SelectItem value="not_contains">não contém</SelectItem>
                        <SelectItem value="not_equals">diferente de</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs mb-1 block">Valor</Label>
                    {filter.property === "event_type" ? (
                      <Select
                        value={filter.value}
                        onValueChange={(value) => handleAdvancedFilterChange(index, 'value', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEAD">LEAD</SelectItem>
                          <SelectItem value="INITIATE_CHECKOUT">INITIATE_CHECKOUT</SelectItem>
                          <SelectItem value="ADD_PAYMENT_INFO">ADD_PAYMENT_INFO</SelectItem>
                          <SelectItem value="PURCHASE">PURCHASE</SelectItem>
                          <SelectItem value="PAGEVIEW">PAGEVIEW</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={filter.value}
                        onChange={(e) => handleAdvancedFilterChange(index, 'value', e.target.value)}
                        placeholder="Valor"
                      />
                    )}
                  </div>
                  
                  <div className="col-span-1 flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFilter(index)}
                      disabled={pendingAdvancedFilters.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingAdvancedFilters.length > 1 && (
              <div className="mb-4">
                <Label className="text-xs mb-2 block">Condição entre filtros</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={pendingFilterCondition === 'AND' ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setPendingFilterCondition('AND')}
                      className="text-xs"
                    >
                      AND (E)
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={pendingFilterCondition === 'OR' ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setPendingFilterCondition('OR')}
                      className="text-xs"
                    >
                      OR (OU)
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col space-y-3 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={addFilter}
              >
                <Plus className="h-4 w-4" />
                Adicionar outro filtro
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedFilterOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={saveAdvancedFilters}
            >
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}