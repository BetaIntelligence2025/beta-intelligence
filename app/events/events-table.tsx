'use client'

import { Event } from "@/app/types/events-type"
import { columns as defaultColumns } from "./columns"
import { EventsTableRow } from "./events-table-row"
import { useState, useEffect, useCallback, useMemo } from "react"
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
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Column } from "./columns"
import { EventColumnId } from "../stores/use-events-columns-store"
import { EventsFilters } from "./events-filters"
import { DateRange } from "react-day-picker"
import { format, parse } from "date-fns"
import { debounce } from "lodash"
import { useRouter, useSearchParams } from 'next/navigation'

interface SortableHeaderProps {
  column: Column;       
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
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
  } = useSortable({ id: column.accessorKey });

  const isCurrentSortColumn = sortColumn === column.accessorKey;

  return (
    <th
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="px-4 py-3.5 font-medium text-gray-600 select-none group bg-gray-50"
    >
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-between w-full cursor-pointer text-[13px]"
        onClick={() => onSort(column.accessorKey, isCurrentSortColumn && sortDirection === 'asc' ? 'desc' : 'asc')}
        type="button"
      >
        <span>{column.header}</span>
        <div className="flex items-center">
          {isCurrentSortColumn ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      </button>
    </th>
  );
}

interface EventsTableProps {
  result: {
    events: Event[]
    meta: {
      total: number
      page: number
      limit: number
      last_page: number
      profession_id?: number
      funnel_id?: number
    }
  }
  isLoading: boolean
  onSort: (columnId: string, direction: 'asc' | 'desc') => void
  currentPage: number
  sortColumn?: string | null
  sortDirection?: 'asc' | 'desc' | null
}

export const EventsTable: React.FC<EventsTableProps> = ({
  result,
  isLoading: parentLoading,
  onSort,
  currentPage,
  sortColumn,
  sortDirection
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [columns, setColumns] = useState(defaultColumns)
  const [events, setEvents] = useState<Event[]>(result?.events || [])
  const [meta, setMeta] = useState(result?.meta)
  const [loading, setLoading] = useState(false)

  // Recupera filtros da URL
  const getFiltersFromUrl = useCallback(() => {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const professionId = searchParams.get('professionId')
    const funnelId = searchParams.get('funnelId')
    
    return {
      dateRange: from && to ? {
        from: parse(from, 'yyyy-MM-dd', new Date()),
        to: parse(to, 'yyyy-MM-dd', new Date())
      } : undefined,
      professionId: professionId || undefined,
      funnelId: funnelId || undefined
    }
  }, [searchParams])

  const updateUrl = useCallback((params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newSearchParams.delete(key)
      } else {
        newSearchParams.set(key, value)
      }
    })

    router.push(`/events?${newSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/events?${searchParams.toString()}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      })
      
      if (!response.ok) throw new Error('Erro ao buscar eventos')

      const data = await response.json()
      setEvents(data.events || [])
      setMeta(data.meta)

      // Se a página atual é maior que o total de páginas, volta para a última página
      if (data.meta.page > data.meta.last_page) {
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.set('page', String(data.meta.last_page))
        router.push(`/events?${newParams.toString()}`, { scroll: false })
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [searchParams, router])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleFilterChange = useCallback((filters: { 
    dateRange: DateRange | undefined
    professionId?: string | null 
    funnelId?: string | null
  }) => {
    const params: Record<string, string | null> = {
      page: '1', // Reset para página 1 quando aplicar filtro
      from: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : null,
      to: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : null,
      professionId: filters.professionId || null,
      funnelId: filters.funnelId || null
    }
    
    updateUrl(params)
  }, [updateUrl])

  const handleSort = useCallback((columnId: string) => {
    const newParams = new URLSearchParams(searchParams.toString())
    
    // Se clicar na mesma coluna que já está ordenada
    if (sortColumn === columnId) {
      // Se estava ascendente, muda para descendente
      if (sortDirection === 'asc') {
        newParams.set('sortDirection', 'desc')
        newParams.set('sortBy', columnId)
      } 
      // Se estava descendente, muda para ascendente
      else if (sortDirection === 'desc') {
        newParams.set('sortDirection', 'asc')
        newParams.set('sortBy', columnId)
      }
    } 
    // Se clicar em uma nova coluna, começa com ascendente
    else {
      newParams.set('sortDirection', 'asc')
      newParams.set('sortBy', columnId)
    }

    router.push(`/events?${newParams.toString()}`, { scroll: false })
    onSort(columnId, newParams.get('sortDirection') as 'asc' | 'desc')
  }, [router, searchParams, sortColumn, sortDirection, onSort])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.accessorKey === active.id)
      const newIndex = columns.findIndex(col => col.accessorKey === over.id)
      setColumns(arrayMove(columns, oldIndex, newIndex))
    }
  }, [columns])

  const isLoading = loading || parentLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[200px] bg-white shadow-md sm:rounded-lg">
        <div className="text-gray-500">Carregando eventos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <EventsFilters 
        onFilterChange={handleFilterChange}
        initialFilters={{
          ...getFiltersFromUrl(),
          professionId: meta?.profession_id?.toString(),
          funnelId: meta?.funnel_id?.toString()
        }} 
      />
      <div className="overflow-x-auto border rounded-lg">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <table className="w-full whitespace-nowrap text-[13px]">
            <thead className="bg-gray-50 border-b">
              <tr className="divide-x divide-gray-200">
                <SortableContext 
                  items={columns.map(col => col.accessorKey)} 
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <SortableHeader
                      key={column.accessorKey}
                      column={column}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.isArray(events) && events.map((event: Event) => (
                <EventsTableRow 
                  key={event.event_id}
                  event={event} 
                  visibleColumns={columns.map(col => col.accessorKey as EventColumnId)}
                />
              ))}
              {(!events || events.length === 0) && (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className="px-6 py-4 text-center text-gray-500 text-xs"
                  >
                    Nenhum evento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  )
} 