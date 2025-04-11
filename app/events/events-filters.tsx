'use client'

import { useState, useEffect, useRef, useMemo } from "react"
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
import { 
  toBrazilianTime, 
  formatBrazilianDate, 
  getBrazilianStartOfDay, 
  getBrazilianEndOfDay, 
  BRAZIL_TIMEZONE 
} from "@/lib/date-utils"

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
    try {
      // Check if we have filter data
      if (initialFilters?.dateFrom) {
        return {
          from: new Date(initialFilters.dateFrom),
          to: initialFilters.dateTo ? new Date(initialFilters.dateTo) : undefined,
          fromTime: initialFilters.timeFrom,
          toTime: initialFilters.timeTo
        };
      }
      
      // Get from URL if available
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');
      const fromTimeParam = searchParams.get('time_from');
      const toTimeParam = searchParams.get('time_to');
      
      if (fromParam) {
        return {
          from: new Date(fromParam),
          to: toParam ? new Date(toParam) : undefined,
          fromTime: fromTimeParam || undefined,
          toTime: toTimeParam || undefined
        };
      }
      
      return undefined;
    } catch (error) {
      console.error("Error parsing date range:", error);
      return undefined;
    }
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
  const [isUpdatingDirectly, setIsUpdatingDirectly] = useState(false);
  
  // Add ref to prevent loops
  const isUpdatingRef = useRef(false);
  
  // Novo efeito para sincronizar estado visual com filtros da URL e abrir se necessário
  useEffect(() => {
    // Evite executar se estamos atualizando a URL
    if (isUpdatingRef.current || isUpdatingDirectly) return;
    
    try {
      // Verificar se há filtros avançados na URL
      const advancedFiltersParam = searchParams.get('advanced_filters');
      if (advancedFiltersParam) {
        const parsedFilters = JSON.parse(advancedFiltersParam);
        
        // Verificar se os filtros são válidos e contêm valores
        const hasRealFilters = Array.isArray(parsedFilters) && 
                              parsedFilters.length > 0 &&
                              parsedFilters.some(f => f.value && f.value.trim() !== '');
                              
        if (hasRealFilters) {
          console.log('🔍 Found active advanced filters in URL:', 
                      parsedFilters.filter(f => f.value && f.value.trim() !== '').length);
          
          // Verificar se há diferença entre o estado atual e os filtros na URL
          const currentFilterValues = JSON.stringify(advancedFilters);
          const urlFilterValues = JSON.stringify(parsedFilters);
          
          if (currentFilterValues !== urlFilterValues) {
            console.log('Updating filters UI state to match URL');
            
            // Atualizar estado dos filtros avançados
            setAdvancedFilters(parsedFilters);
            
            // Atualizar também os filtros pendentes (usados no modal de edição)
            setPendingAdvancedFilters(parsedFilters);
            
            // Verificar se há condição de filtro
            const filterConditionParam = searchParams.get('filter_condition') as 'AND' | 'OR';
            if (filterConditionParam) {
              setFilterCondition(filterConditionParam);
              setPendingFilterCondition(filterConditionParam);
            }
            
            // Opcional: Se for a primeira vez que detectamos filtros, mostrar o modal
            const isFirstNavigation = sessionStorage.getItem('advanced_filters_shown') !== 'true';
            if (isFirstNavigation) {
              sessionStorage.setItem('advanced_filters_shown', 'true');
              // Descomentar esta linha para abrir o modal automaticamente na primeira vez
              // setAdvancedFilterOpen(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error synchronizing advanced filters from URL:', error);
    }
  }, [searchParams, isUpdatingDirectly, advancedFilters]);
  
  // Helper function to get current filters from URL
  const getFiltersFromUrl = () => {
    return {
      professionId: professionIds.length > 0 ? professionIds.join(',') : null,
      funnelId: funnelIds.length > 0 ? funnelIds.join(',') : null
    };
  };
  
  // Inicializar os estados a partir da URL na primeira montagem
  useEffect(() => {
    // Avoid any updates when this effect runs
    setIsUpdatingDirectly(true);
    isUpdatingRef.current = true;
    
    // Check if initialFilters were provided
    const hasInitialFilters = Object.keys(initialFilters).length > 0;
    
    // Check if there are any URL parameters that indicate existing filters
    const hasExistingFilters = searchParams.toString() !== "";
    
    // Auto-apply current day filter on first component mount if no date filter is set
    // BUT only if there are no existing filters of any kind
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (!fromParam && !toParam && !hasInitialFilters && !hasExistingFilters) {
      console.log("Auto-applying current day filter on component mount");
      
      // Get today's date in Brazilian timezone
      const today = new Date();
      const brazilianToday = toBrazilianTime(today);
      const startOfDay = getBrazilianStartOfDay(brazilianToday);
      const endOfDay = getBrazilianEndOfDay(brazilianToday);
      
      // Set date range in component state
      setDateRange({
        from: brazilianToday,
        to: brazilianToday
      });
      
      // Update filters with current day
      if (onFilterChange) {
        onFilterChange({
          ...getFiltersFromUrl(),
          dateFrom: startOfDay,
          dateTo: endOfDay
        });
      }
      
      // Update URL directly in a non-reactive way
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', startOfDay);
      params.set('to', endOfDay);
      
      // Preserve other params
      if (params.has('page')) {
        params.set('page', '1'); // Reset to page 1 when applying filter
      } else {
        params.set('page', '1');
      }
      
      // Update URL without triggering a re-render
      router.push(`/events?${params.toString()}`, { scroll: false });
    } else {
      // If date filters exist, use them
      try {
        if (fromParam) {
          const fromDate = new Date(fromParam);
          let toDate = undefined;
          
          if (toParam) {
            toDate = new Date(toParam);
          }
          
          setDateRange({
            from: fromDate,
            to: toDate,
            fromTime: searchParams.get('time_from') || undefined,
            toTime: searchParams.get('time_to') || undefined
          });
        }
      } catch (error) {
        console.error("Error setting initial date range:", error);
      }
    }
    
    // Se temos initialFilters, eles têm prioridade
    if (hasInitialFilters) return;
    
    // Carregar profissões e funis da URL
    const urlProfessionIds = searchParams.get('profession_id');
    if (urlProfessionIds) {
      setProfessionIds(urlProfessionIds.split(','));
    }
    
    const urlFunnelIds = searchParams.get('funnel_id');
    if (urlFunnelIds) {
      setFunnelIds(urlFunnelIds.split(','));
    }
    
    // Process advanced filters
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
    
    // Release the update lock after initialization
    setTimeout(() => {
      setIsUpdatingDirectly(false);
      isUpdatingRef.current = false;
    }, 500);
    
  }, []);
  
  // Sincronizar o estado com a URL sempre que ela mudar
  useEffect(() => {
    // Avoid synchronizing if we're updating the URL ourselves
    if (isUpdatingDirectly || isUpdatingRef.current) return;
    
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
    
    // Safer comparison that doesn't trigger infinite updates
    const shouldUpdateDateRange = (() => {
      // If one has a value and the other doesn't, they're different
      if ((fromDate && !dateRange?.from) || (!fromDate && dateRange?.from)) {
        return true;
      }
      
      if ((toDate && !dateRange?.to) || (!toDate && dateRange?.to)) {
        return true;
      }
      
      // If both have values, compare date parts only (not time)
      if (fromDate && dateRange?.from) {
        const urlFromDate = new Date(fromDate).toISOString().split('T')[0]; 
        const stateFromDate = dateRange.from.toISOString().split('T')[0];
        if (urlFromDate !== stateFromDate) {
          return true;
        }
      }
      
      if (toDate && dateRange?.to) {
        const urlToDate = new Date(toDate).toISOString().split('T')[0]; 
        const stateToDate = dateRange.to.toISOString().split('T')[0];
        if (urlToDate !== stateToDate) {
          return true;
        }
      }
      
      // Check time values
      if (fromTime !== dateRange?.fromTime || toTime !== dateRange?.toTime) {
        return true;
      }
      
      return false;
    })();
    
    if (shouldUpdateDateRange) {
      setDateRange(newDateRange);
    }
    
    // Atualizar advancedFilters a partir da URL
    try {
      const advancedFiltersParam = searchParams.get('advanced_filters');
      
      // Verificar se os filtros avançados desapareceram inesperadamente
      const hasCurrentFilters = advancedFilters.some(f => f.value.trim() !== '');
      if (hasCurrentFilters && !advancedFiltersParam) {
        console.warn('ALERTA: Filtros avançados desapareceram da URL. Restaurando...');
        // Agendar uma atualização da URL para restaurar os filtros
        setTimeout(() => {
          if (!isUpdatingDirectly) {
            updateUrl();
          }
        }, 300);
      }
      
      let newAdvancedFilters;
      
      if (advancedFiltersParam) {
        const parsedFilters = JSON.parse(advancedFiltersParam);
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
  
  // Simplify the main useEffect for updating URL based on filters
  // Keep only one useEffect for URL updates instead of multiple competing ones
  useEffect(() => {
    // Skip if we're already updating from URL changes
    if (isUpdatingFromUrl || isUpdatingDirectly || isUpdatingRef.current) return;
    
    // Quick check to avoid unnecessary updates
    if (dateRange?.from && !dateRange?.to) return;
    
    // Set the flag to prevent recursive updates
    isUpdatingRef.current = true;
    
    const timeoutId = setTimeout(() => {
      updateUrl();
      // Reset the flag after a delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 200);
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [professionIds, funnelIds, dateRange, advancedFilters, filterCondition]);
  
  // Adicionar log para depuração dos filtros avançados
  useEffect(() => {
    if (advancedFilters.some(f => f.value.trim() !== '')) {
      // Log aqui se necessário para debug
    }
  }, [advancedFilters, filterCondition]);
  
  // Simplify updateUrl function to be more stable and resilient
  const updateUrl = () => {
    // Skip if we're already processing URL updates
    if (isUpdatingFromUrl || isUpdatingRef.current) {
      return;
    }

    // Avoid updates with incomplete date range
    if (dateRange?.from && !dateRange?.to) {
      return;
    }
    
    // Set flags to prevent recursive updates
    setIsUpdatingDirectly(true);
    isUpdatingRef.current = true;
    
    // Create new params object to avoid modifying existing searchParams
    const params = new URLSearchParams();
    
    // Copy non-date parameters from current URL
    searchParams.forEach((value, key) => {
      if (!['from', 'to', 'time_from', 'time_to', 'profession_id', 'funnel_id', 'advanced_filters', 'filter_condition'].includes(key)) {
        params.set(key, value);
      }
    });
    
    // Preserve page parameter
    const currentPage = searchParams.get('page') || '1';
    params.set('page', currentPage);
    
    // Add profession and funnel IDs if available
    if (professionIds.length > 0) {
      params.set('profession_id', professionIds.join(','));
    }
    
    if (funnelIds.length > 0) {
      params.set('funnel_id', funnelIds.join(','));
    }

    // Add date range parameters
    let formattedFrom: string | null = null;
    let formattedTo: string | null = null;

    if (dateRange?.from) {
      // Format dates for Brazil timezone
      const from = dateRange.from;
      const year = from.getFullYear();
      const month = String(from.getMonth() + 1).padStart(2, '0');
      const day = String(from.getDate()).padStart(2, '0');
      formattedFrom = `${year}-${month}-${day}T00:00:00-03:00`;
      
      params.set('from', formattedFrom);
      
      if (dateRange.to) {
        const to = dateRange.to;
        const toYear = to.getFullYear();
        const toMonth = String(to.getMonth() + 1).padStart(2, '0');
        const toDay = String(to.getDate()).padStart(2, '0');
        formattedTo = `${toYear}-${toMonth}-${toDay}T23:59:59-03:00`;
        
        params.set('to', formattedTo);
      }
      
      if (dateRange.fromTime) {
        params.set('time_from', dateRange.fromTime);
      }
      
      if (dateRange.toTime) {
        params.set('time_to', dateRange.toTime);
      }
    }
    
    // Add advanced filters
    const filtersWithValues = advancedFilters.filter(
      filter => filter.property && filter.operator && filter.value.trim() !== ''
    );
    
    if (filtersWithValues.length > 0) {
      try {
        const filterJson = JSON.stringify(filtersWithValues);
        params.set('advanced_filters', filterJson);
        params.set('filter_condition', filterCondition);
      } catch (e) {
        console.error('Erro ao serializar filtros avançados:', e);
      }
    }
    
    // Add sorting parameters
    const sortBy = searchParams.get('sortBy');
    const sortDirection = searchParams.get('sortDirection');
    const limit = searchParams.get('limit');
    
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDirection) params.set('sortDirection', sortDirection);
    if (limit) params.set('limit', limit);
    
    // Check if URL has changed to avoid unnecessary updates
    const currentUrl = searchParams.toString();
    const newParamsString = params.toString();
    
    if (currentUrl === newParamsString) {
      console.log('URL já está atualizada, ignorando');
      setIsUpdatingDirectly(false);
      isUpdatingRef.current = false;
      return;
    }
    
    console.log('Atualizando URL:', newParamsString);
    const newUrl = `/events?${params.toString()}`;
    router.push(newUrl, { scroll: false });
    
    // Reset flags after a delay to allow URL update to complete
    const timeoutId = setTimeout(() => {
      setIsUpdatingDirectly(false);
      isUpdatingRef.current = false;
    }, 500);
    
    // Notify parent about filter changes
    if (onFilterChange) {
      onFilterChange({
        professionId: professionIds.length > 0 ? professionIds.join(',') : null,
        funnelId: funnelIds.length > 0 ? funnelIds.join(',') : null,
        dateFrom: dateRange?.from ? formattedFrom : null,
        dateTo: dateRange?.to ? formattedTo : null,
        timeFrom: dateRange?.fromTime || null,
        timeTo: dateRange?.toTime || null,
        advancedFilters: filtersWithValues.length > 0 ? filtersWithValues : undefined,
        filterCondition: filtersWithValues.length > 0 ? filterCondition : undefined
      });
    }
    
    // Dispatch refetch event if URL has changed
    if (currentUrl !== newParamsString) {
      window.dispatchEvent(new CustomEvent('refetch-events'));
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  };
  
  const handleProfessionChange = (newIds: string[]) => {
    setProfessionIds(newIds)
  }
  
  const handleFunnelChange = (newIds: string[]) => {
    setFunnelIds(newIds)
  }

  const handleDateChange = (newDateRange: any) => {
    // If newDateRange is undefined or empty, don't do anything automatically
    if (!newDateRange || (!newDateRange.from && !newDateRange.to)) {
      return;
    }
    
    // Otherwise, proceed with filtering as before
    let range = newDateRange;
    
    // Formatar datas para o formato correto com timezone de Brasília
    let fromDate = range?.from ? getBrazilianStartOfDay(range.from) : null;
    let toDate = range?.to ? getBrazilianEndOfDay(range.to) : fromDate;
    
    // Se não temos seleção, mas temos time from/to, limpar também
    if (!fromDate && !toDate) {
      setDateRange(undefined);
      
      // Limpar do session storage, mas manter a flag que indica que já aplicamos filtro
      sessionStorage.removeItem('events_from_date');
      sessionStorage.removeItem('events_to_date');
      sessionStorage.removeItem('events_time_from');
      sessionStorage.removeItem('events_time_to');
      
      // Notificar mudança de filtros
      if (onFilterChange) {
        onFilterChange({
          ...getFiltersFromUrl(),
          dateFrom: null,
          dateTo: null,
          timeFrom: null,
          timeTo: null
        });
      }
      
      return;
    }
    
    // Verificar se temos horas específicas
    const fromTime = range?.fromTime;
    const toTime = range?.toTime;
    
    // Atualizar estado local
    setDateRange({
      from: range?.from,
      to: range?.to,
      fromTime,
      toTime
    });
    
    // Notificar mudança de filtros
    if (onFilterChange) {
      onFilterChange({
        ...getFiltersFromUrl(),
        dateFrom: fromDate,
        dateTo: toDate,
        timeFrom: fromTime || null,
        timeTo: toTime || null
      });
    }
    
    // Salvar no session storage
    if (fromDate) {
      sessionStorage.setItem('events_from_date', fromDate);
      sessionStorage.setItem('events_default_filter_applied', 'true');
    }
    if (toDate) {
      sessionStorage.setItem('events_to_date', toDate);
    }
    if (fromTime) {
      sessionStorage.setItem('events_time_from', fromTime);
    }
    if (toTime) {
      sessionStorage.setItem('events_time_to', toTime);
    }
  };

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
    
    // Filtrar apenas filtros que tenham valores
    const filtersWithValues = validFilters.filter(f => f.value.trim() !== '');
    
    // Se não sobrarem filtros válidos com valores, adicionamos um filtro padrão vazio
    const filtersToSave = filtersWithValues.length > 0 
      ? filtersWithValues 
      : [{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }];
    
    
    // Atualizar o estado com os novos filtros
    setAdvancedFilters(filtersToSave);
    setFilterCondition(pendingFilterCondition);
    setAdvancedFilterOpen(false);
    
    // Definir a flag para evitar que o useEffect atualize a URL
    setIsUpdatingDirectly(true);
    
    try {
      // Chamar updateUrl diretamente em vez de depender do useEffect
      // Isso garante que a atualização aconteça imediatamente após salvar os filtros
      const params = new URLSearchParams(searchParams.toString());
      
      // Verificação: logging dos parâmetros iniciais
      
      // Preservar o parâmetro de página atual
      const currentPage = params.get('page') || '1';
      
      // Manter outros parâmetros existentes
      if (professionIds.length > 0) {
        params.set('profession_id', professionIds.join(','));
      } else {
        params.delete('profession_id');
      }
      
      if (funnelIds.length > 0) {
        params.set('funnel_id', funnelIds.join(','));
      } else {
        params.delete('funnel_id');
      }
      
      if (dateRange?.from) {
        params.set('from', dateRange.from.toISOString());
        
        if (dateRange.to) {
          params.set('to', dateRange.to.toISOString());
        } else {
          params.delete('to');
        }
        
        if (dateRange.fromTime) {
          params.set('time_from', dateRange.fromTime);
        } else {
          params.delete('time_from');
        }
        
        if (dateRange.toTime) {
          params.set('time_to', dateRange.toTime);
        } else {
          params.delete('time_to');
        }
      } else {
        params.delete('from');
        params.delete('to');
        params.delete('time_from');
        params.delete('time_to');
      }
      
      // Adicionar filtros avançados à URL
      if (filtersWithValues.length > 0) {
        const filtersJson = JSON.stringify(filtersWithValues);
        params.set('advanced_filters', filtersJson);
        params.set('filter_condition', pendingFilterCondition);
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
      
      // Verificação final: garantir que os filtros avançados estão na URL
      const finalAdvancedFilters = params.get('advanced_filters');
      if (filtersWithValues.length > 0 && !finalAdvancedFilters) {
        console.warn('ALERTA: Filtros avançados não foram adicionados corretamente. Tentando novamente...');
        params.set('advanced_filters', JSON.stringify(filtersWithValues));
        params.set('filter_condition', pendingFilterCondition);
      }
      
      const newUrl = `/events?${params.toString()}`;
      
      // Atualizar a URL primeiro
      router.push(newUrl, { scroll: false });
      
      // Permitir que a URL seja atualizada antes de disparar o refetch
      setTimeout(() => {
        if (onFilterChange) {
          onFilterChange({
            professionId: professionIds.length > 0 ? professionIds.join(',') : null,
            funnelId: funnelIds.length > 0 ? funnelIds.join(',') : null,
            dateFrom: dateRange?.from ? dateRange.from.toISOString() : null,
            dateTo: dateRange?.to ? dateRange.to.toISOString() : null,
            timeFrom: dateRange?.fromTime || null,
            timeTo: dateRange?.toTime || null,
            advancedFilters: filtersWithValues.length > 0 ? filtersWithValues : undefined,
            filterCondition: filtersWithValues.length > 0 ? pendingFilterCondition : undefined
          });
        }
        
        // Disparar o evento para forçar a recarga dos dados
        window.dispatchEvent(new CustomEvent('refetch-events'));
        
        // Verificar se os filtros estão na URL após a atualização
        setTimeout(() => {
          const currentParams = new URLSearchParams(window.location.search);
          const currentAdvancedFilters = currentParams.get('advanced_filters');
        }, 500);
      }, 100);
    } catch (error) {
      console.error('Erro ao salvar filtros avançados:', error);
    } finally {
      // Resetar a flag após a atualização direta
      setTimeout(() => {
        setIsUpdatingDirectly(false);
      }, 500);
    }
  };

  const handleClearFilters = () => {
    // Reset all filter states locally
    setProfessionIds([]);
    setFunnelIds([]);
    setDateRange(undefined);
    setAdvancedFilters([{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }]);
    setFilterCondition('AND');
    setPendingAdvancedFilters([{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }]);
    setPendingFilterCondition('AND');
    
    // Close any open filter popups
    setAdvancedFilterOpen(false);
    setActiveFilter("main");
    
    // Set updating flag to prevent recursive updates
    setIsUpdatingDirectly(true);
    
    console.log("COMPLETELY REMOVING ALL FILTERS");
    
    try {
      // Set a special flag to signal that we're clearing filters
      // This will be detected by the fetchEvents function
      sessionStorage.setItem('filter_clearing_in_progress', 'true');
      
      // Set a special flag to indicate intentional removal of advanced filters
      sessionStorage.setItem('advanced_filters_removed', 'true');
      
      // Extract only the non-filter parameters that should be preserved
      const sortBy = searchParams.get('sortBy');
      const sortDirection = searchParams.get('sortDirection');
      const limit = searchParams.get('limit');
      
      // Create absolutely minimal URL parameters
      const cleanParams = new URLSearchParams();
      
      // Add only pagination and sorting parameters - NO DATE FILTERS
      cleanParams.set('page', '1');
      
      // Only add preserved params if they exist
      if (sortBy) cleanParams.set('sortBy', sortBy);
      if (sortDirection) cleanParams.set('sortDirection', sortDirection);
      if (limit) cleanParams.set('limit', limit);
      
      // Create a clean URL with minimal parameters
      const cleanUrl = `/events?${cleanParams.toString()}`;
      
      // Update the URL immediately - use both methods for immediate visual feedback
      window.history.replaceState({}, '', cleanUrl);
      router.replace(cleanUrl, { scroll: false });
      
      // Remove ALL filter-related items from session storage
      sessionStorage.removeItem('events_default_filter_applied');
      sessionStorage.removeItem('events_from_date');
      sessionStorage.removeItem('events_to_date');
      sessionStorage.removeItem('events_time_from');
      sessionStorage.removeItem('events_time_to');
      sessionStorage.removeItem('events_filter_condition');
      sessionStorage.removeItem('events_advanced_filters');
      
      // Notify parent about filter changes - removing ALL filters
      if (onFilterChange) {
        onFilterChange({
          professionId: null,
          funnelId: null,
          dateFrom: null,
          dateTo: null,
          timeFrom: null,
          timeTo: null,
          advancedFilters: [],
          filterCondition: 'AND'
        });
      }
      
      // Immediately dispatch the filters-cleared event to show loading state
      window.dispatchEvent(new CustomEvent('filters-cleared'));
      
      // Reset updating flag after a delay
      setTimeout(() => {
        setIsUpdatingDirectly(false);
      }, 500);
      
      // Manter a flag advanced_filters_removed por um tempo para evitar restauração imediata
      setTimeout(() => {
        sessionStorage.removeItem('advanced_filters_removed');
      }, 5000); // Manter a flag por 5 segundos após a limpeza
    } catch (error) {
      console.error("Error while clearing filters:", error);
      // Reset updating flag in case of error
      setIsUpdatingDirectly(false);
      // Clear flag even on error
      sessionStorage.removeItem('filter_clearing_in_progress');
    }
  };

  // Criar um contador para filtros ativos que podemos usar em vários lugares
  const activeAdvancedFiltersCount = useMemo(() => {
    return advancedFilters.filter(f => f.value && f.value.trim() !== '').length;
  }, [advancedFilters]);

  const renderFilterContent = () => {
    if (activeFilter === "main") {
      return (
        <div className="p-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10"
              onClick={handleClearFilters}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
          
          <hr className="my-2" />
          
          {/* Espaço reservado para futuros botões se necessário */}
          <div className="flex justify-between pt-2">
            {/* Botões de ação adicionais podem ser adicionados aqui no futuro */}
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
                          <SelectValue placeholder="Selecione um Evento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEAD">LEAD</SelectItem>
                          <SelectItem value="INITIATE_CHECKOUT">INITIATE_CHECKOUT</SelectItem>
                          <SelectItem value="ADD_PAYMENT_INFO">ADD_PAYMENT_INFO</SelectItem>
                          <SelectItem value="PURCHASE">PURCHASE</SelectItem>
                          <SelectItem value="PAGEVIEW">PAGEVIEW</SelectItem>
                          <SelectItem value="PESQUISA_LEAD">PESQUISA_LEAD</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : filter.property === "initialDeviceType" ? (
                      <Select
                        value={filter.value}
                        onValueChange={(value) => handleAdvancedFilterChange(index, 'value', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um Dispositivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="relative">
                        <Input
                          value={filter.value}
                          onChange={(e) => handleAdvancedFilterChange(index, 'value', e.target.value)}
                          placeholder="Valor"
                          className={filter.value ? "pr-8" : ""}
                        />
                        {filter.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-10 w-8 rounded-l-none p-0"
                            onClick={() => handleAdvancedFilterChange(index, 'value', '')}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Limpar</span>
                          </Button>
                        )}
                      </div>
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
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-9 flex whitespace-nowrap relative",
          activeAdvancedFiltersCount > 0 && 
          "bg-blue-50 border-blue-400 hover:bg-blue-100 text-blue-600 font-medium"
        )}
        onClick={() => {
          setPendingAdvancedFilters([...advancedFilters]);
          setPendingFilterCondition(filterCondition);
          setAdvancedFilterOpen(true);
        }}
      >
        <Filter className={cn("h-3.5 w-3.5 mr-2", 
                            activeAdvancedFiltersCount > 0 && "text-blue-600")} />
        Filtros avançados
        {activeAdvancedFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
            {activeAdvancedFiltersCount}
          </Badge>
        )}
      </Button>

      <div className="flex items-center space-x-1">
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
            <DateFilter 
              onChange={handleDateChange} 
              initialDate={dateRange}
              preventAutoSelect={true} 
            />
          </PopoverContent>
        </Popover>

        {dateRange && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              setDateRange(undefined);
              const params = new URLSearchParams(searchParams.toString());
              params.delete('from');
              params.delete('to');
              params.delete('time_from');
              params.delete('time_to');
              
              // Preservar outros parâmetros
              const currentPage = params.get('page') || '1';
              const sortBy = params.get('sortBy');
              const sortDirection = params.get('sortDirection');
              const limit = params.get('limit');
              
              // Garantir que o parâmetro de página seja mantido
              params.set('page', currentPage);
              if (sortBy) params.set('sortBy', sortBy);
              if (sortDirection) params.set('sortDirection', sortDirection);
              if (limit) params.set('limit', limit);
              
              router.push(`/events?${params.toString()}`, { scroll: false });
              
              // Disparar refetch
              if (onFilterChange) {
                onFilterChange({
                  ...getFiltersFromUrl(),
                  dateFrom: null,
                  dateTo: null,
                  timeFrom: null,
                  timeTo: null
                });
              }
              window.dispatchEvent(new CustomEvent('refetch-events'));
            }}
            title="Limpar filtro de período"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Clear all filters button */}
      {(dateRange || professionIds.length > 0 || funnelIds.length > 0 || advancedFilters.some(f => f.value.trim() !== '')) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 flex items-center"
          onClick={handleClearFilters}
          title="Limpar todos os filtros"
        >
          <X className="h-4 w-4 mr-1" />
          <span className="text-sm">Limpar filtros</span>
        </Button>
      )}

      {/* Modal de Filtros Avançados */}
      <Dialog open={advancedFilterOpen} onOpenChange={setAdvancedFilterOpen}>
        <DialogContent className="sm:max-w-[5Z0px]">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Use filtros avançados para encontrar eventos específicos com base em qualquer propriedade.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto px-2">
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
                          <SelectValue placeholder="Selecione um Evento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEAD">LEAD</SelectItem>
                          <SelectItem value="INITIATE_CHECKOUT">INITIATE_CHECKOUT</SelectItem>
                          <SelectItem value="ADD_PAYMENT_INFO">ADD_PAYMENT_INFO</SelectItem>
                          <SelectItem value="PURCHASE">PURCHASE</SelectItem>
                          <SelectItem value="PAGEVIEW">PAGEVIEW</SelectItem>
                          <SelectItem value="PESQUISA_LEAD">PESQUISA_LEAD</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : filter.property === "initialDeviceType" ? (
                      <Select
                        value={filter.value}
                        onValueChange={(value) => handleAdvancedFilterChange(index, 'value', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um Dispositivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="relative">
                        <Input
                          value={filter.value}
                          onChange={(e) => handleAdvancedFilterChange(index, 'value', e.target.value)}
                          placeholder="Valor"
                          className={filter.value ? "pr-8" : ""}
                        />
                        {filter.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-10 w-8 rounded-l-none p-0"
                            onClick={() => handleAdvancedFilterChange(index, 'value', '')}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Limpar</span>
                          </Button>
                        )}
                      </div>
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

          <DialogFooter className="flex justify-between">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingAdvancedFilters([{ id: '1', property: 'user.fullname', operator: 'equals', value: '' }]);
                  setPendingFilterCondition('AND');
                }}
                className="mr-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar filtros
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdvancedFilterOpen(false)}
                className="mr-2"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveAdvancedFilters}
              >
                Aplicar Filtros
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}