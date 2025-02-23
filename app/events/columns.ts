import { Event } from "../types/events-type"

export interface Column {
  header: string
  accessorKey: string
  cell?: (props: { row: { getValue: (key: string) => any } }) => React.ReactNode
}

export const columns: Column[] = [
  {
    header: "Nome do Evento",
    accessorKey: "event_name",
  },
  {
    header: "Tipo",
    accessorKey: "event_type",
  },
  {
    header: "Origem",
    accessorKey: "event_source",
  },
  {
    header: "Data",
    accessorKey: "event_time",
  },
  {
    header: "Nome",
    accessorKey: "user.fullname",
  },
  {
    header: "Email",
    accessorKey: "user.email",
  },
  {
    header: "Telefone",
    accessorKey: "user.phone",
  },
  {
    header: "Cliente",
    accessorKey: "user.isClient",
  }
] 