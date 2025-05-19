import { isTuesday, startOfDay, setHours, setMinutes, setSeconds, addDays, format, isValid, getDate, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Validates if a date is a valid webinar cycle date (must be a Tuesday)
 */
export function isValidWebinarDate(date: Date): boolean {
  return isValid(date) && isTuesday(date);
}

/**
 * Validates the specific time for a given webinar phase
 */
export function isValidWebinarTime(
  date: Date, 
  phase: 'pesquisa_inicio' | 'pesquisa_fim' | 'venda_inicio' | 'venda_fim'
): boolean {
  if (!isValid(date)) return false;
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  switch(phase) {
    case 'pesquisa_inicio':
    case 'pesquisa_fim':
      return hours === 20 && minutes === 0 && seconds === 0;
    case 'venda_inicio':
      return hours === 20 && minutes === 30 && seconds === 0;
    case 'venda_fim':
      return hours === 23 && minutes === 59 && seconds === 59;
    default:
      return false;
  }
}

/**
 * Generates a complete webinar cycle date set from a given Tuesday
 */
export function generateWebinarCycleDates(tuesdayDate: Date): {
  pesquisa_inicio: string;
  pesquisa_fim: string;
  venda_inicio: string;
  venda_fim: string;
} {
  if (!isValidWebinarDate(tuesdayDate)) {
    throw new Error("A data base deve ser uma terça-feira");
  }
  
  // Normalizar para o início do dia
  const baseDate = startOfDay(tuesdayDate);
  
  // Configurar as datas específicas com precisão de segundos
  const pesquisaInicio = setSeconds(setMinutes(setHours(baseDate, 20), 0), 0);
  const pesquisaFim = setSeconds(setMinutes(setHours(addDays(baseDate, 7), 20), 0), 0);
  const vendaInicio = setSeconds(setMinutes(setHours(addDays(baseDate, 7), 20), 30), 0);
  const vendaFim = setSeconds(setMinutes(setHours(addDays(baseDate, 7), 23), 59), 59);
  
  // Verificar se todas as datas são terça-feira
  if (!isValidWebinarDate(pesquisaInicio) || 
      !isValidWebinarDate(pesquisaFim) || 
      !isValidWebinarDate(vendaInicio) || 
      !isValidWebinarDate(vendaFim)) {
    console.error('Erro nas datas do ciclo:', {
      pesquisaInicio: pesquisaInicio.toISOString(),
      pesquisaFim: pesquisaFim.toISOString(),
      vendaInicio: vendaInicio.toISOString(),
      vendaFim: vendaFim.toISOString()
    });
    throw new Error("Erro ao gerar as datas do ciclo. Algumas datas não caem em uma terça-feira.");
  }

  // Verificar se vendaInicio e vendaFim estão no mesmo dia
  if (!isSameDay(vendaInicio, vendaFim)) {
    console.error('Erro: vendaInicio e vendaFim devem ser no mesmo dia', {
      vendaInicio: vendaInicio.toISOString(),
      vendaFim: vendaFim.toISOString()
    });
    throw new Error("Erro ao gerar as datas do ciclo. As datas de início e fim de vendas devem ser no mesmo dia.");
  }
  
  // Verificar se o horário específico de cada fase está correto
  if (!isValidWebinarTime(pesquisaInicio, 'pesquisa_inicio') ||
      !isValidWebinarTime(pesquisaFim, 'pesquisa_fim') ||
      !isValidWebinarTime(vendaInicio, 'venda_inicio') ||
      !isValidWebinarTime(vendaFim, 'venda_fim')) {
    console.error('Erro nos horários das fases:', {
      pesquisaInicio: `${pesquisaInicio.getHours()}:${pesquisaInicio.getMinutes()}:${pesquisaInicio.getSeconds()}`,
      pesquisaFim: `${pesquisaFim.getHours()}:${pesquisaFim.getMinutes()}:${pesquisaFim.getSeconds()}`,
      vendaInicio: `${vendaInicio.getHours()}:${vendaInicio.getMinutes()}:${vendaInicio.getSeconds()}`,
      vendaFim: `${vendaFim.getHours()}:${vendaFim.getMinutes()}:${vendaFim.getSeconds()}`
    });
    throw new Error("Erro ao gerar as datas do ciclo. Os horários específicos de cada fase estão incorretos.");
  }
  
  // Formatar para ISO com timezone Brasil (-03:00)
  return {
    pesquisa_inicio: formatISOWithBrazilTimezone(pesquisaInicio),
    pesquisa_fim: formatISOWithBrazilTimezone(pesquisaFim),
    venda_inicio: formatISOWithBrazilTimezone(vendaInicio),
    venda_fim: formatISOWithBrazilTimezone(vendaFim)
  };
}

/**
 * Formats a date as ISO string with Brazil timezone (-03:00)
 */
export function formatISOWithBrazilTimezone(date: Date): string {
  // Garantir que estamos trabalhando com uma cópia da data
  const d = new Date(date);
  
  // Extrair os componentes da data
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  // Extrair os componentes de hora (garantindo valores exatos)
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  // Montar a string ISO8601 com timezone fixo para Brasília (-03:00)
  // Formato: YYYY-MM-DDThh:mm:ss-03:00
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Formats a date as ISO string with Brazil timezone (-03:00) ensuring correct time for webinar phases
 * This is important because the backend requires specific times for each phase
 */
export function formatISOWithBrazilTimezoneAndCorrectTime(date: Date, phase: 'pesquisa_inicio' | 'pesquisa_fim' | 'venda_inicio' | 'venda_fim'): string {
  // Garantir que estamos trabalhando com uma cópia da data
  const d = new Date(date);
  
  // Ajustar o horário de acordo com a fase
  switch(phase) {
    case 'pesquisa_inicio':
    case 'pesquisa_fim':
      d.setHours(20, 0, 0, 0);
      break;
    case 'venda_inicio':
      d.setHours(20, 30, 0, 0);
      break;
    case 'venda_fim':
      d.setHours(23, 59, 59, 999);
      break;
  }
  
  // Extrair os componentes da data
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  // Extrair os componentes de hora já ajustados
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  // Montar a string ISO8601 com timezone fixo para Brasília (-03:00)
  // Formato: YYYY-MM-DDThh:mm:ss-03:00
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Get next Tuesday from the given date
 */
export function getNextTuesday(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  while (!isTuesday(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

/**
 * Format a date for display in the webinar cycle context
 */
export function formatWebinarDateForDisplay(date: Date): string {
  return `${format(date, "dd 'de' MMMM", { locale: ptBR })}`;
}

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    getDate(date1) === getDate(date2) &&
    getMonth(date1) === getMonth(date2) &&
    getYear(date1) === getYear(date2)
  );
}

/**
 * Validates if pesquisa_fim and venda_inicio are on the same day
 */
export function validateWebinarCycleConsistency(
  pesquisaFim: Date | string | undefined, 
  vendaInicio: Date | string | undefined
): boolean {
  if (!pesquisaFim || !vendaInicio) return true;
  
  const pesquisaFimDate = typeof pesquisaFim === 'string' ? new Date(pesquisaFim) : pesquisaFim;
  const vendaInicioDate = typeof vendaInicio === 'string' ? new Date(vendaInicio) : vendaInicio;
  
  return isSameDay(pesquisaFimDate, vendaInicioDate);
}

/**
 * Validates if venda_inicio and venda_fim are on the same day
 */
export function validateVendasConsistency(
  vendaInicio: Date | string | undefined, 
  vendaFim: Date | string | undefined
): boolean {
  if (!vendaInicio || !vendaFim) return true;
  
  const vendaInicioDate = typeof vendaInicio === 'string' ? new Date(vendaInicio) : vendaInicio;
  const vendaFimDate = typeof vendaFim === 'string' ? new Date(vendaFim) : vendaFim;
  
  return isSameDay(vendaInicioDate, vendaFimDate);
} 