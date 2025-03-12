import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from 'react'
import { columns } from './columns'
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { 
  DndContext, 
  KeyboardSensor, 
  PointerSensor, 
  closestCenter, 
  useSensor, 
  useSensors 
} from "@dnd-kit/core"
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, RotateCcw } from "lucide-react"
import { useColumnsStore } from "./stores/columns-store"

interface ColumnManagementModalProps {
  isOpen: boolean
  onClose: () => void
  visibleColumns: string[]
  onColumnChange: (columns: string[]) => void
}

interface SortableItemProps {
  id: string
  label: string
  isActive: boolean
  onToggle: () => void
}

function SortableItem({ id, label, isActive, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border rounded-md mb-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>
        <span className="text-sm">{label}</span>
      </div>
      <Switch checked={isActive} onCheckedChange={onToggle} />
    </div>
  );
}

export function ColumnManagementModal({ 
  isOpen, 
  onClose, 
  visibleColumns, 
  onColumnChange 
}: ColumnManagementModalProps) {
  const { setVisibleColumns, resetToDefault } = useColumnsStore()
  const [availableColumns, setAvailableColumns] = useState<Array<{id: string, header: string, isVisible: boolean}>>([])
  const [pendingChanges, setPendingChanges] = useState<string[] | null>(null)
  
  // Inicializa colunas
  useEffect(() => {
    const columnsList = columns.map(col => ({
      id: col.accessorKey,
      header: col.header,
      isVisible: visibleColumns.includes(col.accessorKey)
    }))
    
    // Ordena as colunas - visíveis primeiro na ordem atual, não-visíveis depois
    const sortedColumns = [...columnsList].sort((a, b) => {
      if (a.isVisible && b.isVisible) {
        return visibleColumns.indexOf(a.id) - visibleColumns.indexOf(b.id)
      }
      if (a.isVisible) return -1
      if (b.isVisible) return 1
      return columnsList.findIndex(c => c.id === a.id) - 
             columnsList.findIndex(c => c.id === b.id)
    })
    
    setAvailableColumns(sortedColumns)
    setPendingChanges(null) // Reset pendingChanges quando visibleColumns mudar
  }, [visibleColumns])
  
  // Aplica alterações pendentes
  useEffect(() => {
    if (pendingChanges) {
      setVisibleColumns(pendingChanges) // Salva no Zustand
      onColumnChange(pendingChanges) // Notifica componente pai
      setPendingChanges(null)
    }
  }, [pendingChanges, onColumnChange, setVisibleColumns])
  
  // Toggle de coluna
  const handleToggleColumn = (id: string) => {
    setAvailableColumns(cols => {
      const newCols = cols.map(col => 
        col.id === id ? { ...col, isVisible: !col.isVisible } : col
      )
      
      // Marca mudanças como pendentes
      const newVisibleColumns = newCols
        .filter(col => col.isVisible)
        .map(col => col.id)
      
      setPendingChanges(newVisibleColumns)
      return newCols
    })
  }

  // Aplica as alterações após reordenação
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setAvailableColumns((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Usa a mesma abordagem de mudanças pendentes
        const newVisibleColumns = newItems
          .filter(col => col.isVisible)
          .map(col => col.id)
        
        setPendingChanges(newVisibleColumns)
        return newItems
      })
    }
  }

  const handleResetToDefault = () => {
    resetToDefault()
    onClose()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={availableColumns.map(col => col.id)}
              strategy={verticalListSortingStrategy}
            >
              {availableColumns.map((column) => (
                <SortableItem 
                  key={column.id}
                  id={column.id}
                  label={column.header}
                  isActive={column.isVisible}
                  onToggle={() => handleToggleColumn(column.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleResetToDefault}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrão
          </Button>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}