import React, { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/pagination';

const EventosPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [hasCalculatedLimit, setHasCalculatedLimit] = React.useState(false);
  const [limit, setLimit] = React.useState(5);
  const [currentPage, setCurrentPage] = React.useState(1);

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
      
      setLimit(visibleRows);
      setHasCalculatedLimit(true);
      
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', visibleRows.toString());
      router.push(`/eventos?${params.toString()}`, { scroll: false });
    };
    
    setTimeout(calculateVisibleRows, 100);
  }, [hasCalculatedLimit, router, searchParams]);

  const handlePerPageChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit.toString());
    params.set('page', '1');
    router.push(`/eventos?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div ref={containerRef}>
      {/* Renderização do componente */}
      {(eventsData?.events?.length || 0) > 0 && (
        <div className="mt-auto py-4">
          <Pagination
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            pageIndex={eventsData?.meta?.page || 1}
            totalCount={eventsData?.meta?.total || 0}
            perPage={eventsData?.meta?.limit || limit}
          />
        </div>
      )}
    </div>
  );
};

export default EventosPage; 