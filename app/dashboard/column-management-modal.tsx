import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings } from "lucide-react"
import { type ColumnId, useColumnsStore } from "@/stores/use-columns-store"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const COLUMN_LABELS: Record<ColumnId, string> = {
  id: "ID",
  name: "Nome",
  phone: "Telefone",
  fbc: "FBC",
  fbp: "FBP",
  createdAt: "Captação em",
  actions: "Ações",
}

export function ColumnManagementModal() {
  const { columns, visibleColumns, toggleColumn } = useColumnsStore()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas</DialogTitle>
          <DialogDescription>Selecione as colunas que deseja exibir na tabela</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {columns.map((columnId) => (
            <div key={columnId} className="flex items-center space-x-2">
              <Checkbox
                id={columnId}
                checked={visibleColumns.includes(columnId)}
                onCheckedChange={() => toggleColumn(columnId)}
              />
              <label
                htmlFor={columnId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {COLUMN_LABELS[columnId]}
              </label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}