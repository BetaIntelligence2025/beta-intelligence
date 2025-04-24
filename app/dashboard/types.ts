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
  isLoading: boolean;
}

/**
 * Interface para os dados de série (atual e anterior)
 */
export interface SeriesData {
  date: string;
  value: number;
}

/**
 * Interface para as séries temporais no dashboard
 */
export interface TimeSeries {
  current: SeriesData[];
  previous?: SeriesData[];
}

/**
 * Interface para o valor de métrica com comparação
 */
export interface MetricWithComparison {
  current: number;
  previous?: number;
  percentage?: number;
  is_increasing?: boolean;
}

/**
 * Interface para o resumo de dados do dashboard
 */
export interface DashboardSummary {
  sessions: number | MetricWithComparison;
  leads: number | MetricWithComparison;
  clients: number | MetricWithComparison;
  conversions: number | MetricWithComparison;
}

/**
 * Interface para a taxa de conversão
 */
export interface ConversionRate {
  current: number;
  previous?: number;
}

/**
 * Interface completa para o estado do dashboard
 */
export interface DashboardState {
  // Dados processados para visualização
  data: DashboardDataItem[];
  
  // Estado de carregamento
  isLoading: boolean;
  
  // Mensagens de erro
  errors?: string;
  error?: string;
  
  // Dados de resumo para cards
  summary?: DashboardSummary;
  
  // Período de tempo selecionado
  timeFrame?: TimeFrame;
  
  // Filtros
  profession_id?: string | null;
  funnel_id?: string | null;
  
  // Metadados
  source?: string;
  period?: any;
  
  // Dados brutos da API
  raw?: {
    sessions_series?: TimeSeries;
    leads_series?: TimeSeries;
    clients_series?: TimeSeries;
    conversion_rate?: ConversionRate;
    hourly_data?: {
      sessions_by_hour?: Record<string, number>;
      leads_by_hour?: Record<string, number>;
      conversion_rate_by_hour?: Record<string, number>;
    };
    period_counts?: Record<string, number>;
    leads_by_day?: Record<string, number>;
    conversion_rate_by_day?: Record<string, number>;
  };
  
  // Filtros adicionais
  filters?: any;
  
  // Métricas de performance da API
  performance?: {
    execution_time_ms?: number;
    [key: string]: any;
  };
} 