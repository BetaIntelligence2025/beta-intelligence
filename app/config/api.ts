/**
 * Configuração centralizada para as URLs da API
 */

// URL base da API com base no ambiente
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080'
  : process.env.API_URL || 'http://130.211.239.149';


// URLs específicas para cada endpoint
export const API_ENDPOINTS = {
  EVENTS: `${API_BASE_URL}/events`,
  FUNNELS: `${API_BASE_URL}/funnels`,
  PROFESSIONS: `${API_BASE_URL}/professions`,
  USERS: `${API_BASE_URL}/users`,
  LEAD: `${API_BASE_URL}/lead`,
  CLIENT: `${API_BASE_URL}/client`,
  ANONYMOUS: `${API_BASE_URL}/anonymous`,
  SESSION: `${API_BASE_URL}/session`,
};

/**
 * Função para construir URLs com parâmetros de consulta
 */
export function buildApiUrl(
  endpoint: string, 
  params: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(endpoint);
  
  // Adicionar parâmetros à URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * Função para construir parâmetros de paginação e ordenação
 */
export function buildPaginationParams(
  page?: string | number,
  limit?: string | number,
  sortBy?: string,
  sortDirection?: string,
  allTypes?: string
): Record<string, string | number | undefined> {
  return {
    page: page || 1,
    limit: limit || 10,
    sortBy: sortBy || 'created_at',
    sortDirection: sortDirection || 'desc',
    allTypes
  };
} 