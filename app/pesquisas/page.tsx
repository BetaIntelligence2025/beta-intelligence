"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PesquisasTable } from "./pesquisas-table";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  toBrazilianTime, 
  formatBrazilianDate, 
  getBrazilianStartOfDay, 
  getBrazilianEndOfDay, 
  BRAZIL_TIMEZONE 
} from '@/lib/date-utils';

const FIXED_LIMIT = 20;

const fetchPesquisas = async ({ queryKey }: any) => {
  const [_, page, limit, sortConfig, searchParamsString] = queryKey;
  const searchParams = new URLSearchParams(searchParamsString);
  
  // Create a new URLSearchParams for the API request
  const params = new URLSearchParams();
  
  // Add basic pagination parameters
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  
  // Add sorting parameters
  if (sortConfig.column) {
    params.set('sortBy', sortConfig.column);
    if (sortConfig.direction) {
      params.set('sortDirection', sortConfig.direction);
    }
  }
  
  // Verificar todos os tipos de filtros possíveis e mapear para os parâmetros da API
  const filterTypes = ['captacao', 'pesquisa', 'vendas'];
  const apiParamMapping: Record<string, string> = {
    'captacao_from': 'lead_inicio',
    'captacao_to': 'lead_fim',
    'pesquisa_from': 'pesquisa_inicio',
    'pesquisa_to': 'pesquisa_fim',
    'vendas_from': 'venda_inicio',
    'vendas_to': 'venda_fim'
  };
  
  console.log('URL params:', Object.fromEntries(searchParams.entries()));
  
  // Para cada tipo de filtro, verificar e usar o mapeamento para a API
  filterTypes.forEach(filterType => {
    // Parâmetros para este tipo de filtro
    const fromParam = `${filterType}_from`;
    const toParam = `${filterType}_to`;
    
    // Aplicar mapeamento dos parâmetros para os nomes da API
    if (searchParams.has(fromParam)) {
      const value = searchParams.get(fromParam);
      if (value && value.trim() !== '') {
        const apiParam = apiParamMapping[fromParam];
        params.set(apiParam, value);
        console.log(`Filtro aplicado: ${apiParam}=${value}`);
      }
    }
    
    if (searchParams.has(toParam)) {
      const value = searchParams.get(toParam);
      if (value && value.trim() !== '') {
        const apiParam = apiParamMapping[toParam];
        params.set(apiParam, value);
        console.log(`Filtro aplicado: ${apiParam}=${value}`);
      }
    }
  });
  
  // Verificar e copiar parâmetros legados (manter compatibilidade)
  if (searchParams.has('from')) {
    const value = searchParams.get('from') || '';
    if (value.trim() !== '') {
      params.set('data_inicio', value);
      console.log(`Filtro legado aplicado: data_inicio=${value}`);
    }
  }
  
  if (searchParams.has('to')) {
    const value = searchParams.get('to') || '';
    if (value.trim() !== '') {
      params.set('data_fim', value);
      console.log(`Filtro legado aplicado: data_fim=${value}`);
    }
  }
  
  // Mapeamento para filtros de profissão e funil
  if (searchParams.has('profession_id')) {
    const value = searchParams.get('profession_id') || '';
    if (value.trim() !== '') {
      params.set('profissao', value);
      console.log(`Filtro aplicado: profissao=${value}`);
    }
  }
  
  if (searchParams.has('funnel_id')) {
    const value = searchParams.get('funnel_id') || '';
    if (value.trim() !== '') {
      params.set('funil', value);
      console.log(`Filtro aplicado: funil=${value}`);
    }
  }
      
  // Final API request parameters
  const paramString = params.toString();
  console.log('API request params:', paramString);
  
  try {
    // API endpoint for surveys
    const response = await fetch(`/api/pesquisas?${paramString}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', { status: response.status, text: errorText });
      throw new Error(`Falha ao buscar pesquisas: ${response.status} ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Fetch error:', error);
    throw error;
  }
};

function PesquisasContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Estado para página atual e sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  // Obter parâmetros da URL
  const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string, 10) : 1;
  const limit = FIXED_LIMIT;
  const sortBy = searchParams.get('sortBy');
  const sortDir = searchParams.get('sortDirection') as 'asc' | 'desc' | null;
  
  // Atualizar o estado quando a URL mudar
  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
    
    if (sortBy !== sortColumn) {
      setSortColumn(sortBy);
    }
    
    if (sortDir !== sortDirection) {
      setSortDirection(sortDir);
    }
  }, [page, sortBy, sortDir, currentPage, sortColumn, sortDirection]);
  
  // Função para atualizar URL quando mudar a página ou ordenamento
  const updateUrl = useCallback((newParams: URLSearchParams) => {
    const url = `${pathname}?${newParams.toString()}`;
    router.push(url);
  }, [pathname, router]);
  
  // Handler para mudar a página
  const handlePageChange = useCallback((newPage: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Atualizar página
    newParams.set('page', newPage.toString());
    
    updateUrl(newParams);
  }, [searchParams, updateUrl]);
  
  // Handler para ordenação
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Resetar para a primeira página ao mudar ordenação
    newParams.set('page', '1');
    
    // Atualizar ordenação
    newParams.set('sortBy', column);
    newParams.set('sortDirection', direction);
    
    updateUrl(newParams);
  }, [searchParams, updateUrl]);
  
  // Consulta à API de pesquisas
  const { data, isLoading, error } = useQuery({
    queryKey: ['pesquisas', page, limit, { column: sortBy, direction: sortDir }, searchParams.toString()],
    queryFn: fetchPesquisas,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });
  
  // Função para forçar a atualização dos dados
  const refetchHandler = () => {
    queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
  };
  
  // Função para exportar dados
  const handleExport = useCallback(async (selectedPesquisas: any[]) => {
    if (!selectedPesquisas || selectedPesquisas.length === 0) {
      console.error('Nenhum item para exportar');
      return;
    }

    try {
      // Preparar cabeçalhos CSV
      const headers = [
        'ID',
        'Nome da Pesquisa',
        'Profissão',
        'Funil',
        'Taxa de Resposta (%)',
        'Conversão em Vendas (%)',
        'Data de Criação'
      ];
      
      // Mapear dados para formato CSV
      const csvRows = [
        headers.join(','), // Linha de cabeçalhos
        ...selectedPesquisas.map(item => {
          return [
            item.id,
            `"${item.nome}"`, // Aspas para evitar problemas com vírgulas no texto
            `"${item.profissao}"`,
            `"${item.funil}"`,
            item.taxa_resposta,
            item.conversao_vendas,
            item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : ''
          ].join(',');
        })
      ];
      
      // Criar blob com conteúdo CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Criar elemento de download e disparar
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pesquisas_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  }, []);
  
  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        pageTitle="Pesquisas"
      />
      
      <PesquisasTable
        pesquisas={data?.data || []}
        isLoading={isLoading}
        meta={data?.meta}
        searchParams={searchParams.toString()}
        currentPage={currentPage}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onRefresh={refetchHandler}
        onExport={handleExport}
      />
    </div>
  );
}

export default function PesquisasPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PesquisasContent />
    </Suspense>
  );
} 