import { Event } from "../types/events-type"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface Column {
  header: string
  accessorKey: string
  cell?: (props: { row: { getValue: (key: string) => any } }) => React.ReactNode
}

export const columns: Column[] = [
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
    cell: ({ row }) => {
      try {
        const value = row.getValue("event_time");
        if (!value) return '-';
        
        if (typeof value === 'string' && value.includes('/')) {
          return value;
        }

        const date = parseISO(value);
        return format(date, 'dd/MM/yyyy, HH:mm:ss', {
          locale: ptBR
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
      }
    }
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
    cell: ({ row }) => row.getValue("user.isClient") ? "Sim" : "Não"
  },
  {
    header: "Profissão",
    accessorKey: "profession.profession_name",
  },
  {
    header: "Produto",
    accessorKey: "product.product_name",
  },
  {
    header: "Funil",
    accessorKey: "funnel.funnel_tag",
  },
  {
    header: "UTM Source",
    accessorKey: "session.utm_source",
  },
  {
    header: "UTM Medium",
    accessorKey: "session.utm_medium",
  },
  {
    header: "UTM Campaign",
    accessorKey: "session.utm_campaign",
  },
  {
    header: "UTM Content",
    accessorKey: "session.utm_content",
  },
  {
    header: "UTM Term",
    accessorKey: "session.utm_term",
  },
  {
    header: "País",
    accessorKey: "session.country",
  },
  {
    header: "Estado",
    accessorKey: "session.state",
  },
  {
    header: "Cidade",
    accessorKey: "session.city",
  },
  {
    header: "Dispositivo",
    accessorKey: "user.initialDeviceType",
  }
] 