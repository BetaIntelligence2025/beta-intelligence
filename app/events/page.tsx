"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { EventsTable } from "./events-table";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { 
  toBrazilianTime, 
  formatBrazilianDate, 
  getBrazilianStartOfDay, 
  getBrazilianEndOfDay, 
  BRAZIL_TIMEZONE 
} from '@/lib/date-utils';

const fetchEvents = async ({ queryKey }: any) => {
  const [_, page, limit, sortConfig, searchParamsString] = queryKey;
  const searchParams = new URLSearchParams(searchParamsString);
  
  console.log('Fetching events');
  
  // Criar uma nova instância de URLSearchParams para a requisição
  const params = new URLSearchParams();
  
  // Adicionar parâmetros básicos
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  
  // Adicionar parâmetros de ordenação
  if (sortConfig.column) {
    params.set('sortBy', sortConfig.column);
    if (sortConfig.direction) {
      params.set('sortDirection', sortConfig.direction);
    }
  }
  
  // Criar uma cópia explícita dos parâmetros para garantir que não são perdidos
  const paramsEntries = Array.from(searchParams.entries());
  
  // Adicionar todos os parâmetros da URL atual, com atenção especial aos filtros avançados
  for (const [key, value] of paramsEntries) {
    if (key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortDirection') {
      // Garantir que filtros avançados são preservados
      if (key === 'advanced_filters') {
      }
      params.set(key, value);
    }
  }
  
  // Verificação adicional para garantir que os filtros avançados foram incluídos
  const finalAdvancedFilters = params.get('advanced_filters');
  
  const paramString = params.toString();
  
  // Fazer a requisição com todos os parâmetros
  const response = await fetch(`/api/events?${paramString}`);
  if (!response.ok) {
    throw new Error('Falha ao buscar eventos');
  }
  const data = await response.json();
  
  return data;
};

function EventsContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Usar uma ref para manter o último searchParams processado
  const lastSearchParamsRef = useRef<string>(searchParams.toString());
  
  // Manter um estado para verificar se houve mudança nos parâmetros
  const [hasSearchParamsChanged, setHasSearchParamsChanged] = useState(false);
  
  // Add manual loading state for UI updates
  const [isManualLoading, setIsManualLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get('page')) || 1
  );
  const [limit, setLimit] = useState(
    Number(searchParams.get('limit')) || 10
  );
  const [hasCalculatedLimit, setHasCalculatedLimit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: searchParams.get('sortBy') as string | null,
    direction: searchParams.get('sortDirection') as 'asc' | 'desc' | null
  });

  // Calcular linhas visíveis uma única vez na montagem
  useEffect(() => {
    if (hasCalculatedLimit) return;
    
    const calculateVisibleRows = () => {
      if (!containerRef.current) return;
      
      const windowHeight = window.innerHeight;
      const headerHeight = 70;
      const filtersHeight = 80;
      const paginationHeight = 50;
      const padding = 40;
      
      const availableHeight = windowHeight - headerHeight - filtersHeight - paginationHeight - padding;
      const rowHeight = 46;
      const headerRowHeight = 48;
      
      const visibleRows = Math.max(5, Math.floor((availableHeight - headerRowHeight) / rowHeight));
      
      // Só atualiza se o valor calculado for diferente do atual
      if (visibleRows !== limit) {
        setLimit(visibleRows);
        setHasCalculatedLimit(true);
        
        // Atualizar URL apenas quando necessário
        const params = new URLSearchParams(searchParams.toString());
        params.set('limit', visibleRows.toString());
        router.push(`/events?${params.toString()}`, { scroll: false });
      } else {
        setHasCalculatedLimit(true);
      }
    };
    
    // Usar setTimeout para garantir que o layout está estável
    setTimeout(calculateVisibleRows, 100);
  }, [hasCalculatedLimit, limit, router, searchParams]);

  // Sincronizar o estado currentPage com o parâmetro page da URL
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
    
    // Só atualiza se for diferente para evitar loops
    if (pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    }
  }, [searchParams, currentPage]);

  // Detectar mudanças nos parâmetros de busca
  useEffect(() => {
    const currentParams = searchParams.toString();
    if (currentParams !== lastSearchParamsRef.current) {
      
      // Verificar se os filtros avançados mudaram
      const prevParams = new URLSearchParams(lastSearchParamsRef.current);
      const currentParamsObj = new URLSearchParams(currentParams);
      
      const prevAdvancedFilters = prevParams.get('advanced_filters');
      const currentAdvancedFilters = currentParamsObj.get('advanced_filters');
      
      
      // Atualizar a referência
      lastSearchParamsRef.current = currentParams;
      setHasSearchParamsChanged(true);
    }
  }, [searchParams]);

  // Após detectar uma mudança, resetar a flag depois de um tempo
  useEffect(() => {
    if (hasSearchParamsChanged) {
      const timer = setTimeout(() => {
        setHasSearchParamsChanged(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [hasSearchParamsChanged]);

  // Efeito para inicializar os parâmetros de data se não existirem
  const initialUrlSetupRef = useRef(false);
  const blockRefetchRef = useRef(false);
  
  // Function to set current day filter and reload data
  const setCurrentDayFilter = useCallback(() => {
    const today = new Date();
    const brazilianToday = toBrazilianTime(today);
    const startOfDay = getBrazilianStartOfDay(brazilianToday);
    const endOfDay = getBrazilianEndOfDay(brazilianToday);
    
    console.log("Setting current day filter:", { startOfDay, endOfDay });
    
    // Create new params while preserving other filters
    const params = new URLSearchParams(searchParams.toString());
    
    // Set date range to current day
    params.set('from', startOfDay);
    params.set('to', endOfDay);
    
    // Explicitly set page to 1
    params.set('page', '1');
    
    // Store in session storage to persist across page refreshes
    // Set a flag to indicate that we've already done the initial setup
    localStorage.setItem('events_initial_setup_done', 'true');
    sessionStorage.setItem('events_default_filter_applied', 'true');
    sessionStorage.setItem('events_from_date', startOfDay);
    sessionStorage.setItem('events_to_date', endOfDay);
    
    // Update URL without reloading - use replace to avoid adding to history
    router.replace(`/events?${params.toString()}`, { scroll: false });
    
    // Trigger refetch
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refetch-events'));
    }, 100);
  }, [router, searchParams]);
  
  // Use the function in the initialization effect
  useEffect(() => {
    // Evitar execução múltipla
    if (initialUrlSetupRef.current) return;
    
    // Check if we're on the exact URL /events without any parameters
    const hasNoParams = searchParams.toString() === '';
    
    // Marcar como inicializado para evitar múltiplas execuções
    initialUrlSetupRef.current = true;
    
    // For clean URLs (first entry), just set page=1 without any date filters
    if (hasNoParams) {
      console.log("First entry with clean URL - setting just page=1");
      
      // Simplify URL to just page=1
      router.replace('/events?page=1', { scroll: false });
      
      // Note: We don't set any date filters here automatically
      // Mark that we've done initial setup
      localStorage.setItem('events_initial_setup_done', 'true');
      return;
    }
    
    // For URLs with params but missing page, add page=1
    const pageParam = searchParams.get('page');
    if (!pageParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      
      // Update URL without reloading
      router.replace(`/events?${params.toString()}`, { scroll: false });
    }
    
    // Fix incorrect date formats if needed, but only if they already exist in URL
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if ((fromParam && !fromParam.includes('-03:00')) || (toParam && !toParam.includes('-03:00'))) {
      console.log("Fixing date format in existing parameters");
      
      // Criar novos parâmetros mantendo os existentes
      const params = new URLSearchParams(searchParams.toString());
      
      // Verificar e corrigir formato
      if (fromParam && !fromParam.includes('-03:00')) {
        const fromDate = toBrazilianTime(new Date(fromParam));
        params.set('from', getBrazilianStartOfDay(fromDate));
      }
      
      if (toParam && !toParam.includes('-03:00')) {
        const toDate = toBrazilianTime(new Date(toParam));
        params.set('to', getBrazilianEndOfDay(toDate));
      }
      
      // Ensure page=1 is in the URL
      params.set('page', '1');
      
      // Atualizar URL sem recarregar a página, usando replace
      router.replace(`/events?${params.toString()}`, { scroll: false });
      
      // Dispatch event to refetch data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refetch-events'));
      }, 100);
    }
    
  }, [searchParams, router]);
  
  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = useCallback((newPage: number) => {
    // Set manual loading when changing pages
    setIsManualLoading(true);
    
    // Obter os parâmetros atuais incluindo filtros avançados
    const params = new URLSearchParams(searchParams.toString());
    const advancedFilters = params.get('advanced_filters');
    
    // Atualizar apenas o parâmetro de página, mantendo os demais
    params.set('page', newPage.toString());
    
    // Atualizar a URL preservando todos os outros parâmetros
    const newUrl = `/events?${params.toString()}`;
    router.push(newUrl, { scroll: false });
    
    // Enviar um evento customizado para forçar refetch após a mudança de URL
    setTimeout(() => {
      const event = new CustomEvent('refetch-events');
      window.dispatchEvent(event);
    }, 100);
  }, [router, searchParams]);

  const handlePerPageChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset para primeira página
    
    // Atualizar URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(newLimit));
    params.set('page', '1');
    
    router.push(`/events?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleSort = useCallback((columnId: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column: columnId, direction });
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', columnId);
    params.set('sortDirection', direction || 'asc');
    
    router.push(`/events?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Buscar eventos com React Query
  const { 
    data: eventsData, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ["events", currentPage, limit, sortConfig, searchParams.toString()],
    queryFn: async () => {
      
      // Verificar filtros avançados antes da busca
      const advancedFilters = new URLSearchParams(searchParams.toString()).get('advanced_filters');
      
      return fetchEvents({ 
        queryKey: ["events", currentPage, limit, sortConfig, searchParams.toString()]
      });
    },
    staleTime: 1 * 60 * 1000, // 1 minuto (reduzido para ser mais responsivo)
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    // Desativar refetch automático na montagem para evitar perda de filtros
    refetchOnMount: false,
    // Configurar retry para garantir que temos tempo de processar os parâmetros
    retry: 1,
    retryDelay: 500,
    // Usar placeholderData em vez de keepPreviousData (que está obsoleto)
    placeholderData: (previousData) => previousData,
  });
  
  // Modificar o refetch para evitar ciclos infinitos
  useEffect(() => {
    const refetchHandler = () => {
      // Não fazer refetch se estamos bloqueando chamadas
      if (blockRefetchRef.current) return;
      
      // Set manual loading state when refetching
      setIsManualLoading(true);
      
      // Forçar um refetch imediato
      refetch().finally(() => {
        // Clear manual loading when refetch completes
        setIsManualLoading(false);
      });
    };
    
    window.addEventListener('refetch-events', refetchHandler);
    
    return () => {
      window.removeEventListener('refetch-events', refetchHandler);
    };
  }, [refetch]);

  // Clear manual loading when query loading state changes
  useEffect(() => {
    if (!isLoading) {
      setIsManualLoading(false);
    }
  }, [isLoading]);
  
  return (
    <div className="flex flex-col h-full w-full" ref={containerRef}>
      <div className="w-full flex justify-between pb-4">
        <PageHeader pageTitle="Eventos" />
      </div>
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Log dos eventos passados para a tabela */}
        {eventsData?.events && console.log('Events passed to table:', {
          count: eventsData.events.length
        })}
        <EventsTable 
          events={eventsData?.events || []}
          meta={eventsData?.meta || {
            total: 0,
            page: currentPage,
            limit: limit,
            last_page: 1
          }}
          isLoading={isLoading || isManualLoading || !hasCalculatedLimit} 
          onSort={handleSort}
          onPerPageChange={handlePerPageChange}
          currentPage={currentPage}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
          searchParams={searchParams.toString()}
          onPageChange={handlePageChange}
        />

        {error && (
          <div className="text-red-500 p-4">
            Erro ao buscar eventos. Por favor, tente novamente.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8">Carregando...</div>}>
      <EventsContent />
    </Suspense>
  );
}