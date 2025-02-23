import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { COLUMN_CONFIGS, useColumnsStore } from "@/stores/use-columns-store"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ColumnManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ColumnManagementModal({
  open,
  onOpenChange,
}: ColumnManagementModalProps) {
  const { visibleColumns, toggleColumn } = useColumnsStore()

  // Agrupa as colunas por grupo
  const groupedColumns = COLUMN_CONFIGS.reduce((acc, column) => {
    const group = column.group || "Padrão"
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(column)
    return acc
  }, {} as Record<string, typeof COLUMN_CONFIGS>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {Object.entries(groupedColumns).map(([group, columns]) => (
            <div key={group} className="mb-6">
              <h3 className="font-semibold mb-2">{group}</h3>
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.id}
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                      disabled={column.isDefault}
                    />
                    <label
                      htmlFor={column.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}