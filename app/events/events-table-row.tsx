import { TableCell, TableRow } from "@/components/ui/table"
import { columns as COLUMN_CONFIGS } from "./columns"
import { EventColumnId } from "../stores/use-events-columns-store"
import { Event } from "../types/events-type"
import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"

interface EventsTableRowProps {
  event: Event
  visibleColumns: EventColumnId[]
  isSelected?: boolean
  onSelectChange?: (id: string) => void
}

export function EventsTableRow({ 
  event, 
  visibleColumns,
  isSelected = false,
  onSelectChange
}: EventsTableRowProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({})

  useEffect(() => {
    // Carregar larguras salvas
    try {
      const savedWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}')
      setColumnWidths(savedWidths)
    } catch (e) {
      console.error('Erro ao carregar larguras das colunas:', e)
    }
  }, [])

  const getValue = (key: string) => {
    const keys = key.split('.')
    let value: any = event
    
    for (const k of keys) {
      if (value === null || value === undefined) return '-'
      
      if (k === 'session' && (typeof value[k] === 'string' && value[k].startsWith('{'))) {
        try {
          value = JSON.parse(value[k])
        } catch (e) {
          value = value[k]
        }
        continue
      }
      
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

  const getColumnWidth = (accessorKey: string) => {
    // Primeiro verifica se há uma largura salva
    if (columnWidths[accessorKey]) {
      return columnWidths[accessorKey]
    }
    
    // Caso contrário, usa os valores padrão
    const defaultWidths: Record<string, string> = {
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
      'utmSource': '140px',
      'utmMedium': '140px',
      'utmCampaign': '180px',
      'utmContent': '160px',
      'utmTerm': '140px',
      'pais': '100px',
      'estado': '100px',
      'cidade': '140px',
      'dispositivo': '120px',
      'default': '140px'
    }
    
    return defaultWidths[accessorKey] || defaultWidths['default']
  }

  return (
    <tr className={`hover:bg-gray-50 divide-x divide-gray-200 h-[46px] ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="w-10 px-3 py-3.5 text-left">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onSelectChange?.(event.event_id)}
          aria-label={`Selecionar evento ${event.event_id}`}
        />
      </td>
      {visibleColumns.map((columnId) => {
        const column = COLUMN_CONFIGS.find(c => c.accessorKey === columnId)
        const isPhoneColumn = columnId.toString() === "user.phone"        
        return (
          <td 
            key={`${event.event_id}-${columnId}`}
            className={`px-4 py-2 text-[13px] text-gray-900 ${isPhoneColumn ? 'min-w-[150px]' : ''}`}
            style={{ 
              width: getColumnWidth(columnId),
              maxWidth: getColumnWidth(columnId),
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
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