import { TableCell, TableRow } from "@/components/ui/table"
import { columns as COLUMN_CONFIGS } from "./columns"
import { EventColumnId } from "../stores/use-events-columns-store"
import { Event } from "../types/events-type"

interface EventsTableRowProps {
  event: Event
  visibleColumns: EventColumnId[]
}

export function EventsTableRow({ event, visibleColumns }: EventsTableRowProps) {
  const getValue = (key: string) => {
    // Handle nested properties using dot notation
    const keys = key.split('.')
    let value: any = event
    
    for (const k of keys) {
      if (value === null || value === undefined) return '-'
      value = value[k as keyof typeof value]
    }

    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não'
    }

    if (value === null || value === undefined) {
      return '-'
    }

    if (key === 'event_time') {
      return new Date(value).toLocaleString('pt-BR')
    }

    return value
  }

  return (
    <tr className="hover:bg-gray-50 divide-x divide-gray-200">
      {visibleColumns.map((columnId) => {
        const column = COLUMN_CONFIGS.find(c => c.accessorKey === columnId)
        return (
          <td 
            key={`${event.event_id}-${columnId}`}
            className="px-4 py-3.5 text-[13px] text-gray-900"
          >
            {column?.cell 
              ? column.cell({ row: { getValue } })
              : String(getValue(columnId) ?? '-')}
          </td>
        )
      })}
    </tr>
  )
} 