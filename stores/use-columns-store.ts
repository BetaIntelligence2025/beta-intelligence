import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ColumnId = 
  // Colunas padrão (sempre visíveis inicialmente)
  | "fullname"
  | "initialProfession"
  | "initialFunnel"
  | "initialUtmMedium"
  | "initialUtmSource"
  | "initialUtmCampaign"
  | "initialUtmContent"
  | "initialUtmTerm"
  | "actions"
  // Colunas opcionais
  | "phone"
  | "fbc"
  | "fbp"
  | "created_at"
  | "is_recent"
  | "initialCountry"
  | "initialCountryCode"
  | "initialRegion"
  | "initialCity"
  | "initialZip"
  | "initialIp"
  | "initialUserAgent"
  | "initialReferrer"
  | "initialTimezone"
  | "user_id"
  | "isIdentified"
  | "initialDeviceType"
  | "initialPlatform"
  | "initialBrowser"
  | "fullInitialReferrer"
  | "initialLandingPage"
  | "initialMarketingChannel"
  | "isClient"

export interface ColumnConfig {
  id: ColumnId
  label: string
  group?: string
  isDefault?: boolean
  width: number
}

export const COLUMN_CONFIGS: ColumnConfig[] = [
  // Colunas padrão
  { id: "fullname", label: "Nome", width: 200, isDefault: true },
  { id: "created_at", label: "Data de Criação", width: 180, isDefault: true },
  { id: "initialProfession", label: "Profissão", width: 200, isDefault: true },
  { id: "initialFunnel", label: "Funil", width: 150, isDefault: true },
  { id: "initialUtmMedium", label: "UTM Medium", width: 150, isDefault: true },
  { id: "initialUtmSource", label: "UTM Source", width: 150, isDefault: true },
  { id: "initialUtmCampaign", label: "UTM Campaign", width: 150, isDefault: true },
  { id: "initialUtmContent", label: "UTM Content", width: 150, isDefault: true },
  { id: "initialUtmTerm", label: "UTM Term", width: 150, isDefault: true },
  { id: "actions", label: "Ações", width: 100, isDefault: true },

  // Colunas opcionais agrupadas
  { id: "phone", label: "Telefone", width: 150, group: "Informações Básicas" },
  { id: "user_id", label: "ID", width: 100, group: "Informações Básicas" },
  { id: "is_recent", label: "Recente", width: 100, group: "Informações Básicas" },
  
  { id: "fbc", label: "FBC", width: 150, group: "Tracking" },
  { id: "fbp", label: "FBP", width: 150, group: "Tracking" },
  
  { id: "initialCountry", label: "País", width: 150, group: "Localização" },
  { id: "initialCountryCode", label: "Código do País", width: 120, group: "Localização" },
  { id: "initialRegion", label: "Região", width: 150, group: "Localização" },
  { id: "initialCity", label: "Cidade", width: 150, group: "Localização" },
  { id: "initialZip", label: "CEP", width: 120, group: "Localização" },
  { id: "initialIp", label: "IP", width: 150, group: "Localização" },
  { id: "initialTimezone", label: "Fuso Horário", width: 150, group: "Localização" },
  
  { id: "initialDeviceType", label: "Tipo de Dispositivo", width: 150, group: "Dispositivo" },
  { id: "initialPlatform", label: "Plataforma", width: 150, group: "Dispositivo" },
  { id: "initialBrowser", label: "Navegador", width: 150, group: "Dispositivo" },
  { id: "initialUserAgent", label: "User Agent", width: 200, group: "Dispositivo" },
  
  { id: "initialReferrer", label: "Referrer", width: 200, group: "Origem" },
  { id: "fullInitialReferrer", label: "Referrer Completo", width: 200, group: "Origem" },
  { id: "initialLandingPage", label: "Página de Entrada", width: 200, group: "Origem" },
  { id: "initialMarketingChannel", label: "Canal de Marketing", width: 200, group: "Origem" },
  
  { id: "isIdentified", label: "Identificado", width: 120, group: "Status" },
  { id: "isClient", label: "Cliente", width: 120, group: "Status" },
]

interface ColumnsState {
  columns: ColumnId[]
  visibleColumns: ColumnId[]
  toggleColumn: (columnId: ColumnId) => void
  setVisibleColumns: (columns: ColumnId[]) => void
}

export const useColumnsStore = create<ColumnsState>()(
  persist(
    (set) => ({
      columns: COLUMN_CONFIGS.map(config => config.id),
      visibleColumns: COLUMN_CONFIGS.filter(config => config.isDefault).map(config => config.id),
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