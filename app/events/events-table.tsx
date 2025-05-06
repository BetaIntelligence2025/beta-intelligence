'use client'

import { Event } from "@/app/types/events-type"
import { columns as defaultColumns } from "./columns"
import { EventsTableRow } from "./events-table-row"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowUpDown, ChevronDown, ChevronUp, DownloadIcon, Loader2, FileIcon, FileArchiveIcon, FileText, Settings2, RefreshCw } from "lucide-react"
import { Column } from "./columns"
import { EventColumnId } from "../stores/use-events-columns-store"
import { EventsFilters } from "./events-filters"
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ColumnManagementModal } from "./column-management-modal"
import { Pagination } from "@/components/pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useColumnsStore } from "./stores/columns-store"
import { debounce } from 'lodash'

/**
 * Função utilitária para converter datas para o formato BRT (horário de Brasília)
 */
function formatDateToBRT(dateStr: string): string {
  try {
    // Converter a string de data para objeto Date
    const dateObj = new Date(dateStr);
    
    // Verificar se a data é válida
    if (!isNaN(dateObj.getTime())) {
      // Converter para o horário de Brasília (BRT, UTC-3)
      const options: Intl.DateTimeFormatOptions = { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric', 
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      return dateObj.toLocaleString('pt-BR', options);
    }
  } catch (error) {
    console.error("Erro ao formatar data para BRT:", error);
  }
  
  // Retornar o valor original se não conseguir converter
  return dateStr;
}

// Helper functions for URL handling
function areParamsEqual(p1: URLSearchParams, p2: URLSearchParams): boolean {
  return p1.toString() === p2.toString();
}

// Helper to safely handle null values from URLSearchParams
function safeParamValue(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

// The fixed limit constant - always use 20 rows
const FIXED_LIMIT = 20;

function buildUrlParams(
  filters: {
    dateFrom?: string | null | undefined;
    dateTo?: string | null | undefined;
    timeFrom?: string | null | undefined;
    timeTo?: string | null | undefined;
    professionId?: string | null | undefined;
    funnelId?: string | null | undefined;
  },
  page = 1,
  limit = 20,
  sort?: { 
    column?: string | undefined;
    direction?: 'asc' | 'desc' | undefined 
  }
): URLSearchParams {
  const params = new URLSearchParams();
  
  // Add filters
  if (filters.dateFrom) params.set('from', filters.dateFrom);
  if (filters.dateTo) params.set('to', filters.dateTo);
  if (filters.timeFrom) params.set('time_from', filters.timeFrom);
  if (filters.timeTo) params.set('time_to', filters.timeTo);
  if (filters.professionId) params.set('profession_id', filters.professionId);
  if (filters.funnelId) params.set('funnel_id', filters.funnelId);
  
  // Add pagination and sorting
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  
  if (sort?.column) params.set('sortBy', sort.column);
  if (sort?.direction) params.set('sortDirection', sort.direction);
  
  return params;
}

interface SortableHeaderProps {
  column: Column;       
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null | string;
  onSort: (columnId: string, direction: 'asc' | 'desc') => void;
}

function SortableHeader({ 
  column,
  sortColumn,
  sortDirection,
  onSort
}: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.accessorKey });

  const isCurrentSortColumn = sortColumn === column.accessorKey;

  // Classe adicional para a coluna de telefone
  const isPhoneColumn = column.accessorKey === "user.phone";
  const columnClass = `px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wider cursor-pointer 
    ${isPhoneColumn ? 'min-w-[130px]' : ''}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
  }

  // Definir larguras por tipo de coluna
  const getColumnWidth = (accessorKey: string) => {
    const columnWidths: Record<string, string> = {
      // Colunas estreitas
      'event_id': '80px',
      'event_name': '140px',
      'event_time': '120px',
      'tipo': '80px',
      'data': '100px',
      'nome': '120px',
      'email': '160px',
      'telefone': '120px',
      'cliente': '80px',
      'profissao': '140px',
      'produto': '140px',
      'funil': '140px',
      
      // Colunas médias
      'utmSource': '140px',
      'utmMedium': '140px',
      'utmCampaign': '180px',
      'utmContent': '160px',
      'utmTerm': '140px',
      'pais': '100px',
      'estado': '100px',
      'cidade': '140px',
      'dispositivo': '120px',
      
      // Valor padrão
      'default': '140px'
    };
    
    return columnWidths[accessorKey] || columnWidths['default'];
  };

  // Estado para largura customizada
  const [width, setWidth] = useState(getColumnWidth(column.accessorKey));
  const [resizing, setResizing] = useState(false);
  
  // Função para lidar com redimensionamento
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizing(true);
    
    const startX = e.pageX;
    const startWidth = parseInt(width);
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.pageX;
      const newWidth = Math.max(80, startWidth + (currentX - startX));
      setWidth(`${newWidth}px`);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing(false);
      
      // Você pode salvar a largura em localStorage aqui
      const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
      savedWidths[column.accessorKey] = width;
      localStorage.setItem('columnWidths', JSON.stringify(savedWidths));
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Carregar larguras salvas ao montar
  useEffect(() => {
    const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
    if (savedWidths[column.accessorKey]) {
      setWidth(savedWidths[column.accessorKey]);
    }
  }, [column.accessorKey]);

  // Prevenir conflito entre ordenamento e arraste
  const handleSortClick = (e: React.MouseEvent) => {
    if (resizing) return; // Não ordenar durante redimensionamento
    e.stopPropagation(); // Impedir que o arraste seja acionado junto com a ordenação
    onSort(column.accessorKey, isCurrentSortColumn && sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        width: width,
        minWidth: width,
        position: 'relative',
        userSelect: 'none'
      }}
      className={`group relative px-3 py-3.5 text-left text-sm font-semibold text-gray-900 ${isDragging ? 'opacity-50' : ''} ${resizing ? 'cursor-col-resize' : ''}`}
    >
      <div 
        className="flex items-center justify-between"
        {...(resizing ? {} : attributes)}
        {...(resizing ? {} : listeners)}
      >
        <div 
          className="flex items-center cursor-pointer"
          onClick={handleSortClick}
        >
          {column.header}
          {isCurrentSortColumn && (
            <span className="ml-1">
              {sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          )}
          {!isCurrentSortColumn && (
            <ArrowUpDown className="ml-1 h-4 w-4 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      </div>
      
      {/* Resizer handle */}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize group/resizer"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="h-full w-1 bg-transparent group-hover/resizer:bg-gray-300"></div>
      </div>
    </th>
  );
}

export interface Meta {
  total: number
  page: number
  limit: number
  last_page: number
  profession_id?: number
  funnel_id?: number
}

export interface EventsTableProps {
  events: Event[]
  isLoading: boolean
  meta?: Meta
  error?: any
  searchParams: string
  currentPage: number
  sortColumn?: string | null
  sortDirection?: 'asc' | 'desc' | string | null
  onSort: (column: string, direction: 'asc' | 'desc') => void
  onPerPageChange?: (perPage: number) => void
  onExport?: (selectedEvents: Event[]) => void
  onPageChange: (page: number) => void
}

export function EventsTable({
  events,
  isLoading,
  meta,
  searchParams,
  currentPage,
  sortColumn,
  sortDirection,
  onSort,
  onPerPageChange,
  onExport,
  onPageChange
}: EventsTableProps) {
  // Create inline isMounted implementation
  const [isMounted, setIsMounted] = useState(false);
  
  // Set isMounted to true after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const router = useRouter()
  const searchParamsObj = useSearchParams()
  const { visibleColumns } = useColumnsStore()
  
  // Recupera filtros da URL - memoizado para evitar recriações desnecessárias
  const getFiltersFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const from = params.get('from');
    const to = params.get('to');
    const timeFrom = params.get('time_from');
    const timeTo = params.get('time_to');
    const professionId = params.get('profession_id');
    const funnelId = params.get('funnel_id');
    
    return {
      dateFrom: from || undefined,
      dateTo: to || undefined,
      timeFrom: timeFrom || undefined,
      timeTo: timeTo || undefined,
      professionId: professionId || undefined,
      funnelId: funnelId || undefined
    }
  }, [searchParams])
  
  // Log dos eventos para verificar a estrutura de dados
  useEffect(() => {
    if (events && events.length > 0) {
      console.log('EventsTable received data count:', events.length);
    }
  }, [events]);
  
  // Memorizar as colunas visíveis para evitar re-renderizações desnecessárias
  const columnsData = useMemo(() => 
    visibleColumns
      .map(id => defaultColumns.find(col => col.accessorKey === id))
      .filter(Boolean) as Column[], 
  [visibleColumns])
  
  const [exportAllLoading, setExportAllLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({})
  const [selectAll, setSelectAll] = useState(false)
  const [filterChangeInProgress, setFilterChangeInProgress] = useState(false)
  
  // State for filters
  const [filters, setFilters] = useState(() => getFiltersFromUrl());
  
  // Update filters when URL changes
  useEffect(() => {
    setFilters(getFiltersFromUrl());
  }, [searchParams, getFiltersFromUrl]);
  
  // Debounced URL update function
  const debouncedUpdateUrl = useMemo(() => debounce((url: string) => {
    router.replace(url, { scroll: false });
  }, 300), [router]);

  // Cleanup function for debounced operations
  useEffect(() => {
    return () => {
      debouncedUpdateUrl.cancel();
    };
  }, [debouncedUpdateUrl]);

  // Apply filters with URL update
  const handleFilterChange = useCallback((newFilters: { 
    dateFrom?: string | null | undefined;
    dateTo?: string | null | undefined;
    timeFrom?: string | null | undefined;
    timeTo?: string | null | undefined;
    professionId?: string | null | undefined; 
    funnelId?: string | null | undefined;
    advancedFilters?: any[] | null | undefined;
    filterCondition?: 'AND' | 'OR' | null | undefined;
  }) => {
    // If a filter change is already in progress, queue it
    if (filterChangeInProgress) {
      console.log('[Filters] Change already in progress, queueing update');
      setTimeout(() => handleFilterChange(newFilters), 400);
      return;
    }
    
    setFilterChangeInProgress(true);
    document.querySelector('.table-loading-overlay')?.classList.remove('hidden');
    
    // Store filter values in session storage if needed
    if (newFilters.dateFrom !== undefined) {
      if (newFilters.dateFrom) {
        sessionStorage.setItem('events_from_date', newFilters.dateFrom);
      } else {
        sessionStorage.removeItem('events_from_date');
      }
    }
    
    if (newFilters.dateTo !== undefined) {
      if (newFilters.dateTo) {
        sessionStorage.setItem('events_to_date', newFilters.dateTo);
      } else {
        sessionStorage.removeItem('events_to_date');
      }
    }
    
    if (newFilters.timeFrom !== undefined) {
      if (newFilters.timeFrom) {
        sessionStorage.setItem('events_time_from', newFilters.timeFrom);
      } else {
        sessionStorage.removeItem('events_time_from');
      }
    }
    
    if (newFilters.timeTo !== undefined) {
      if (newFilters.timeTo) {
        sessionStorage.setItem('events_time_to', newFilters.timeTo);
      } else {
        sessionStorage.removeItem('events_time_to');
      }
    }
    
    // Se temos filtros de data válidos, marcar que o filtro foi aplicado
    if (newFilters.dateFrom && newFilters.dateTo) {
      sessionStorage.setItem('events_default_filter_applied', 'true');
    }
    
    // Create new filters object merging current with changes
    const updatedFilters: typeof filters = { ...filters };
    
    // Update only the properties that have changed - with type safety
    if (newFilters.dateFrom !== undefined) updatedFilters.dateFrom = newFilters.dateFrom || undefined;
    if (newFilters.dateTo !== undefined) updatedFilters.dateTo = newFilters.dateTo || undefined;
    if (newFilters.timeFrom !== undefined) updatedFilters.timeFrom = newFilters.timeFrom || undefined;
    if (newFilters.timeTo !== undefined) updatedFilters.timeTo = newFilters.timeTo || undefined;
    if (newFilters.professionId !== undefined) updatedFilters.professionId = newFilters.professionId || undefined;
    if (newFilters.funnelId !== undefined) updatedFilters.funnelId = newFilters.funnelId || undefined;
    
    // Update local state
    setFilters(updatedFilters);
    
    // Generate URL parameters, reset to page 1, but preserve sort
    const sortBy = searchParamsObj.get('sortBy');
    const sortDirection = searchParamsObj.get('sortDirection') as 'asc' | 'desc' | null;
    
    const currentParams = new URLSearchParams(searchParams);
    const newParams = new URLSearchParams();
    
    // Always set page to 1 and limit to FIXED_LIMIT when filters change
    newParams.set('page', '1');
    newParams.set('limit', FIXED_LIMIT.toString());
    
    // Add sorting parameters if present
    if (sortBy) newParams.set('sortBy', sortBy);
    if (sortDirection) newParams.set('sortDirection', sortDirection);
    
    // Add basic filters if they exist
    if (updatedFilters.dateFrom) newParams.set('from', updatedFilters.dateFrom);
    if (updatedFilters.dateTo) newParams.set('to', updatedFilters.dateTo);
    if (updatedFilters.timeFrom) newParams.set('time_from', updatedFilters.timeFrom);
    if (updatedFilters.timeTo) newParams.set('time_to', updatedFilters.timeTo);
    if (updatedFilters.professionId) newParams.set('profession_id', updatedFilters.professionId);
    if (updatedFilters.funnelId) newParams.set('funnel_id', updatedFilters.funnelId);
    
    // Handle advanced filters if provided
    if (newFilters.advancedFilters !== undefined) {
      if (newFilters.advancedFilters && newFilters.advancedFilters.length > 0) {
        const serializedFilters = JSON.stringify(newFilters.advancedFilters);
        newParams.set('advanced_filters', serializedFilters);
        
        // Also set filter condition if provided, default to AND
        const filterCondition = newFilters.filterCondition || 'AND';
        newParams.set('filter_condition', filterCondition);
        
        // Store in sessionStorage for consistency
        sessionStorage.setItem('events_advanced_filters', serializedFilters);
        sessionStorage.setItem('events_filter_condition', filterCondition);
      } else {
        // Clear advanced filters from sessionStorage
        sessionStorage.removeItem('events_advanced_filters');
        sessionStorage.removeItem('events_filter_condition');
      }
    } else {
      // If not explicitly provided, preserve existing advanced filters
      const currentAdvancedFilters = currentParams.get('advanced_filters');
      const currentFilterCondition = currentParams.get('filter_condition');
      
      if (currentAdvancedFilters) {
        newParams.set('advanced_filters', currentAdvancedFilters);
        if (currentFilterCondition) {
          newParams.set('filter_condition', currentFilterCondition);
        } else {
          newParams.set('filter_condition', 'AND'); // Default to AND if missing
        }
      }
    }
    
    // Only update if params actually changed
    if (!areParamsEqual(newParams, currentParams)) {
      // Use replace instead of push as this is logical navigation
      const updateUrl = async () => {
        try {
          await router.replace(`/events?${newParams.toString()}`, { scroll: false });
          
          // Dispatch an event to notify page.tsx that filters have changed
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('filters-updated', { 
              detail: { 
                filters: { ...updatedFilters },
                advancedFilters: newFilters.advancedFilters,
                filterCondition: newFilters.filterCondition
              } 
            }));
          }
          
          setTimeout(() => {
            setFilterChangeInProgress(false);
          }, 300);
        } catch (error) {
          console.error('Error updating URL with new filters:', error);
          setFilterChangeInProgress(false);
        }
      };
      
      // Use debounce for URL updates to prevent rapid changes
      debouncedUpdateUrl(`/events?${newParams.toString()}`);
      
      // Still need to set loading state to false after debounce period
      setTimeout(() => {
        setFilterChangeInProgress(false);
        document.querySelector('.table-loading-overlay')?.classList.add('hidden');
      }, 400); // Slightly longer than debounce time
    } else {
      // If no change, just reset loading state
      setFilterChangeInProgress(false);
      document.querySelector('.table-loading-overlay')?.classList.add('hidden');
    }
  }, [filters, router, searchParams, searchParamsObj, debouncedUpdateUrl]);

  const handleSort = useCallback((columnId: string) => {
    // Get current filters and pagination
    const currentFilters = getFiltersFromUrl();
    const page = searchParamsObj.get('page') || '1';
    
    // Determine new sort direction
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortColumn === columnId && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    
    // Build params preserving current state
    const params = buildUrlParams(
      currentFilters, 
      parseInt(page, 10), 
      FIXED_LIMIT, 
      { column: columnId, direction: newDirection }
    );
    
    // Update URL and notify parent
    router.replace(`/events?${params.toString()}`, { scroll: false });
    onSort(columnId, newDirection);
  }, [router, searchParamsObj, sortColumn, sortDirection, getFiltersFromUrl, onSort]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (result: DragEndEvent) => {
    const { active, over } = result;
    
    if (!over) return;
    
    if (active.id !== over.id) {
      const oldIndex = visibleColumns.indexOf(active.id as string);
      const newIndex = visibleColumns.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderColumns = arrayMove(visibleColumns, oldIndex, newIndex);
        
        // Update the store with the new column order
        useColumnsStore.setState({ visibleColumns: newOrderColumns });
      }
    }
  }

  const handlePageChange = useCallback((page: number) => {
    // Don't trigger page changes if already loading or same page
    if (isLoading || page === currentPage) return;
    
    // Show loading overlay
    document.querySelector('.table-loading-overlay')?.classList.remove('hidden');
    
    // Build URL with current filters and sorting, just change page
    const currentFilters = getFiltersFromUrl();
    const sortBy = searchParamsObj.get('sortBy');
    const sortDirection = searchParamsObj.get('sortDirection') as 'asc' | 'desc' | null;
    
    const params = buildUrlParams(
      currentFilters, 
      page, 
      FIXED_LIMIT, 
      { 
        column: safeParamValue(sortBy),
        direction: sortDirection === null ? undefined : sortDirection
      }
    );
    
    // Update URL, calling onPageChange for parent sync
    router.replace(`/events?${params.toString()}`, { scroll: false });
    onPageChange(page);
  }, [router, getFiltersFromUrl, searchParamsObj, isLoading, currentPage, onPageChange]);

  const handlePerPageChange = useCallback((newLimit: number) => {
    // Always use FIXED_LIMIT regardless of what was requested
    
    // Build URL with current filters, sorting, and page 1
    const currentFilters = getFiltersFromUrl();
    const sortBy = searchParamsObj.get('sortBy');
    const sortDirection = searchParamsObj.get('sortDirection') as 'asc' | 'desc' | null;
    
    // Reset to page 1 when changing limit
    const params = buildUrlParams(
      currentFilters, 
      1, 
      FIXED_LIMIT, 
      { 
        column: safeParamValue(sortBy),
        direction: sortDirection === null ? undefined : sortDirection
      }
    );
    
    // Update URL and notify parent if needed
    router.replace(`/events?${params.toString()}`, { scroll: false });
    
    if (onPerPageChange) {
      onPerPageChange(FIXED_LIMIT);
    }
  }, [router, getFiltersFromUrl, searchParamsObj, onPerPageChange]);

  // Verificar se todos estão selecionados e atualizar o estado selectAll
  useEffect(() => {
    if (!events || events.length === 0) {
      setSelectAll(false)
      return
    }
    
    const allSelected = events.every(event => selectedRows[event.event_id])
    setSelectAll(allSelected)
  }, [selectedRows, events])
  
  // Selecionar/deselecionar uma linha
  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }
  
  // Selecionar/deselecionar todas as linhas
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRows({})
    } else {
      const newSelectedRows: Record<string, boolean> = {}
      events.forEach(event => {
        newSelectedRows[event.event_id] = true
      })
      setSelectedRows(newSelectedRows)
    }
    setSelectAll(!selectAll)
  }
  
  // Exportar eventos selecionados
  const handleExport = () => {
    const selectedEvents: Event[] = events.filter(event => selectedRows[event.event_id])
    
    if (selectedEvents.length === 0) {
      alert('Selecione pelo menos um evento para exportar')
      return
    }
    
    // Deduplica os eventos selecionados
    const uniqueEvents: Event[] = [];
    const eventIdMap = new Map<string, boolean>();
    
    for (const event of selectedEvents) {
      if (!eventIdMap.has(event.event_id)) {
        eventIdMap.set(event.event_id, true);
        uniqueEvents.push(event);
      }
    }
    
    // Obter cabeçalhos das colunas visíveis
    const headers = columnsData.map(column => column.header)
    
    // Formatar os dados para CSV
    const rows = uniqueEvents.map(event => {
      return columnsData.map(column => {
        const key = column.accessorKey
        let value = ''
        
        if (key.includes('.')) {
          // Lidar com propriedades aninhadas
          const keys = key.split('.')
          let currentValue: any = event
          
          for (const k of keys) {
            if (currentValue === null || currentValue === undefined) {
              value = '-'
              break
            }
            currentValue = currentValue[k as keyof typeof currentValue]
          }
          
          value = currentValue !== undefined ? String(currentValue) : '-'
          
          // Formatar valores booleanos para "Cliente" (user.isClient)
          if (key === "user.isClient") {
            value = currentValue === true ? "Sim" : "Não";
          }
        } else {
          // Propriedade direta
          const eventKey = key as keyof typeof event
          value = event[eventKey] !== undefined ? String(event[eventKey]) : '-'
        }
        
        // Formatação especial para campos de data (event_time)
        if (key === 'event_time' && value && value !== '-') {
          value = formatDateToBRT(value);
        }
        
        // Escapar vírgulas e aspas no valor para CSV
        return `"${value.replace(/"/g, '""')}"`
      }).join(',')
    })
    
    // Criar conteúdo CSV
    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n')
    
    // Criar blob e URL
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    // Criar link para download
    const link = document.createElement('a')
    const date = new Date()
    // Formatar data no horário de Brasília para o nome do arquivo
    const brazilDate = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-')
    link.setAttribute('href', url)
    link.setAttribute('download', `eventos_exportados_${brazilDate}.csv`)
    link.style.visibility = 'hidden'
    
    // Adicionar à página, clicar e remover
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Opcional: chamar callback de exportação
    if (onExport) {
      onExport(uniqueEvents)
    }
  }

  // Exportar todos os eventos da tabela atual
  const handleExportCurrentPage = () => {
    if (events.length === 0) {
      alert('Não há eventos para exportar');
      return;
    }
    
    // Deduplica os eventos da página atual
    const uniqueEvents: Event[] = [];
    const eventIdMap = new Map<string, boolean>();
    
    for (const event of events) {
      if (!eventIdMap.has(event.event_id)) {
        eventIdMap.set(event.event_id, true);
        uniqueEvents.push(event);
      }
    }
    
    // Obter cabeçalhos das colunas visíveis
    const headers = columnsData.map(column => column.header);
    
    // Formatar os dados para CSV
    const rows = uniqueEvents.map(event => {
      return columnsData.map(column => {
        const key = column.accessorKey;
        let value = '';
        
        if (key.includes('.')) {
          // Lidar com propriedades aninhadas
          const keys = key.split('.');
          let currentValue: any = event;
          
          for (const k of keys) {
            if (currentValue === null || currentValue === undefined) {
              value = '-';
              break;
            }
            currentValue = currentValue[k as keyof typeof currentValue];
          }
          
          value = currentValue !== undefined ? String(currentValue) : '-';
          
          // Formatar valores booleanos para "Cliente" (user.isClient)
          if (key === "user.isClient") {
            value = currentValue === true ? "Sim" : "Não";
          }
        } else {
          // Propriedade direta
          const eventKey = key as keyof typeof event;
          value = event[eventKey] !== undefined ? String(event[eventKey]) : '-';
        }
        
        // Formatação especial para campos de data (event_time)
        if (key === 'event_time' && value && value !== '-') {
          value = formatDateToBRT(value);
        }
        
        // Escapar vírgulas e aspas no valor para CSV
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    // Criar conteúdo CSV
    const csvContent = [
      headers.join(','),
      ...rows
    ].join('\n');
    
    // Criar blob e URL
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Criar link para download
    const link = document.createElement('a');
    // Formatar data no horário de Brasília para o nome do arquivo
    const date = new Date()
    const brazilDate = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-')
    link.setAttribute('href', url);
    link.setAttribute('download', `eventos_pagina_${meta?.page || 1}_${brazilDate}.csv`);
    link.style.visibility = 'hidden';
    
    // Adicionar à página, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL
    URL.revokeObjectURL(url);
  };

  // Exportar todos os eventos com base nos filtros aplicados
  const handleExportAll = useCallback(async () => {
    // Confirmar a exportação
    const totalRegistros = meta?.total || 0;
    
    let mensagem = `Você está prestes a exportar ${totalRegistros} registros.`;
    
    if (totalRegistros > 10000) {
      mensagem += ` Este é um volume muito grande de dados e a exportação pode levar vários minutos ou até falhar dependendo do seu navegador.`;
    } else if (totalRegistros > 1000) {
      mensagem += ` Isso pode levar algum tempo.`;
    }
    
    mensagem += ` Deseja continuar?`;
    
    if (!confirm(mensagem)) {
      return;
    }
    
    try {
      // Mostrar indicador de carregamento
      setExportAllLoading(true);
      setExportProgress(0);
      
      // Criar parâmetros com os filtros atuais
      const baseParams = new URLSearchParams(searchParams.toString());
      baseParams.delete('page'); // Remover página atual
      baseParams.delete('limit'); // Remover limite atual
      
      
      // Primeiro, tentar obter todos os registros de uma vez
      const exportParams = new URLSearchParams(baseParams.toString());
      exportParams.set('export', 'true');
      
      
      let allEvents: Event[] = [];
      let usedPagination = false;
      
      // Primeira tentativa: obter todos os registros de uma vez
      try {
        const response = await fetch(`/api/events?${exportParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Erro na exportação direta: ${response.status}`);
        }
        
        const data = await response.json();
        allEvents = data.events || [];
        
        
        // Se recebemos menos registros do que o esperado, vamos usar paginação
        if (allEvents.length < totalRegistros) {
          usedPagination = true;
          
          // Informar o usuário que estamos mudando para paginação
          
          // Limpar os eventos obtidos e usar paginação
          allEvents = [];
          
          // Definir um tamanho de página grande para minimizar o número de requisições
          const pageSize = 1000;
          const totalPages = Math.ceil(totalRegistros / pageSize);
          
          // Atualizar o progresso para mostrar que estamos buscando os dados
          setExportProgress(1); // 1% para mostrar que começamos
          
          // Map para rastrear IDs de eventos já coletados (para evitar duplicatas)
          const eventIdMap = new Map<string, boolean>();
          
          // Buscar todas as páginas
          for (let page = 1; page <= totalPages; page++) {
            const pageParams = new URLSearchParams(baseParams.toString());
            pageParams.set('page', String(page));
            pageParams.set('limit', String(pageSize));
            
            
            const pageResponse = await fetch(`/api/events?${pageParams.toString()}`);
            if (!pageResponse.ok) {
              throw new Error(`Erro ao buscar página ${page}: ${pageResponse.status}`);
            }
            
            const pageData = await pageResponse.json();
            const pageEvents = pageData.events || [];
            
            
            // Adicionar os eventos desta página ao total, evitando duplicatas
            for (const event of pageEvents) {
              if (!eventIdMap.has(event.event_id)) {
                eventIdMap.set(event.event_id, true);
                allEvents.push(event);
              }
            }
            
            // Atualizar o progresso (reservamos 50% do progresso para a busca dos dados)
            const fetchProgress = Math.round((page / totalPages) * 50);
            setExportProgress(fetchProgress);
            
            // Pequena pausa para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } else {
          // Deduplica os eventos obtidos diretamente
          const uniqueEvents: Event[] = [];
          const eventIdMap = new Map<string, boolean>();
          
          for (const event of allEvents) {
            if (!eventIdMap.has(event.event_id)) {
              eventIdMap.set(event.event_id, true);
              uniqueEvents.push(event);
            }
          }
          
          allEvents = uniqueEvents;
        }
      } catch (error) {
        console.error('Erro na exportação direta, tentando paginação:', error);
        
        // Se a exportação direta falhar, tentar com paginação
        usedPagination = true;
        
        // Definir um tamanho de página grande para minimizar o número de requisições
        const pageSize = 1000;
        const totalPages = Math.ceil(totalRegistros / pageSize);
        
        // Atualizar o progresso para mostrar que estamos buscando os dados
        setExportProgress(1); // 1% para mostrar que começamos
        
        // Map para rastrear IDs de eventos para evitar duplicatas
        const eventIdMap = new Map<string, boolean>();
        
        // Buscar todas as páginas
        for (let page = 1; page <= totalPages; page++) {
          const pageParams = new URLSearchParams(baseParams.toString());
          pageParams.set('page', String(page));
          pageParams.set('limit', String(pageSize));
          
          
          const pageResponse = await fetch(`/api/events?${pageParams.toString()}`);
          if (!pageResponse.ok) {
            throw new Error(`Erro ao buscar página ${page}: ${pageResponse.status}`);
          }
          
          const pageData = await pageResponse.json();
          const pageEvents = pageData.events || [];
          
          
          // Adicionar os eventos desta página ao total, evitando duplicatas
          for (const event of pageEvents) {
            if (!eventIdMap.has(event.event_id)) {
              eventIdMap.set(event.event_id, true);
              allEvents.push(event);
            }
          }
          
          // Atualizar o progresso (reservamos 50% do progresso para a busca dos dados)
          const fetchProgress = Math.round((page / totalPages) * 50);
          setExportProgress(fetchProgress);
          
          // Pequena pausa para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      }
      
      if (allEvents.length === 0) {
        alert('Não há eventos para exportar');
        setExportAllLoading(false);
        setExportProgress(0);
        return;
      }
      
      // Verificar se obtivemos todos os registros
      if (allEvents.length < totalRegistros) {
        console.warn(`Atenção: Recebidos menos eventos (${allEvents.length}) do que o esperado (${totalRegistros})`);
        
        // Perguntar ao usuário se deseja continuar mesmo com menos registros
        if (!confirm(`Foram recebidos apenas ${allEvents.length} de ${totalRegistros} registros. Deseja continuar com a exportação parcial?`)) {
          setExportAllLoading(false);
          setExportProgress(0);
          return;
        }
      }
      
      // Obter cabeçalhos das colunas visíveis
      const headers = columnsData.map(column => column.header);
      
      // Iniciar com os cabeçalhos
      const csvRows = [headers.join(',')];
      
      // Processar os dados em lotes para evitar travamentos com grandes volumes
      const totalEvents = allEvents.length;
      
      // Ajustar o tamanho do lote com base no número total de registros
      let batchSize = 1000;
      if (totalEvents > 50000) {
        batchSize = 5000;
      } else if (totalEvents > 10000) {
        batchSize = 2000;
      }
      
      const totalBatches = Math.ceil(totalEvents / batchSize);
      
      
      // Calcular o progresso inicial com base no método usado
      // Se usamos paginação, já usamos 50% do progresso para buscar os dados
      // Caso contrário, começamos do zero
      let progressOffset = usedPagination ? 50 : 0;
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, totalEvents);
        const batch = allEvents.slice(start, end);
        
        
        // Formatar os dados do lote para CSV
        const batchRows = batch.map((event: Event) => {
          return columnsData.map(column => {
            const key = column.accessorKey;
            let value = '';
            
            if (key.includes('.')) {
              // Lidar com propriedades aninhadas
              const keys = key.split('.');
              let currentValue: any = event;
              
              for (const k of keys) {
                if (currentValue === null || currentValue === undefined) {
                  value = '-';
                  break;
                }
                currentValue = currentValue[k as keyof typeof currentValue];
              }
              
              value = currentValue !== undefined ? String(currentValue) : '-';
              
              // Formatar valores booleanos para "Cliente" (user.isClient)
              if (key === "user.isClient") {
                value = currentValue === true ? "Sim" : "Não";
              }
            } else {
              // Propriedade direta
              const eventKey = key as keyof typeof event;
              value = event[eventKey] !== undefined ? String(event[eventKey]) : '-';
            }
            
            // Formatação especial para campos de data (event_time)
            if (key === 'event_time' && value && value !== '-') {
              value = formatDateToBRT(value);
            }
            
            // Escapar vírgulas e aspas no valor para CSV
            return `"${value.replace(/"/g, '""')}"`;
          }).join(',');
        });
        
        // Adicionar as linhas do lote ao CSV
        csvRows.push(...batchRows);
        
        // Atualizar o progresso
        // Se usamos paginação, os 50% restantes são para o processamento
        // Caso contrário, usamos 100% para o processamento
        const processingProgress = Math.round(((i + 1) / totalBatches) * (100 - progressOffset));
        setExportProgress(progressOffset + processingProgress);
        
        // Permitir que a UI seja atualizada
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      
      // Criar conteúdo CSV
      const csvContent = csvRows.join('\n');
      
      // Criar blob e URL
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      // Formatar data no horário de Brasília para o nome do arquivo
      const date = new Date()
      const brazilDate = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\//g, '-')
      link.setAttribute('href', url);
      link.setAttribute('download', `todos_eventos_exportados_${brazilDate}.csv`);
      link.style.visibility = 'hidden';
      
      // Adicionar à página, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Erro ao exportar todos os eventos:', error);
      alert(`Erro ao exportar eventos: ${error.message || 'Erro desconhecido'}. Por favor, tente novamente.`);
    } finally {
      setExportAllLoading(false);
      setExportProgress(0);
    }
  }, [columnsData, searchParams, meta]);

  // Replace the early return with a variable
  let tableContent = (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <EventsFilters 
            onFilterChange={handleFilterChange}
            initialFilters={useMemo(() => ({
              ...getFiltersFromUrl(),
              professionId: meta?.profession_id?.toString(),
              funnelId: meta?.funnel_id?.toString(),
              // Add support for advanced filters
              advancedFilters: (() => {
                try {
                  const advFiltersParam = new URLSearchParams(searchParams).get('advanced_filters');
                  return advFiltersParam ? JSON.parse(advFiltersParam) : undefined;
                } catch (e) {
                  console.error('Error parsing advanced filters:', e);
                  return undefined;
                }
              })(),
              filterCondition: (() => {
                const condition = new URLSearchParams(searchParams).get('filter_condition');
                return condition === 'AND' || condition === 'OR' ? condition : undefined;
              })()
            }), [getFiltersFromUrl, meta?.profession_id, meta?.funnel_id, searchParams])}
          />
          {Object.keys(selectedRows).filter(id => selectedRows[id]).length > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              {Object.keys(selectedRows).filter(id => selectedRows[id]).length} selecionados
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(selectedRows).filter(id => selectedRows[id]).length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleExport}
            >
              <DownloadIcon className="h-4 w-4" />
              Exportar selecionados
            </Button>
          )}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  disabled={exportAllLoading}
                >
                  {exportAllLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Exportando... {exportProgress > 0 ? `${exportProgress}%` : ''}</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="h-4 w-4" />
                      <span>Exportar</span>
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCurrentPage} disabled={events.length === 0}>
                  <FileIcon className="h-4 w-4 mr-2" />
                  Exportar página atual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAll}>
                  <FileArchiveIcon className="h-4 w-4 mr-2" />
                  Exportar todos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnManagementOpen(true)}
              className="flex items-center gap-1"
            >
              <Settings2 className="h-4 w-4" />
              Colunas
            </Button>
            <ColumnManagementModal
              isOpen={isColumnManagementOpen}
              onClose={() => {
                setIsColumnManagementOpen(false);
              }}
              visibleColumns={visibleColumns}
              onColumnChange={(newColumns) => {
                useColumnsStore.setState({ visibleColumns: newColumns });
              }}
            />
          </div>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1 relative" ref={tableContainerRef}>
          <div className={`absolute inset-0 bg-white/70 z-50 flex items-center justify-center table-loading-overlay ${isLoading ? '' : 'hidden'}`}>
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="mt-2 text-sm font-medium text-gray-600">Carregando...</span>
            </div>
          </div>
          
          {/* Render a static table during SSR, and the DndContext only on client */}
          {!isMounted ? (
            <table className="w-full min-w-full whitespace-nowrap text-[13px] relative">
              <thead className="bg-zinc-100 sticky top-0 z-20">
                <tr className="divide-x divide-gray-200">
                  <th className="w-10 px-3 py-3.5 text-left">
                    <Checkbox checked={false} aria-label="Selecionar todos" />
                  </th>
                  {columnsData.map((column) => (
                    <th 
                      key={column.accessorKey}
                      className="group relative px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center cursor-pointer">
                          {column.header}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {!isLoading && (!events || events.length === 0) && (
                  <tr>
                    <td 
                      colSpan={columnsData.length + 1} 
                      className="px-6 py-4 text-center text-gray-500 text-xs"
                    >
                      Nenhum evento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <table className="w-full min-w-full whitespace-nowrap text-[13px] relative">
                <thead className="bg-zinc-100 sticky top-0 z-20">
                  <tr className="divide-x divide-gray-200">
                    {/* Coluna de seleção */}
                    <th className="w-10 px-3 py-3.5 text-left">
                      <Checkbox 
                        checked={selectAll} 
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </th>
                    {/* Restante das colunas */}
                    <SortableContext 
                      items={columnsData.map(col => col.accessorKey)} 
                      strategy={horizontalListSortingStrategy}
                    >
                      {columnsData.map((column) => (
                        <SortableHeader
                          key={column.accessorKey}
                          column={column}
                          sortColumn={sortColumn}
                          sortDirection={sortDirection as 'asc' | 'desc' | null}
                          onSort={handleSort}
                        />
                      ))}
                    </SortableContext>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.isArray(events) && events.map((event: Event, index: number) => (
                    <EventsTableRow 
                      key={`${event.event_id}-${index}`}
                      event={event} 
                      visibleColumns={columnsData.map(col => col.accessorKey as EventColumnId)}
                      isSelected={!!selectedRows[event.event_id]}
                      onSelectChange={toggleRowSelection}
                    />
                  ))}
                  
                  {/* Fill empty rows up to the fixed limit */}
                  {Array.isArray(events) && events.length > 0 && events.length < FIXED_LIMIT && 
                    [...Array(FIXED_LIMIT - events.length)].map((_, index) => (
                      <tr key={`empty-${index}`} className="h-[46px]">
                        <td className="w-10 px-3 py-3.5 border-b"></td>
                        {columnsData.map((col) => (
                          <td key={`empty-${index}-${col.accessorKey}`} className="px-4 py-2 border-b"></td>
                        ))}
                      </tr>
                    ))
                  }
                  
                  {(!events || events.length === 0) && !isLoading && (
                    <tr>
                      <td 
                        colSpan={columnsData.length + 1} 
                        className="px-6 py-4 text-center text-gray-500 text-xs"
                      >
                        Nenhum evento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DndContext>
          )}
        </div>
        {/* Sempre exibir a paginação, mesmo quando não há resultados */}
        <div className="p-2 border-t bg-white">
          <Pagination
            pageIndex={currentPage} 
            totalCount={meta?.total || 0}
            perPage={FIXED_LIMIT} 
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            isLoading={isLoading}
            onRefresh={() => {
              // Show loading state
              document.querySelector('.table-loading-overlay')?.classList.remove('hidden');
              
              // Trigger a refetch without changing the page
              window.dispatchEvent(new CustomEvent('refetch-events'));
            }}
          />
        </div>
      </div>
    </div>
  );

  return tableContent;
} 