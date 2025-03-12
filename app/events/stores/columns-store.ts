import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { columns } from '../columns'

interface ColumnsStore {
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void
  resetToDefault: () => void
}

// Cria uma lista padrão de colunas visíveis a partir da definição de colunas
const defaultVisibleColumns = columns
  .filter(column => column.defaultVisible !== false)
  .map(column => column.accessorKey)

export const useColumnsStore = create<ColumnsStore>()(
  persist(
    (set) => ({
      visibleColumns: defaultVisibleColumns,
      setVisibleColumns: (columns: string[]) => set({ visibleColumns: columns }),
      resetToDefault: () => set({ visibleColumns: defaultVisibleColumns })
    }),
    {
      name: 'events-columns-storage',
    }
  )
) 