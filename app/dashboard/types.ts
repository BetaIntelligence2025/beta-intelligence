/**
 * Tipo para os dados do dashboard
 */
export interface DashboardDataItem {
  date: string;
  count: number;
  type: string;
}

/**
 * Tipo para o período de tempo
 */
export type TimeFrame = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

/**
 * Tipo para o resultado dos dados do dashboard
 */
export interface DashboardDataResult {
  data: DashboardDataItem[];
  errors?: string;
} 