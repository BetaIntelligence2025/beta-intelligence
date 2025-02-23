import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { ColumnId } from '@/stores/use-columns-store'
import { Resizer } from './resizer'
import { useTableStore } from '@/app/stores/use-table-store'

interface TableCellProps {
  columnId: ColumnId
  user: any
}

export function TableCell({ columnId, user }: TableCellProps) {
  const columnWidths = useTableStore((state) => state.columnWidths)
  const isResizing = useTableStore((state) => state.isResizing)

  const renderContent = () => {
    switch (columnId) {
      case 'fullname':
        return user.fullname || '-'
      case 'phone':
        return user.phone || '-'
      case 'fbc':
        return user.fbc || '-'
      case 'fbp':
        return user.fbp || '-'
      case 'created_at':
        return user.created_at 
          ? format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')
          : '-'
      case 'is_recent':
        return user.is_recent ? 'Sim' : 'Não'
      case 'initialProfession':
        return user.initialProfession || '-'
      case 'initialFunnel':
        return user.initialFunnel || '-'
      case 'initialUtmMedium':
        return user.initialUtmMedium || '-'
      case 'initialUtmSource':
        return user.initialUtmSource || '-'
      case 'initialUtmCampaign':
        return user.initialUtmCampaign || '-'
      case 'initialUtmContent':
        return user.initialUtmContent || '-'
      case 'initialUtmTerm':
        return user.initialUtmTerm || '-'
      case 'actions':
        return (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )
      default:
        return user[columnId] || '-'
    }
  }

  return (
    <td
      style={{
        width: `${columnWidths[columnId]}px`,
        minWidth: `${columnWidths[columnId]}px`,
        maxWidth: `${columnWidths[columnId]}px`,
      }}
      className={`
        px-4 py-2 
        overflow-hidden text-ellipsis whitespace-nowrap 
        border-r border-gray-200
        ${isResizing ? 'select-none' : ''}
      `}
    >
      <div className="flex items-center justify-between relative">
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {renderContent()}
        </div>
        <Resizer columnId={columnId} />
      </div>
    </td>
  )
}