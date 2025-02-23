import { ColumnId } from '@/stores/use-columns-store'
import { create } from 'zustand'

import { persist } from 'zustand/middleware'

interface TableStore {
  columnWidths: Record<ColumnId, number>
  isResizing: boolean
  activeResizer: ColumnId | null
  startWidth: number
  setColumnWidth: (columnId: ColumnId, width: number) => void
  startResizing: (columnId: ColumnId, width: number) => void
  stopResizing: () => void
  setIsResizing: (isResizing: boolean) => void
}

export const useTableStore = create<TableStore>()(
  persist(
    (set) => ({
      columnWidths: {
        id: 100,
        name: 250,
        phone: 180,
        fbc: 150,
        fbp: 150,
        createdAt: 180,
        actions: 100,
      },
      isResizing: false,
      activeResizer: null,
      startWidth: 0,
      setColumnWidth: (columnId, width) =>
        set((state) => ({
          columnWidths: { 
            ...state.columnWidths, 
            [columnId]: Math.max(80, Math.min(500, width)) // Min: 80px, Max: 500px
          },
        })),
      startResizing: (columnId, width) =>
        set(() => ({
          isResizing: true,
          activeResizer: columnId,
          startWidth: width,
        })),
      stopResizing: () =>
        set(() => ({
          isResizing: false,
          activeResizer: null,
          startWidth: 0,
        })),
      setIsResizing: (isResizing) =>
        set(() => ({
          isResizing,
        })),
    }),
    {
      name: 'table-storage',
    }
  )
) 