import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isValidWebinarDate, isValidWebinarTime, validateWebinarCycleConsistency, validateVendasConsistency, formatISOWithBrazilTimezoneAndCorrectTime } from "@/app/lib/webinar-utils";
import { API_BASE_URL } from '@/app/config/api';

// Modelo básico de pesquisa para o exemplo
interface Pesquisa {
  id: string;
  pesquisa_id?: string; // ID original da API
  survey_name: string; // alt_survey_name (era nome)
  profissao: string;
  funil: string; // funnel_name
  taxa_resposta: number; // taxa_resposta_calculada
  conversao_vendas: number; // conversao_vendas_calculada
  created_at: string;
}

// Função para validar parâmetros do ciclo de webinar
function validateWebinarCycleParams(
  pesquisaInicio?: string,
  pesquisaFim?: string,
  vendaInicio?: string,
  vendaFim?: string
): { isValid: boolean; errorMessage?: string } {
  // Caso especial: Se apenas venda_inicio for fornecido, aceitamos como filtro simplificado
  if (vendaInicio && !pesquisaInicio && !pesquisaFim && !vendaFim) {
    try {
      const vendaInicioDate = new Date(vendaInicio);
      // Validar se a data é uma terça-feira às 20:30
      if (!isValidWebinarDate(vendaInicioDate)) {
        return {
          isValid: false,
          errorMessage: "Data de início de vendas inválida. As vendas sempre iniciam às terças-feiras."
        };
      }
      
      if (!isValidWebinarTime(vendaInicioDate, 'venda_inicio')) {
        return {
          isValid: false,
          errorMessage: "Horário de início de vendas inválido. As vendas sempre iniciam às 20:30."
        };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error("Erro ao validar data de início de vendas:", error);
      return {
        isValid: false,
        errorMessage: "Erro ao processar o parâmetro de data de início de vendas."
      };
    }
  }
  
  // Verificar se todos os parâmetros estão presentes quando pelo menos um é fornecido
  const hasAnyParam = pesquisaInicio || pesquisaFim || vendaInicio || vendaFim;
  const hasAllParams = pesquisaInicio && pesquisaFim && vendaInicio && vendaFim;
  
  if (hasAnyParam && !hasAllParams) {
    return {
      isValid: false,
      errorMessage: "Se um parâmetro do ciclo de webinar for fornecido, todos devem ser fornecidos (pesquisa_inicio, pesquisa_fim, venda_inicio, venda_fim)"
    };
  }
  
  if (!hasAnyParam) {
    return { isValid: true }; // Não há parâmetros de ciclo para validar
  }
  
  try {
    // Converter strings para datas
    const pesquisaInicioDate = pesquisaInicio ? new Date(pesquisaInicio) : undefined;
    const pesquisaFimDate = pesquisaFim ? new Date(pesquisaFim) : undefined;
    const vendaInicioDate = vendaInicio ? new Date(vendaInicio) : undefined;
    const vendaFimDate = vendaFim ? new Date(vendaFim) : undefined;
    
    // Validar dias da semana (terça-feira)
    if (pesquisaInicioDate && !isValidWebinarDate(pesquisaInicioDate)) {
      return {
        isValid: false,
        errorMessage: "Data de início de pesquisa inválida. As pesquisas sempre iniciam às terças-feiras às 20:00 do horário de Brasília."
      };
    }
    
    if (pesquisaFimDate && !isValidWebinarDate(pesquisaFimDate)) {
      return {
        isValid: false,
        errorMessage: "Data de fim de pesquisa inválida. As pesquisas sempre terminam às terças-feiras às 20:00 do horário de Brasília."
      };
    }
    
    if (vendaInicioDate && !isValidWebinarDate(vendaInicioDate)) {
      return {
        isValid: false,
        errorMessage: "Data de início de vendas inválida. As vendas sempre iniciam às terças-feiras às 20:30 do horário de Brasília."
      };
    }
    
    if (vendaFimDate && !isValidWebinarDate(vendaFimDate)) {
      return {
        isValid: false,
        errorMessage: "Data de fim de vendas inválida. As vendas sempre terminam às terças-feiras às 23:59:59 do horário de Brasília."
      };
    }
    
    // Validar horários específicos
    if (pesquisaInicioDate && !isValidWebinarTime(pesquisaInicioDate, 'pesquisa_inicio')) {
      return {
        isValid: false,
        errorMessage: "Horário de início de pesquisa inválido. As pesquisas sempre iniciam às 20:00."
      };
    }
    
    if (pesquisaFimDate && !isValidWebinarTime(pesquisaFimDate, 'pesquisa_fim')) {
      return {
        isValid: false,
        errorMessage: "Horário de fim de pesquisa inválido. As pesquisas sempre terminam às 20:00."
      };
    }
    
    if (vendaInicioDate && !isValidWebinarTime(vendaInicioDate, 'venda_inicio')) {
      return {
        isValid: false,
        errorMessage: "Horário de início de vendas inválido. As vendas sempre iniciam às 20:30."
      };
    }
    
    if (vendaFimDate && !isValidWebinarTime(vendaFimDate, 'venda_fim')) {
      return {
        isValid: false,
        errorMessage: "Horário de fim de vendas inválido. As vendas sempre terminam às 23:59:59."
      };
    }
    
    // Validar consistência entre fim da pesquisa e início das vendas (mesmo dia)
    if (pesquisaFimDate && vendaInicioDate && 
        !validateWebinarCycleConsistency(pesquisaFimDate, vendaInicioDate)) {
      return {
        isValid: false,
        errorMessage: "Inconsistência nos filtros de data. O fim da pesquisa e o início das vendas devem ocorrer no mesmo dia (terça-feira)."
      };
    }
    
    // Validar consistência entre início e fim das vendas (mesmo dia)
    if (vendaInicioDate && vendaFimDate && 
        !validateVendasConsistency(vendaInicioDate, vendaFimDate)) {
      return {
        isValid: false,
        errorMessage: "Inconsistência nos filtros de data. O início e fim das vendas devem ocorrer no mesmo dia (terça-feira)."
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error("Erro ao validar datas do ciclo de webinar:", error);
    return {
      isValid: false,
      errorMessage: "Erro ao processar os parâmetros de data do ciclo de webinar."
    };
  }
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
    
    // Verificar e validar parâmetros do ciclo de webinar
    const pesquisaInicio = searchParams.get("pesquisa_inicio") || undefined;
    const pesquisaFim = searchParams.get("pesquisa_fim") || undefined;
    const vendaInicio = searchParams.get("venda_inicio") || undefined;
    const vendaFim = searchParams.get("venda_fim") || undefined;
    
    const hasWebinarCycleParams = pesquisaInicio || pesquisaFim || vendaInicio || vendaFim;
    
    // Validar parâmetros de webinar somente se algum for fornecido
    if (hasWebinarCycleParams) {
      const webinarCycleValidation = validateWebinarCycleParams(
        pesquisaInicio, 
        pesquisaFim, 
        vendaInicio, 
        vendaFim
      );
      
      if (!webinarCycleValidation.isValid) {
        return NextResponse.json(
          { error: webinarCycleValidation.errorMessage },
          { status: 400 }
        );
      }
      
      // Caso especial: Se apenas venda_inicio for fornecido
      if (vendaInicio && !pesquisaInicio && !pesquisaFim && !vendaFim) {
        console.log('Filtro simplificado aplicado: venda_inicio=', vendaInicio);
        
        try {
          const vendaInicioDate = new Date(vendaInicio);
          
          // Sempre ajustar o horário para 20:30 conforme exigido pela API
          const formattedVendaInicio = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
          
          apiParams.set('venda_inicio', formattedVendaInicio);
        } catch (error) {
          console.error('Erro ao processar venda_inicio:', error);
          return NextResponse.json({ error: 'Formato de data inválido para venda_inicio' }, { status: 400 });
        }
      } else {
        // Caso tradicional: todos os parâmetros são fornecidos
        if (pesquisaInicio) apiParams.set('pesquisa_inicio', pesquisaInicio);
        if (pesquisaFim) apiParams.set('pesquisa_fim', pesquisaFim);
        
        // Garantir que venda_inicio tem o horário correto
        if (vendaInicio) {
          try {
            const vendaInicioDate = new Date(vendaInicio);
            const formattedVendaInicio = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
            apiParams.set('venda_inicio', formattedVendaInicio);
          } catch (error) {
            console.error('Erro ao processar venda_inicio:', error);
            apiParams.set('venda_inicio', vendaInicio); // Fallback para o valor original se houver erro
          }
        }
        
        if (vendaFim) apiParams.set('venda_fim', vendaFim);
        
        console.log('Parâmetros de ciclo de webinar aplicados:', {
          pesquisa_inicio: pesquisaInicio,
          pesquisa_fim: pesquisaFim,
          venda_inicio: vendaInicio,
          venda_fim: vendaFim
        });
      }
    } else {
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
    
    // Definir a URL base correta para API
    // Em produção: https://api-bi.cursobeta.com.br/metrics/surveys (sem /api)
    // Em desenvolvimento: http://localhost:8080/metrics/surveys
    const apiBaseUrl = `${API_BASE_URL}/metrics/surveys`;
    
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
        pesquisa_id: apiData[0].survey_id || apiData[0].pesquisa_id,
        nome: apiData[0].survey_name || apiData[0].alt_survey_name || apiData[0].nome_pesquisa,
        campos_disponíveis: Object.keys(apiData[0])
      });
    }
    
    // Transformar dados da API para o formato esperado pelo frontend
    const transformedData = Array.isArray(apiData) ? apiData.map((item: any) => {
      // Usar survey_id da API conforme documentação
      // Priorizar survey_id, mas aceitar pesquisa_id para compatibilidade
      const survey_id = item.survey_id?.toString() || 
                        item.pesquisa_id?.toString();
      
      // Se não tiver ID, use o nome transformado como fallback
      const idFromName = item.alt_survey_name?.replace(/\s+/g, '_').toLowerCase() || 
                         item.nome_pesquisa?.replace(/\s+/g, '_').toLowerCase();
      const finalId = survey_id || idFromName;
      
      if (!finalId) {
        console.warn('Pesquisa sem ID válido e sem nome para gerar ID:', item);
        return null; // Pular apenas itens sem ID E sem nome
      }
      
      return {
        id: finalId, // Usar ID gerado ou original
        pesquisa_id: finalId, // Manter consistente com o novo nome
        survey_name: item.survey_name,
        profissao: item.profissao || '-',
        funil: item.funnel_name || item.funil || '-',
        taxa_resposta: (item.taxa_resposta_calculada || item.taxa_resposta || 0) * 100, // Converter para percentual
        conversao_vendas: (item.conversao_vendas_calculada || item.conversao_vendas || 0) * 100, // Converter para percentual
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