import { create } from 'zustand'

type ColumnId = 'name' | 'phone' | 'fbc' | 'fbp' | 'email' | 'status' | 'created_at' | 'updated_at'

interface TableState {
  columnWidths: Record<ColumnId, number>
  isResizing: boolean
  activeResizer: ColumnId | null
  startWidth: number
  setColumnWidth: (columnId: ColumnId, width: number) => void
  startResizing: (columnId: ColumnId, width: number) => void
  stopResizing: () => void
  setIsResizing: (isResizing: boolean) => void
}

export const useTableStore = create<TableState>((set) => ({
  columnWidths: {
    name: 250,
    phone: 180,
    fbc: 150,
    fbp: 150,
    email: 250,
    status: 120,
    created_at: 180,
    updated_at: 180
  },
  isResizing: false,
  activeResizer: null,
  startWidth: 0,
  setColumnWidth: (columnId: ColumnId, width: number) =>
    set((state) => ({
      columnWidths: {
        ...state.columnWidths,
        [columnId]: width,
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
})) 