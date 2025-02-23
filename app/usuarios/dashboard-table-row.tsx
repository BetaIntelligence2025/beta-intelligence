import { TableCell } from '@/components/table-cell'
import { ColumnId } from '@/stores/use-columns-store'
import { User } from '@/types/users-type'
import { Checkbox } from '@/components/ui/checkbox'

interface DashboardTableRowProps {
  user: Partial<User>
  visibleColumns: ColumnId[]
  isSelected: boolean
  onSelectRow: (userId: string, isSelected: boolean) => void
}

export function DashboardTableRow({
  user,
  visibleColumns,
  isSelected,
  onSelectRow
}: DashboardTableRowProps) {
  return (
    <tr className={isSelected ? 'bg-muted/50' : ''}>
      <td className="w-[40px] px-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked: boolean) => {
            onSelectRow(user.userId!, checked)
          }}
          aria-label="Select row"
        />
      </td>
      {visibleColumns.map((columnId) => (
        <TableCell
          key={columnId}
          columnId={columnId}
          user={user}
        />
      ))}
    </tr>
  )
}
