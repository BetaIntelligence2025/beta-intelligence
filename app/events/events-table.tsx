import { Event, EventsTableProps } from "@/app/types/events-type"
import { columns as defaultColumns } from "./columns"
import { EventsTableRow } from "./events-table-row"
import { useState } from "react"
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

interface SortableHeaderProps {
  column: Column;       
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  onSort: (columnId: string) => void;
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
      className="px-6 py-3 font-medium text-muted-foreground select-none group"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between cursor-pointer"
        onClick={() => onSort(column.accessorKey)}
      >
        <span>{column.header}</span>
        <div className="flex items-center">
          {isCurrentSortColumn ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100" />
          )}
        </div>
      </div>
    </th>
  );
}

export const EventsTable: React.FC<EventsTableProps> = ({
  result,
  isLoading,
  onSort,
  currentPage,
  totalResults,
  sortColumn,
  sortDirection
}) => {
  const [columns, setColumns] = useState(defaultColumns)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 min-h-[200px] bg-white shadow-md sm:rounded-lg">
        <div className="text-gray-500">Carregando eventos...</div>
      </div>
    )
  }

  const events = result?.events || []

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.accessorKey === active.id);
      const newIndex = columns.findIndex(col => col.accessorKey === over.id);
      setColumns(arrayMove(columns, oldIndex, newIndex));
    }
  }

  const handleSort = (columnId: string) => {
    let newDirection: 'asc' | 'desc' | null;
    
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = null;
      else newDirection = 'asc';
    } else {
      newDirection = 'asc';
    }

    onSort(columnId, newDirection);
  };

  const columnIds = columns.map(col => col.accessorKey as EventColumnId)

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
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
          <tbody>
            {events.map((event: Event) => (
              <EventsTableRow 
                visibleColumns={columnIds}
                key={event.event_id} 
                event={event} 
              />
            ))}
            {events.length === 0 && (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-4 text-center text-gray-500"
                >
                  Nenhum evento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DndContext>
    </div>
  )
} 