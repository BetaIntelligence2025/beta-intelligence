"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { EventsTable } from "./events-table";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";

const fetchEvents = async ({ queryKey }: any) => {
  const [_, page, limit, sortConfig, searchParamsString] = queryKey;
  const searchParams = new URLSearchParams(searchParamsString);
  
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
  
  // Adicionar todos os parâmetros da URL atual
  for (const [key, value] of Array.from(searchParams.entries())) {
    if (key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortDirection') {
      params.set(key, value);
    }
  }
  
  // Fazer a requisição com todos os parâmetros
  const response = await fetch(`/api/events?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Falha ao buscar eventos');
  }
  return response.json();
};

function EventsContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      console.log('Sincronizando currentPage com URL:', pageNumber);
      setCurrentPage(pageNumber);
    }
  }, [searchParams, currentPage]);

  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = useCallback((newPage: number) => {
    console.log('Page - handlePageChange chamado com página:', newPage);
    
    // Enviar um evento customizado para forçar refetch
    const event = new CustomEvent('refetch-events');
    window.dispatchEvent(event);
    
    // Atualizar a URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/events?${params.toString()}`, { scroll: false });
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
      console.log('Buscando eventos para página:', currentPage)
      return fetchEvents({ queryKey: ["events", currentPage, limit, sortConfig, searchParams.toString()] });
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });
  
  // Adicionar listener para o evento customizado
  useEffect(() => {
    const refetchHandler = () => {
      console.log('Evento refetch-events recebido, recarregando dados...');
      refetch();
    };
    
    window.addEventListener('refetch-events', refetchHandler);
    
    return () => {
      window.removeEventListener('refetch-events', refetchHandler);
    };
  }, [refetch]);

  return (
    <div className="flex flex-col h-full w-full" ref={containerRef}>
      <div className="w-full flex justify-between pb-4">
        <PageHeader pageTitle="Eventos" />
      </div>
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <EventsTable 
          events={eventsData?.events || []}
          meta={eventsData?.meta || {
            total: 0,
            page: currentPage,
            limit: limit,
            last_page: 1
          }}
          isLoading={isLoading || !hasCalculatedLimit} 
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