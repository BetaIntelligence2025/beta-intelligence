import { Event } from "../types/events-type"
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { capitalize, formatName, formatPhoneNumber } from "@/lib/utils"
import * as React from 'react'

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
    cell: ({ row }) => {
      const eventType = row.getValue("event_type");
      const eventProps = row.getValue("event_propeties");
      
      // Check for PURCHASE events (case insensitive)
      if (eventType && typeof eventType === 'string' && 
          eventType.toUpperCase() === "PURCHASE" && 
          eventProps && typeof eventProps === 'object') {
        
        // Safely access product_type
        const productType = eventProps.product_type;
        
        if (productType) {
          // Choose styling based on product type
          let bgColor = '';
          let textColor = '';
          
          switch(productType) {
            case 'main':
              bgColor = 'bg-green-200';
              textColor = 'text-green-800';
              break;
            case 'upsell':
              bgColor = 'bg-blue-200';
              textColor = 'text-blue-800';
              break;
            case 'downsell':
              bgColor = 'bg-amber-200';
              textColor = 'text-amber-800';
              break;
            default:
              bgColor = 'bg-gray-200';
              textColor = 'text-gray-800';
          }
          
          // Use standard React component approach with createElement
          const containerProps = { className: 'flex items-center gap-2' };
          const labelProps = { 
            className: `inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full ${bgColor} ${textColor} whitespace-nowrap shadow-sm`
          };
          
          return React.createElement(
            'div',
            containerProps,
            React.createElement('span', {}, eventType),
            React.createElement('span', labelProps, productType)
          );
        }
      }
      
      // Default return just the event type
      return eventType || "-";
    }
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
    accessorKey: "initialCountry",
    defaultVisible: false,
  },
  {
    header: "Código do País",
    accessorKey: "initialCountryCode",
    defaultVisible: false,
  },
  {
    header: "Estado",
    accessorKey: "initialRegion",
    defaultVisible: false,
  },
  {
    header: "Cidade",
    accessorKey: "initialCity",
    defaultVisible: false,
  },
  {
    header: "CEP",
    accessorKey: "initialZip",
    defaultVisible: false,
  },
  {
    header: "IP",
    accessorKey: "initialIp",
    defaultVisible: false,
  },
  {
    header: "Dispositivo",
    accessorKey: "initialDeviceType",
    defaultVisible: false,
  },
  {
    header: "Duração da Sessão",
    accessorKey: "session.duration",
    cell: ({ row }) => {
      const duration = row.getValue("session.duration");
      return duration !== undefined ? `${duration}s` : "-";
    },
    defaultVisible: false,
  },
  {
    header: "Sessão Ativa",
    accessorKey: "session.isActive",
    cell: ({ row }) => {
      const isActive = row.getValue("session.isActive");
      return isActive === true ? "Sim" : "Não";
    },
    defaultVisible: false,
  },
  {
    header: "Início da Sessão",
    accessorKey: "session.sessionStart",
    cell: ({ row }) => {
      const value = row.getValue("session.sessionStart");
      if (!value) return '-';
      try {
        return format(parseISO(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
      } catch (e) {
        return value;
      }
    },
    defaultVisible: false,
  },
  {
    header: "Última Atividade",
    accessorKey: "session.lastActivity",
    cell: ({ row }) => {
      const value = row.getValue("session.lastActivity");
      if (!value) return '-';
      try {
        return format(parseISO(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
      } catch (e) {
        return value;
      }
    },
    defaultVisible: false,
  },
  {
    header: "Pesquisa",
    accessorKey: "survey_name",
    cell: ({ row }) => {
      const survey = row.getValue("survey_name")
      return survey || "-"
    },
    defaultVisible: false,
  },
  {
    header: "ID da Pesquisa",
    accessorKey: "survey.survey_id",
    defaultVisible: false,
  },
  {
    header: "Faixa",
    accessorKey: "survey_response.faixa",
    cell: ({ row }) => {
      const faixa = row.getValue("survey_response.faixa")
      return faixa || "-"
    },
    defaultVisible: false,
  },
  {
    header: "Pontuação Total",
    accessorKey: "survey_response.total_score",
    cell: ({ row }) => {
      const score = row.getValue("survey_response.total_score")
      return score !== undefined ? score : "-"
    },
    defaultVisible: false,
  },
  {
    header: "Resposta Criada",
    accessorKey: "survey_response.created_at",
    cell: ({ row }) => {
      const value = row.getValue("survey_response.created_at");
      if (!value) return '-';
      try {
        return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
      } catch (e) {
        return value;
      }
    },
    defaultVisible: false,
  },
  {
    header: "Completada",
    accessorKey: "survey_response.completed",
    cell: ({ row }) => {
      const completed = row.getValue("survey_response.completed");
      return completed === true ? "Sim" : "Não";
    },
    defaultVisible: false,
  },
  {
    header: "Pergunta",
    accessorKey: "survey_response.answers[0].question_text",
    defaultVisible: false,
  },
  {
    header: "Resposta",
    accessorKey: "survey_response.answers[0].value",
    defaultVisible: false,
  },
  {
    header: "Pontuação",
    accessorKey: "survey_response.answers[0].score",
    defaultVisible: false,
  },
  {
    header: "Tempo para Responder",
    accessorKey: "survey_response.answers[0].time_to_answer",
    cell: ({ row }) => {
      const time = row.getValue("survey_response.answers[0].time_to_answer");
      return time !== undefined ? `${time}s` : "-";
    },
    defaultVisible: false,
  },
  {
    header: "Alterada",
    accessorKey: "survey_response.answers[0].changed",
    cell: ({ row }) => {
      const changed = row.getValue("survey_response.answers[0].changed");
      return changed === true ? "Sim" : "Não";
    },
    defaultVisible: false,
  },
  {
    header: "Timestamp",
    accessorKey: "survey_response.answers[0].timestamp",
    cell: ({ row }) => {
      const value = row.getValue("survey_response.answers[0].timestamp");
      if (!value) return '-';
      try {
        return format(parseISO(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
      } catch (e) {
        return value;
      }
    },
    defaultVisible: false,
  }
] 