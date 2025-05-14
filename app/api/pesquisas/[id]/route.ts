import { NextRequest, NextResponse } from "next/server";
import { isValidWebinarDate, isValidWebinarTime, validateWebinarCycleConsistency, validateVendasConsistency } from "@/app/lib/webinar-utils";

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

/**
 * Handler para requisições GET - detalhes de uma pesquisa
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Extrair ID da URL com segurança - usando await para acessar params
    const { id } = await context.params;
    
    // Log do ID recebido para debug
    console.log(`ID recebido na rota: "${id}"`);
    
    const { searchParams } = new URL(request.url);
    
    // Construir parâmetros para a API externa
    const apiParams = new URLSearchParams();
    
    // Verificar e validar parâmetros do ciclo de webinar
    const pesquisaInicio = searchParams.get("pesquisa_inicio") || undefined;
    const pesquisaFim = searchParams.get("pesquisa_fim") || undefined;
    const vendaInicio = searchParams.get("venda_inicio") || undefined;
    const vendaFim = searchParams.get("venda_fim") || undefined;
    
    const hasWebinarCycleParams = pesquisaInicio || pesquisaFim || vendaInicio || vendaFim;
    
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
        apiParams.set('venda_inicio', vendaInicio);
        console.log('Filtro simplificado aplicado para detalhes da pesquisa: venda_inicio=', vendaInicio);
      } else {
        // Caso tradicional: todos os parâmetros são fornecidos
        if (pesquisaInicio) apiParams.set('pesquisa_inicio', pesquisaInicio);
        if (pesquisaFim) apiParams.set('pesquisa_fim', pesquisaFim);
        if (vendaInicio) apiParams.set('venda_inicio', vendaInicio);
        if (vendaFim) apiParams.set('venda_fim', vendaFim);
        
        console.log('Parâmetros de ciclo de webinar aplicados para detalhes da pesquisa:', {
          pesquisa_inicio: pesquisaInicio,
          pesquisa_fim: pesquisaFim,
          venda_inicio: vendaInicio,
          venda_fim: vendaFim
        });
      }
    }
    
    // Copiar todos os outros parâmetros de busca para a API externa (que não sejam de ciclo de webinar)
    searchParams.forEach((value, key) => {
      if (value.trim() !== '' && 
          !['pesquisa_inicio', 'pesquisa_fim', 'venda_inicio', 'venda_fim'].includes(key)) {
        apiParams.set(key, value);
      }
    });
    
    // Definir a URL base correta para API
    // Em produção: https://api-bi.cursobeta.com.br (sem /api)
    // Em desenvolvimento: http://localhost:8080
    const apiBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api-bi.cursobeta.com.br'
      : 'http://localhost:8080';
    
    // Determinar o ID correto a ser usado na API
    // Se o ID é numérico, usamos diretamente
    // Se não, tentamos extrair um ID numérico se possível
    let apiSurveyId = id;
    
    // Verificar se o ID é um UUID ou string formatada (ex: profissao_pesquisa_0001)
    if (!/^\d+$/.test(id)) {
      // Extrair número do formato profissao_pesquisa_0001
      const matches = id.match(/(\d+)$/);
      if (matches && matches[1]) {
        apiSurveyId = matches[1];
        console.log(`ID extraído do formato personalizado: ${apiSurveyId}`);
      } else {
        // Se não conseguir extrair um ID numérico, retornar erro apropriado
        return NextResponse.json(
          { error: `ID de pesquisa inválido: ${id}. É necessário fornecer um ID numérico válido.` },
          { status: 400 }
        );
      }
    }
    
    // Seguir o padrão da documentação: /metrics/surveys/:id
    const endpointPath = `/metrics/surveys/${apiSurveyId}`;
    const fullApiUrl = `${apiBaseUrl}${endpointPath}`;
    const apiToken = process.env.API_TOKEN;
    
    // Log completo para depuração
    console.log(`Chamando API para detalhes da pesquisa: ${fullApiUrl}?${apiParams.toString()}`);
    console.log(`Parâmetros enviados: ${JSON.stringify(Object.fromEntries(apiParams.entries()))}`);
    
    // Chamar a API externa
    const response = await fetch(`${fullApiUrl}?${apiParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken ? `Bearer ${apiToken}` : ''
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', { status: response.status, text: errorText });
      
      // Retornar erro apropriado para o cliente
      let errorMessage = `Não foi possível obter detalhes da pesquisa com ID: ${id}`;
      let errorStatus = response.status;
      
      if (response.status === 404) {
        errorMessage = `Pesquisa com ID ${id} (API ID: ${apiSurveyId}) não encontrada na API externa.`;
        console.log(`API retornou 404 para pesquisa com ID: ${apiSurveyId}`);
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          message: `A API externa retornou status ${response.status}`,
          apiId: apiSurveyId
        },
        { status: errorStatus }
      );
    }
    
    // Processar a resposta da API
    const apiData = await response.json();
    console.log(`Resposta recebida para pesquisa ${id} com ${Array.isArray(apiData) ? apiData.length : 0} questões`);
    
    // Verificar se a API retornou dados válidos
    if (Array.isArray(apiData) && apiData.length === 0) {
      // A API retornou uma resposta vazia (array vazio)
      console.log(`API retornou array vazio para ID: ${apiSurveyId}`);
      return NextResponse.json(
        { 
          error: `Não foram encontradas questões para a pesquisa com ID: ${id}`,
          message: "A API retornou um conjunto de dados vazio"
        }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(apiData);
  } catch (error: any) {
    console.error(`Erro ao buscar detalhes da pesquisa:`, error);
    return NextResponse.json(
      { error: "Erro interno ao buscar detalhes da pesquisa: " + error.message },
      { status: 500 }
    );
  }
} 