/**
 * Date utility functions for consistent Brasilia (BRT) time handling
 */

// Timezone for Brazil (Brasilia)
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert date to Brasilia time (BRT, UTC-3)
 */
export function toBrazilianTime(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(inputDate.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  // Get the date string in Brazilian timezone
  const brDateString = inputDate.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE });
  
  // Parse it back to a Date object
  return new Date(brDateString);
}

/**
 * Format date to Brazilian format (DD/MM/YYYY HH:MM:SS)
 */
export function formatBrazilianDate(date: Date | string, includeTime = true): string {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(inputDate.getTime())) {
    return '-';
  }
  
  // Format in Brazilian timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }
  
  return inputDate.toLocaleString('pt-BR', options);
}

/**
 * Get current date in Brasilia time, formatted as ISO string with -03:00 timezone
 */
export function getCurrentBrazilianDate(): string {
  const now = new Date();
  const brNow = toBrazilianTime(now);
  
  // Format to YYYY-MM-DDTHH:MM:SS
  const year = brNow.getFullYear();
  const month = String(brNow.getMonth() + 1).padStart(2, '0');
  const day = String(brNow.getDate()).padStart(2, '0');
  const hours = String(brNow.getHours()).padStart(2, '0');
  const minutes = String(brNow.getMinutes()).padStart(2, '0');
  const seconds = String(brNow.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`;
}

/**
 * Get start of day in Brasilia time, formatted as ISO string with -03:00 timezone
 */
export function getBrazilianStartOfDay(date?: Date | string): string {
  const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  const brDate = toBrazilianTime(inputDate);
  
  const year = brDate.getFullYear();
  const month = String(brDate.getMonth() + 1).padStart(2, '0');
  const day = String(brDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T00:00:00-03:00`;
}

/**
 * Get end of day in Brasilia time, formatted as ISO string with -03:00 timezone
 */
export function getBrazilianEndOfDay(date?: Date | string): string {
  const inputDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  const brDate = toBrazilianTime(inputDate);
  
  const year = brDate.getFullYear();
  const month = String(brDate.getMonth() + 1).padStart(2, '0');
  const day = String(brDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}T23:59:59-03:00`;
} 