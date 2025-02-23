"use client";

import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EventsTable } from "./events-table";
import { Pagination } from "@/components/pagination";
import { createClient } from "@/utils/supabase/client";
import { useState, useCallback } from "react";
import { redirect } from "next/navigation";
import { FetchEventsResponse } from "../types/events-type";

const fetchEvents = async (page = 1, limit = 10): Promise<FetchEventsResponse> => {
  try {
    const { data } = await axios.get<FetchEventsResponse>("/api/events", {
      params: { page, limit },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

export default function EventsPage() {
  const supabase = createClient();
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

  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ["events", currentPage, sortConfig],
    queryFn: async () => {
      const data = await fetchEvents(currentPage, ITEMS_PER_PAGE)
      console.log('Query response:', data) // Log para debug
      return data
    },
    refetchOnWindowFocus: false,
  });

  if (!supabase.auth.getUser()) {
    return redirect("/sign-in");
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
      
      // Update the query cache
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
            page: 1,
            total: 0,
            totalPages: 0,
            limit: ITEMS_PER_PAGE
          }} 
          isLoading={isLoading} 
          onSort={handleSort}
          currentPage={currentPage}
          totalResults={eventsData?.events || []}
          sortColumn={sortConfig.column}
          sortDirection={sortConfig.direction}
        />

        {(eventsData?.events?.length || 0) > 0 && (
          <Pagination
            onPageChange={handlePageChange}
            pageIndex={eventsData?.page || 1}
            totalCount={eventsData?.total || 0}
            perPage={eventsData?.limit || 10}
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