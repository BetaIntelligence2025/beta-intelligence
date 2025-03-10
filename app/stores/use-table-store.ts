import { create } from 'zustand'

export type ColumnId = 
  | 'event_id' 
  | 'event_name' 
  | 'event_time' 
  | 'user_id' 
  | 'profession_id' 
  | 'product_id' 
  | 'funnel_id' 
  | 'event_source' 
  | 'event_type'
  | 'created_at'
  | 'updated_at'
  | 'user'
  | 'profession'
  | 'product'
  | 'funnel'
  | 'session'
  | 'fullname'
  | 'email'
  | 'phone'
  | 'profession_name'
  | 'product_name'
  | 'funnel_name'
  | 'funnel_tag'
  | 'initialProfession'
  | 'isClient'
  | 'initialDeviceType'
  | 'initialFunnel'
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_content'
  | 'utm_term'
  | 'initialUtmSource'
  | 'initialUtmMedium'
  | 'initialUtmCampaign'
  | 'initialUtmContent'
  | 'initialUtmTerm'
  | 'country'
  | 'state'
  | 'city'
  | 'actions'
  | 'fbc'
  | 'fbp'
  | 'is_recent'
  | 'initialCountryCode'
  | 'initialStateCode'
  | 'initialCityCode'

interface TableState {
  columnWidths: Record<ColumnId, number>
  isResizing: boolean
  activeResizer: ColumnId | null
  startWidth: number
  visibleColumns: ColumnId[]
  setVisibleColumns: (columns: ColumnId[]) => void
  setColumnWidth: (columnId: ColumnId, width: number) => void
  startResizing: (columnId: ColumnId, width: number) => void
  stopResizing: () => void
  setIsResizing: (isResizing: boolean) => void
}

export const useTableStore = create<TableState>((set) => ({
  columnWidths: {
    event_id: 100,
    event_name: 250,
    event_time: 180,
    user_id: 150,
    profession_id: 150,
    product_id: 150,
    funnel_id: 150,
    event_source: 150,
    event_type: 150,
    created_at: 180,
    updated_at: 180,
    user: 200,
    profession: 150,
    product: 150,
    funnel: 150,
    session: 200,
    fullname: 200,
    email: 250,
    phone: 150,
    profession_name: 200,
    product_name: 200,
    funnel_name: 200,
    funnel_tag: 150,
    initialProfession: 150,
    isClient: 100,
    initialDeviceType: 150,
    initialFunnel: 150,
    utm_source: 150,
    utm_medium: 150,
    utm_campaign: 150,
    utm_content: 150,
    utm_term: 150,
    initialUtmSource: 150,
    initialUtmMedium: 150,
    initialUtmCampaign: 150,
    initialUtmContent: 150,
    initialUtmTerm: 150,
    country: 150,
    state: 150,
    city: 150,
    actions: 100,
    fbc: 150,
    fbp: 150,
    is_recent: 100,
    initialCountryCode: 150,
    initialStateCode: 150,
    initialCityCode: 150
  },
  isResizing: false,
  activeResizer: null,
  startWidth: 0,
  visibleColumns: [],
  setVisibleColumns: (columns) => set({ visibleColumns: columns }),
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