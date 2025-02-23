import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table"

export const DashboardTableSkeleton = () => {
  return (
    <Table>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            {[...Array(7)].map((_, j) => (
              <TableCell key={j}>
                <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}