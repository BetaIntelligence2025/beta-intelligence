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

const fetchUsers = async (page = 1, limit = 10): Promise<FetchUserResponse> => {
  try {
    const { data } = await axios.get<FetchUserResponse>("/api/users", {
      params: { page, limit },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export default function ProtectedPage() {
  const supabase = createClient();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [filter, setFilter] = useState('leads')
  const [filteredData, setFilteredData] = useState<FilteredData>({ 
    user: [], 
    page: 1, 
    total: 0, 
    totalPages: 0, 
    limit: ITEMS_PER_PAGE 
  })
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null
  });

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["users", currentPage],
    queryFn: () => fetchUsers(currentPage, ITEMS_PER_PAGE),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('Não autorizado - Token não encontrado')
        }

        const config = {
          headers: {
            'Authorization': session.access_token
          },
          params: {
            page: currentPage,
            limit: ITEMS_PER_PAGE
          }
        }

        let response;

        switch (filter) {
          case 'leads':
            response = await axios.get('/api/lead', config)
            break

          case 'clients':
            response = await axios.get('/api/client', config)
            break

          case 'anonymous':
            response = await axios.get('/api/anonymous', {
              params: { page: currentPage, limit: ITEMS_PER_PAGE }
            })
            break

          default:
            setFilteredData({ 
              user: users?.users || [],
              page: users?.page || 1,
              total: users?.total || 0,
              totalPages: users?.totalPages || 0,
              limit: users?.limit || ITEMS_PER_PAGE
            })
            setLoading(false)
            return
        }

        if (response?.data?.error) {
          throw new Error(response.data.error)
        }

        setFilteredData({
          user: response.data.users,
          page: response.data.page,
          total: response.data.total,
          totalPages: response.data.totalPages,
          limit: response.data.limit
        })

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Erro na requisição:', {
            name: error.name,
            message: error.message,
            response: error.response
          })
        } else {
          console.error('Erro desconhecido:', String(error))
        }
        setFilteredData({ 
          user: [],
          page: 1,
          total: 0,
          totalPages: 0,
          limit: ITEMS_PER_PAGE
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filter, users, currentPage])

  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePerPageChange = async (newPerPage: number) => {
    console.log("handlePerPageChange chamado com:", newPerPage);
    
    // Atualiza o estado local primeiro
    setFilteredData(prev => {
      console.log("Estado anterior:", prev);
      const updated = {
        ...prev,
        limit: newPerPage
      };
      console.log("Novo estado:", updated);
      return updated;
    });
    
    // Reset para a primeira página
    setCurrentPage(1);
    
    // Inicia a busca com novo valor
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Sessão encontrada:", !!session);
      
      // Simplificado para depuração - usar a função fetchData existente
      const fetchWithNewLimit = async () => {
        setLoading(true);
        
        try {
          let endpoint = filter === 'leads' ? '/api/lead' : 
                        filter === 'clients' ? '/api/client' : 
                        filter === 'anonymous' ? '/api/anonymous' : '/api/usuarios';
          
          let config = {
            headers: filter !== 'anonymous' ? 
                    { 'Authorization': `Bearer ${session?.access_token}` } : {},
            params: {
              page: 1,
              limit: newPerPage,
              sortBy: sortConfig.column || undefined,
              sortDirection: sortConfig.direction || undefined
            }
          };
          
          console.log("Fetch config:", config);
          console.log("Endpoint:", endpoint);
          
          const response = await axios.get(endpoint, config);
          console.log("Response:", response.data);
          
          setFilteredData({
            user: response.data.users || [],
            page: 1,
            total: response.data.total || 0,
            totalPages: response.data.totalPages || 0,
            limit: newPerPage
          });
        } catch (error) {
          console.error("Erro ao buscar com novo limite:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchWithNewLimit();
    } catch (error) {
      console.error("Erro ao obter sessão:", error);
    }
  };

  const meta = {
    page: filteredData?.page || 1,
    total: filteredData?.total || 0,
    totalPages: filteredData?.totalPages || 0,
    limit: filteredData?.limit || ITEMS_PER_PAGE,
  };

  const handleSort = useCallback(async (columnId: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column: columnId, direction });
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const config: {
        headers: { Authorization?: string },
        params: any
      } = {
        headers: {
          'Authorization': session?.access_token || ''
        },
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          sortBy: columnId,
          sortDirection: direction
        }
      };

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
          config.headers = {} as any;
          break;
      }

      const response = await axios.get(endpoint, config);
      
      setFilteredData({
        user: response.data.users,
        page: response.data.page,
        total: response.data.total,
        totalPages: response.data.totalPages,
        limit: response.data.limit
      });
    } catch (error) {
      console.error('Erro ao ordenar:', error);
      setFilteredData({ 
        user: [],
        page: 1,
        total: 0,
        totalPages: 0,
        limit: ITEMS_PER_PAGE
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, supabase]);

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
          result={filteredData} 
          isLoading={loading} 
          onSort={handleSort}
          currentPage={currentPage}
          totalResults={filteredData?.user || []}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
        />

        {filteredData?.user?.length > 0 && (
          <Pagination
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            pageIndex={meta.page}
            totalCount={meta.total}
            perPage={meta.limit}
          />
        )}

        {error && (
          <div className="text-red-500 p-4">
            Error fetching users. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}