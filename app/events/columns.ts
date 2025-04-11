import { Event } from "../types/events-type"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { capitalize, formatName, formatPhoneNumber } from "@/lib/utils"

export interface Column {
  header: string
  accessorKey: string
  cell?: (props: { row: { getValue: (key: string) => any } }) => React.ReactNode
  defaultVisible?: boolean
}

export const columns: Column[] = [
  {
    header: "Evento",
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
    cell: ({ row }) => {
      const isClient = row.getValue("user.isClient")
      if (isClient === true) {
        return "Sim"
      } else {
        return "Não"
      }
    }
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
    accessorKey: "utmSource",
    defaultVisible: false,
  },
  {
    header: "UTM Medium",
    accessorKey: "utmMedium",
    defaultVisible: false,
  },
  {
    header: "UTM Campaign",
    accessorKey: "utmCampaign",
    defaultVisible: false,
  },
  {
    header: "UTM Content",
    accessorKey: "utmContent",
    defaultVisible: false,
  },
  {
    header: "UTM Term",
    accessorKey: "utmTerm",
    defaultVisible: false,
  },
  {
    header: "País",
    accessorKey: "user.initialCountry",
    defaultVisible: false,
  },
  {
    header: "Estado",
    accessorKey: "user.initialRegion",
    defaultVisible: false,
  },
  {
    header: "Cidade",
    accessorKey: "user.initialCity",
    defaultVisible: false,
  },
  {
    header: "Dispositivo",
    accessorKey: "user.initialDeviceType",
    defaultVisible: false,
  }
] 