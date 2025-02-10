import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ColumnId = "id" | "name" | "phone" | "fbc" | "fbp" | "createdAt" | "actions"

interface ColumnsState {
  columns: ColumnId[]
  visibleColumns: ColumnId[]
  toggleColumn: (columnId: ColumnId) => void
  setVisibleColumns: (columns: ColumnId[]) => void
}

export const useColumnsStore = create<ColumnsState>()(
  persist(
    (set) => ({
      columns: ["id", "name", "phone", "fbc", "fbp", "createdAt", "actions"],
      visibleColumns: ["id", "name", "phone", "fbc", "fbp", "createdAt", "actions"],
      toggleColumn: (columnId) =>
        set((state) => ({
          visibleColumns: state.visibleColumns.includes(columnId)
            ? state.visibleColumns.filter((col) => col !== columnId)
            : [...state.visibleColumns, columnId],
        })),
      setVisibleColumns: (columns) =>
        set(() => ({
          visibleColumns: columns,
        })),
    }),
    {
      name: "columns-storage",
    },
  ),
)