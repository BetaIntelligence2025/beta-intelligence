import { ArrowRight, EllipsisVertical, MoreHorizontal } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { User } from '@/types/users-type'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ColumnId } from '@/stores/use-columns-store'

interface DashboardTableRow {
  user: Partial<User>
  visibleColumns: ColumnId[]
}

export function DashboardTableRow({
  user,
  visibleColumns
}: DashboardTableRow) {
  return (
    <TableRow>
    {visibleColumns.map((columnId) => (
      <TableCell key={columnId}>
        {columnId === "id" && user.userId}
        {columnId === "name" && user.fullName}
        {columnId === "phone" && user.phone}
        {columnId === "fbc" && user.fbc}
        {columnId === "fbp" && user.fbp}
        {columnId === "createdAt" && user.createdAt && format(new Date(user.createdAt), 'dd MMM, yyyy')}
        {columnId === "actions" && (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    ))}
  </TableRow>
  )
}
