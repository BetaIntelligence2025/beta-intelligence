import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Modelo básico de pesquisa para o exemplo
interface Pesquisa {
  id: string;
  nome: string;
  profissao: string;
  funil: string;
  taxa_resposta: number;
  conversao_vendas: number;
  created_at: string;
}

// Função handler GET para buscar pesquisas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Verificar se está buscando por ID específico
    const specificId = searchParams.get("id");
    
    // Parâmetros de paginação
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    
    // Parâmetros de ordenação
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    
    // Construir parâmetros para a API externa
    const apiParams = new URLSearchParams();
    apiParams.set('page', page);
    apiParams.set('limit', limit);
    
    // Se estiver buscando por ID específico, adicionar ao parâmetro
    if (specificId) {
      // Usar survey_id conforme documentação
      apiParams.set('survey_id', specificId);
    }
    
    // Adicionar parâmetros de filtro específicos por tipo
    const filterTypes = ['captacao', 'pesquisa', 'vendas'];
    
    // Mapeamento de parâmetros locais para a API externa
    const paramMapping: Record<string, string> = {
      'captacao_from': 'lead_inicio',
      'captacao_to': 'lead_fim',
      'pesquisa_from': 'pesquisa_inicio',
      'pesquisa_to': 'pesquisa_fim',
      'vendas_from': 'venda_inicio',
      'vendas_to': 'venda_fim'
    };
    
    // Adicionar parâmetros de filtro por tipo
    filterTypes.forEach(type => {
      const fromParam = searchParams.get(`${type}_from`);
      const toParam = searchParams.get(`${type}_to`);
      
      // Verificar se o parâmetro existe antes de mapeá-lo
      if (fromParam && fromParam.trim() !== '') {
        const apiParamName = paramMapping[`${type}_from`];
        // Aplicar o parâmetro com o nome correto da API
        apiParams.set(apiParamName, fromParam);
        console.log(`Aplicando filtro ${apiParamName}=${fromParam}`);
      }
      
      if (toParam && toParam.trim() !== '') {
        const apiParamName = paramMapping[`${type}_to`];
        // Aplicar o parâmetro com o nome correto da API
        apiParams.set(apiParamName, toParam);
        console.log(`Aplicando filtro ${apiParamName}=${toParam}`);
      }
    });
    
    // Verificar se há parâmetros legados
    const legacyDateFrom = searchParams.get("from");
    const legacyDateTo = searchParams.get("to");
    
    // Aplicar parâmetros legados se existirem
    if (legacyDateFrom && legacyDateFrom.trim() !== '') {
      apiParams.set('data_inicio', legacyDateFrom);
      console.log(`Aplicando filtro data_inicio=${legacyDateFrom}`);
    }
    
    if (legacyDateTo && legacyDateTo.trim() !== '') {
      apiParams.set('data_fim', legacyDateTo);
      console.log(`Aplicando filtro data_fim=${legacyDateTo}`);
    }
    
    // Parâmetros de filtro adicionais
    const professionId = searchParams.get("profession_id");
    if (professionId) {
      apiParams.set('profissao', professionId);
      console.log(`Aplicando filtro profissao=${professionId}`);
    }
    
    const funnelId = searchParams.get("funnel_id");
    if (funnelId) {
      apiParams.set('funil', funnelId);
      console.log(`Aplicando filtro funil=${funnelId}`);
    }
    
    // Obter a base da URL da API usando a mesma lógica de professions
    // Usar API_URL como fallback se API_BASE_URL não estiver definido
    const apiUrl = process.env.API_URL ? process.env.API_URL.replace(/%$/, '') : 'https://api-bi.cursobeta.com.br';
    
    const apiBaseUrl = process.env.NODE_ENV === 'production'
      ? `${apiUrl}/metrics/surveys`
      : 'http://localhost:8080/metrics/surveys';
    
    const apiToken = process.env.API_TOKEN;
    
    // Chamar a API externa
    console.log(`Chamando API: ${apiBaseUrl}?${apiParams.toString()}`);
    const response = await fetch(`${apiBaseUrl}?${apiParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken ? `Bearer ${apiToken}` : ''
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', { status: response.status, text: errorText });
      throw new Error(`Falha ao buscar pesquisas: ${response.status} ${errorText.substring(0, 100)}`);
    }
    
    // Processar a resposta da API
    const apiData = await response.json();
    console.log(`Resposta recebida com ${apiData.length || 0} resultados`);
    
    // Log detalhado para verificar os IDs recebidos
    if (Array.isArray(apiData) && apiData.length > 0) {
      console.log('Exemplo de pesquisa recebida:', {
        survey_id: apiData[0].survey_id,
        nome: apiData[0].nome_pesquisa
      });
    }
    
    // Transformar dados da API para o formato esperado pelo frontend
    const transformedData = Array.isArray(apiData) ? apiData.map((item: any) => {
      // Usar survey_id da API conforme documentação
      // Priorizar survey_id, mas aceitar pesquisa_id para compatibilidade
      const survey_id = item.survey_id?.toString() || 
                        item.pesquisa_id?.toString();
      
      // Se não tiver ID, use o nome transformado como fallback
      const idFromName = item.nome_pesquisa?.replace(/\s+/g, '_').toLowerCase();
      const finalId = survey_id || idFromName;
      
      if (!finalId) {
        console.warn('Pesquisa sem ID válido e sem nome para gerar ID:', item);
        return null; // Pular apenas itens sem ID E sem nome
      }
      
      return {
        id: finalId, // Usar ID gerado ou original
        survey_id: finalId, // Manter consistente
        nome: item.nome_pesquisa || 'Pesquisa sem nome',
        profissao: item.profissao || '-',
        funil: item.funil || item.funnel_name || '-',
        taxa_resposta: (item.taxa_resposta || 0) * 100, // Converter para percentual
        conversao_vendas: (item.conversao_vendas || 0) * 100, // Converter para percentual
        created_at: item.data_criacao || new Date().toISOString()
      };
    }).filter(Boolean) : []; // Filtrar itens nulos
    
    // Ordenar resultados conforme parâmetros
    transformedData.sort((a: any, b: any) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Aplicar paginação local se necessário
    const startIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const endIndex = startIndex + parseInt(limit, 10);
    const paginatedData = transformedData.slice(startIndex, endIndex);
    
    // Se estiver buscando por ID específico, pode retornar apenas o item encontrado
    if (specificId && transformedData.length > 0) {
      console.log(`Encontrado item com ID específico: ${specificId}`);
    }
    
    // Calcular metadados de paginação
    return NextResponse.json({
      data: paginatedData,
      meta: {
        total: transformedData.length,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        last_page: Math.ceil(transformedData.length / parseInt(limit, 10)),
        profession_id: professionId ? professionId : undefined,
        funnel_id: funnelId ? funnelId : undefined
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar pesquisas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar pesquisas: " + error.message },
      { status: 500 }
    );
  }
} 