import { Event } from "../types/events-type"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { capitalize, formatName, formatPhoneNumber } from "@/lib/utils"

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
    header: "Data",
    accessorKey: "event_time",
    cell: ({ row }) => {
      const value = row.getValue("event_time");
      if (!value) return '-';
      
      // Se for uma string
      if (typeof value === 'string') {
        // Remover o ":" desnecessário após o espaço, como em "26/02 :09:58:47"
        if (value.includes(' :')) {
          return value.replace(' :', ' ');
        }
        
        // Remover o ano atual se presente na data
        try {
          const currentYear = new Date().getFullYear().toString();
          const matches = value.match(/(\d{2})\/(\d{2})\/(\d{4})(,?\s+)(.+)/);
          
          if (matches && matches[3] === currentYear) {
            // Se for do ano atual, retorna apenas dia/mês e hora
            return `${matches[1]}/${matches[2]} ${matches[5]}`;
          }
        } catch (e) {
          // Se falhar, retorna o valor original
        }
      }
      
      return value;
    }
  },
  {
    header: "Nome",
    accessorKey: "user.fullname",
    cell: ({ row }) => {
      const fullname = row.getValue("user.fullname")
      return fullname ? formatName(fullname) : "-"
    }
  },
  {
    header: "Email",
    accessorKey: "user.email",
  },
  {
    header: "Telefone",
    accessorKey: "user.phone",
    cell: ({ row }) => {
      const phone = row.getValue("user.phone")
      return formatPhoneNumber(phone)
    }
  },
  {
    header: "Cliente",
    accessorKey: "user.isClient",
    cell: ({ row }) => row.getValue("user.isClient") ? "Sim" : "Não"
  },
  {
    header: "Profissão",
    accessorKey: "profession.profession_name",
    cell: ({ row }) => {
      const profession = row.getValue("profession.profession_name")
      return profession ? formatName(profession) : "-"
    }
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