"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EventsTable } from "./events-table";
import { Pagination } from "@/components/pagination";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { FetchEventsResponse } from "../types/events-type";

const fetchEvents = async (page: number, limit: number, sortConfig: any, searchParams: URLSearchParams) => {
  // Criar uma nova instância de URLSearchParams para não modificar a original
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
  
  // Adicionar todos os parâmetros da URL atual, incluindo profession_id e funnel_id
  for (const [key, value] of Array.from(searchParams.entries())) {
    if (key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortDirection') {
      params.set(key, value);
    }
  }
  
  console.log('Fetching with params:', params.toString());
  
  // Fazer a requisição com todos os parâmetros
  const response = await fetch(`/api/events?${params.toString()}`);
  return response.json();
};

function EventsContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [hasCalculatedLimit, setHasCalculatedLimit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null
  });
  const [filters, setFilters] = useState({});

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
      
      // Atualizar o limit apenas uma vez
      setLimit(visibleRows);
      setHasCalculatedLimit(true);
      
      // Atualizar URL
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', visibleRows.toString());
      router.push(`/events?${params.toString()}`, { scroll: false });
    };
    
    // Usar setTimeout para garantir que o layout está estável
    setTimeout(calculateVisibleRows, 100);
  }, [hasCalculatedLimit, router, searchParams]);

  // Adicione após a declaração dos estados
  useEffect(() => {
    // Carregar filtros da URL ao inicializar
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const timeFromParam = searchParams.get('time_from')
    const timeToParam = searchParams.get('time_to')
    const professionIdParam = searchParams.get('profession_id')
    const funnelIdParam = searchParams.get('funnel_id')
    
    // Criar o objeto de filtros
    const filters: any = {}
    
    // Processar datas se existirem
    if (fromParam || toParam) {
      filters.dateRange = {}
      
      if (fromParam) {
        filters.dateRange.from = new Date(fromParam)
      }
      
      if (toParam) {
        filters.dateRange.to = new Date(toParam)
      }
      
      if (timeFromParam) {
        filters.dateRange.fromTime = timeFromParam
      }
      
      if (timeToParam) {
        filters.dateRange.toTime = timeToParam
      }
    }
    
    // Adicionar outros filtros
    if (professionIdParam) {
      filters.professionId = professionIdParam
    }
    
    if (funnelIdParam) {
      filters.funnelId = funnelIdParam
    }
    
    // Aplicar os filtros se houver algum
    if (Object.keys(filters).length > 0) {
      setFilters(filters)
    }
    
    // Atualizar a página atual com base no parâmetro da URL
    const pageParam = Number(searchParams.get('page')) || 1
    setCurrentPage(pageParam)
  }, [searchParams])

  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/events?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Adicione o handler para alteração de linhas por página
  const handlePerPageChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset para primeira página
    
    // Atualizar URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(newLimit));
    params.set('page', '1');
    
    router.push(`/events?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Modificar o useQuery para incluir os filtros na queryKey
  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ["events", currentPage, limit, sortConfig, searchParams.toString()],
    queryFn: () => fetchEvents(currentPage, limit, sortConfig, searchParams),
    // Adicionar esta opção para garantir que os dados sejam atualizados quando os filtros mudarem
    refetchOnWindowFocus: false,
    staleTime: 0
  });

  const handleSort = useCallback(async (columnId: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column: columnId, direction });
    try {
      await axios.get('/api/events', {
        params: {
          page: currentPage,
          limit,
          sortBy: columnId,
          sortDirection: direction
        }
      });
      
      refetch();
    } catch (error) {
      console.error('Error sorting events:', error);
    }
  }, [currentPage, limit, refetch]);

  // Adicione este useEffect para ouvir o evento de refetch
  useEffect(() => {
    const handleRefetch = () => {
      refetch();
    };
    
    window.addEventListener('refetch-events', handleRefetch);
    
    return () => {
      window.removeEventListener('refetch-events', handleRefetch);
    };
  }, [refetch]);

  return (
    <div className="flex flex-col h-full w-full" ref={containerRef}>
      <div className="w-full flex justify-between pb-4">
        <PageHeader pageTitle="Eventos" />
      </div>
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <EventsTable 
          result={eventsData || { 
            events: [],
            meta: {
              total: 0,
              page: 1,
              limit: limit,
              last_page: 1
            }
          }} 
          isLoading={isLoading || !hasCalculatedLimit} 
          onSort={handleSort}
          onPerPageChange={handlePerPageChange}
          currentPage={currentPage}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
        />

        {error && (
          <div className="text-red-500 p-4">
            Error fetching events. Please try again.
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