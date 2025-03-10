import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { useTableStore } from '@/app/stores/use-table-store'
import { Resizer } from './resizer'
import type { ColumnId } from '@/app/stores/use-table-store'
import { useMemo } from 'react'
import { User } from '@/types/users-type'

interface TableCellProps {
  columnId: ColumnId
  user: Partial<User>
}

export function TableCell({ columnId, user }: TableCellProps) {
  const { columnWidths } = useTableStore()
  
  const content = useMemo(() => {
    switch (columnId) {
      case 'fullname':
        return user.fullname || '-'
      case 'email':
        return user.email || '-'
      case 'phone':
        return user.phone || '-'
      default:
        const value = user[columnId as keyof User]
        return typeof value === 'object' ? JSON.stringify(value) : String(value || '-')
    }
  }, [columnId, user])

  return (
    <td
      style={{
        width: `${columnWidths[columnId]}px`,
        minWidth: `${columnWidths[columnId]}px`,
        maxWidth: `${columnWidths[columnId]}px`,
      }}
      className="relative px-6 py-4 text-sm text-gray-900 border-r last:border-r-0"
    >
      {content}
      <Resizer columnId={columnId} />
    </td>
  )
}