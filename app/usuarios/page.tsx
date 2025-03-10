"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DashboardTable } from "./dashboard-table";
import { Pagination } from "@/components/pagination";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { redirect } from "next/navigation";
import { FetchUserResponse } from "@/types/users-type";
import { FilterSelect } from '@/components/dashboard/filter-select'
import { TableCell } from '@/components/table-cell'

interface FilteredData {
  user: any[];
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}

// Função para buscar dados com base no filtro selecionado
const fetchFilteredData = async (
  filter: string, 
  page: number, 
  limit: number, 
  sortBy?: string | null, 
  sortDirection?: 'asc' | 'desc' | null,
  token?: string | null
): Promise<FetchUserResponse> => {
  let endpoint = '/api/users'; // default endpoint
  
  switch (filter) {
    case 'leads':
      endpoint = '/api/lead';
      break;
    case 'clients':
      endpoint = '/api/client';
      break;
    case 'anonymous':
      endpoint = '/api/anonymous';
      break;
    case 'all':
      // Para o filtro "all", vamos usar o endpoint de usuários
      // No futuro, podemos implementar um endpoint específico que combine todos os tipos
      endpoint = '/api/users';
      break;
    case 'users':
    default:
      endpoint = '/api/users';
      break;
  }
  
  const config: any = {
    params: {
      page,
      limit,
      sortBy: sortBy || undefined,
      sortDirection: sortDirection || undefined,
      // Adicionar um parâmetro para indicar que queremos todos os tipos quando o filtro é 'all'
      allTypes: filter === 'all' ? 'true' : undefined
    }
  };
  
  // Adiciona o token de autorização para endpoints que não são anônimos
  if (filter !== 'anonymous' && token) {
    config.headers = {
      'Authorization': `Bearer ${token}`
    };
  }
  
  try {
    console.log(`Buscando dados do endpoint ${endpoint} com config:`, config);
    const { data } = await axios.get(endpoint, config);
    console.log(`Dados recebidos do endpoint ${endpoint}:`, data);
    
    // Verificar se os dados estão no formato esperado
    if (!data.users) {
      console.warn(`Aviso: O endpoint ${endpoint} não retornou dados no campo 'users'. Dados recebidos:`, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados do endpoint ${endpoint}:`, error);
    throw error;
  }
};

export default function ProtectedPage() {
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState('users');
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null
  });

  // Obter o token de autenticação
  useEffect(() => {
    async function getToken() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Sessão obtida:', session ? 'Sim' : 'Não');
        if (session?.access_token) {
          console.log('Token obtido com sucesso');
          setToken(session.access_token);
        } else {
          console.log('Nenhum token encontrado na sessão');
          setToken(null);
        }
      } catch (error) {
        console.error('Erro ao obter token:', error);
        setToken(null);
      }
    }
    
    getToken();
  }, [supabase]);

  // Usar o React Query para buscar dados
  const { 
    data: filteredData, 
    isLoading: loading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['filteredData', filter, currentPage, itemsPerPage, sortConfig, token],
    queryFn: () => fetchFilteredData(
      filter, 
      currentPage, 
      itemsPerPage, 
      sortConfig.column, 
      sortConfig.direction,
      token
    ),
    enabled: !!token || filter === 'anonymous', // Só executa se tiver token ou for anônimo
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Lidar com erros do React Query
  useEffect(() => {
    if (error) {
      console.error('Erro do React Query:', error);
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        console.error(`Erro Axios: ${statusCode} - ${errorMessage}`);
        setErrorMessage(`Erro ao buscar dados: ${errorMessage} (${statusCode})`);
      } else {
        console.error('Erro desconhecido:', error);
        setErrorMessage('Erro desconhecido ao buscar dados');
      }
    } else {
      setErrorMessage(null);
    }
  }, [error]);

  // Redirecionar se não estiver autenticado
  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePerPageChange = async (newPerPage: number) => {
    console.log("handlePerPageChange chamado com:", newPerPage);
    // Atualizar o número de itens por página
    setItemsPerPage(newPerPage);
    // Reset para a primeira página
    setCurrentPage(1);
  };

  const handleSort = useCallback((columnId: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column: columnId, direction });
  }, []);

  // Preparar os dados para exibição
  const displayData: FilteredData = {
    user: filteredData?.users || [],
    page: filteredData?.page || 1,
    total: filteredData?.total || 0,
    totalPages: filteredData?.totalPages || 0,
    limit: filteredData?.limit || itemsPerPage
  };

  // Adicionar log para depuração
  console.log('Dados filtrados:', filteredData);
  console.log('Dados para exibição:', displayData);
  
  // Verificar se os dados estão no formato esperado
  useEffect(() => {
    if (filteredData && !filteredData.users) {
      console.error('Erro: Os dados recebidos não contêm o campo "users":', filteredData);
      setErrorMessage('Erro no formato dos dados recebidos. Verifique o console para mais detalhes.');
    }
  }, [filteredData]);

  const meta = {
    page: displayData.page,
    total: displayData.total,
    totalPages: displayData.totalPages,
    limit: displayData.limit,
  };

  // Adicionar log para os dados passados para o DashboardTable
  console.log('Dados passados para DashboardTable:', {
    result: displayData,
    isLoading: loading,
    currentPage,
    totalResults: displayData.user,
    sortColumn: sortConfig.column,
    sortDirection: sortConfig.direction
  });

  return (
    <div className="flex-1 w-full flex flex-col">
      <div className="w-full flex justify-between pb-4">
        <PageHeader pageTitle="Usuários" />
        <FilterSelect 
          value={filter} 
          onValueChange={setFilter} 
        />
      </div>
      <div className="space-y-4 bg-white xl:space-y-6">
        <DashboardTable 
          result={displayData} 
          isLoading={loading} 
          onSort={handleSort}
          currentPage={currentPage}
          totalResults={displayData.user}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
        />

        {displayData.user.length > 0 && (
          <Pagination
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            pageIndex={meta.page}
            totalCount={meta.total}
            perPage={meta.limit}
          />
        )}

        {errorMessage && (
          <div className="text-red-500 p-4 bg-red-50 border border-red-200 rounded-md">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}