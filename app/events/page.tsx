"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EventsTable } from "./events-table";
import { Pagination } from "@/components/pagination";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback, useEffect } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { FetchEventsResponse } from "../types/events-type";

const fetchEvents = async (page = 1, limit = 10): Promise<FetchEventsResponse> => {
  try {
    const { data } = await axios.get<FetchEventsResponse>("/api/events", {
      params: { 
        page, 
        limit,
        ...Object.fromEntries(new URLSearchParams(window.location.search))
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export default function EventsPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    direction: null
  });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    const page = Number(searchParams.get('page')) || 1;
    setCurrentPage(page);
  }, [searchParams]);

  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/events?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ["events", currentPage, sortConfig, searchParams.toString()],
    queryFn: () => fetchEvents(currentPage, ITEMS_PER_PAGE),
  });

  const handleSort = useCallback(async (columnId: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column: columnId, direction });
    setLoading(true);
    try {
      const response = await axios.get('/api/events', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          sortBy: columnId,
          sortDirection: direction
        }
      });
      
      refetch();
    } catch (error) {
      console.error('Error sorting events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, refetch]);

  return (
    <div className="flex-1 w-full flex flex-col">
      <div className="w-full flex justify-between pb-4">
        <PageHeader pageTitle="Eventos" />
      </div>
      <div className="space-y-4 bg-white xl:space-y-6">
        <EventsTable 
          result={eventsData || { 
            events: [],
            meta: {
              total: 0,
              page: 1,
              limit: ITEMS_PER_PAGE,
              last_page: 1
            }
          }} 
          isLoading={isLoading} 
          onSort={handleSort}
          currentPage={currentPage}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
        />

        {(eventsData?.events?.length || 0) > 0 && (
          <Pagination
            onPageChange={handlePageChange}
            pageIndex={eventsData?.meta?.page || 1}
            totalCount={eventsData?.meta?.total || 0}
            perPage={eventsData?.meta?.limit || ITEMS_PER_PAGE}
          />
        )}

        {error && (
          <div className="text-red-500 p-4">
            Error fetching events. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}