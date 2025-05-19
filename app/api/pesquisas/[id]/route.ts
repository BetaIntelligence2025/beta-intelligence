import { NextRequest, NextResponse } from "next/server";
import { isValidWebinarDate, isValidWebinarTime, validateWebinarCycleConsistency, validateVendasConsistency, formatISOWithBrazilTimezoneAndCorrectTime } from "@/app/lib/webinar-utils";
import { API_BASE_URL } from '@/app/config/api';

// Função para validar parâmetros do ciclo de webinar
function validateWebinarCycleParams(
  pesquisaInicio?: string,
  pesquisaFim?: string,
  vendaInicio?: string,
  vendaFim?: string
): { isValid: boolean; errorMessage?: string; correctedVendaInicio?: string } {
  // Caso especial: Se apenas venda_inicio for fornecido, aceitamos como filtro simplificado
  if (vendaInicio && !pesquisaInicio && !pesquisaFim && !vendaFim) {
    try {
      console.log(`Validando venda_inicio: ${vendaInicio}`);
      const vendaInicioDate = new Date(vendaInicio);
      
      // Verificar dia da semana (deve ser terça = 2)
      const dayOfWeek = vendaInicioDate.getDay();
      if (dayOfWeek !== 2) {
        console.error(`Data ${vendaInicioDate.toISOString()} não é terça-feira (${dayOfWeek})`);
        // Em vez de retornar erro, vamos corrigir a data para a próxima terça
        while (vendaInicioDate.getDay() !== 2) {
          vendaInicioDate.setDate(vendaInicioDate.getDate() + 1);
        }
        console.log(`Corrigida para próxima terça-feira: ${vendaInicioDate.toISOString()}`);
      }
      
      // Verificar hora (deve ser 20:30)
      const hours = vendaInicioDate.getHours();
      const minutes = vendaInicioDate.getMinutes();
      if (hours !== 20 || minutes !== 30) {
        console.error(`Horário ${hours}:${minutes} não é 20:30`);
        // Corrigir o horário para 20:30 exatamente
        vendaInicioDate.setHours(20, 30, 0, 0);
        console.log(`Corrigido horário para 20:30:00 exatamente: ${vendaInicioDate.toISOString()}`);
      }
      
      return { isValid: true, correctedVendaInicio: formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio') };
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
        console.log('Filtro simplificado aplicado para detalhes da pesquisa: venda_inicio=', vendaInicio);
        
        try {
          // Usar o valor corrigido se disponível, caso contrário, formatar o original
          if (webinarCycleValidation.correctedVendaInicio) {
            console.log('Usando valor corrigido de venda_inicio:', webinarCycleValidation.correctedVendaInicio);
            apiParams.set('venda_inicio', webinarCycleValidation.correctedVendaInicio);
          } else {
            const vendaInicioDate = new Date(vendaInicio);
            // Sempre ajustar o horário para 20:30 conforme exigido pela API
            const formattedVendaInicio = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
            apiParams.set('venda_inicio', formattedVendaInicio);
          }
        } catch (error) {
          console.error('Erro ao processar venda_inicio:', error);
          return NextResponse.json({ error: 'Formato de data inválido para venda_inicio' }, { status: 400 });
        }
      } else {
        if (pesquisaInicio) apiParams.set('pesquisa_inicio', pesquisaInicio);
        if (pesquisaFim) apiParams.set('pesquisa_fim', pesquisaFim);
        
        // Garantir que venda_inicio tem o horário correto
        if (vendaInicio) {
          try {
            // Usar o valor corrigido se disponível
            if (webinarCycleValidation.correctedVendaInicio) {
              console.log('Usando valor corrigido de venda_inicio:', webinarCycleValidation.correctedVendaInicio);
              apiParams.set('venda_inicio', webinarCycleValidation.correctedVendaInicio);
            } else {
              const vendaInicioDate = new Date(vendaInicio);
              const formattedVendaInicio = formatISOWithBrazilTimezoneAndCorrectTime(vendaInicioDate, 'venda_inicio');
              apiParams.set('venda_inicio', formattedVendaInicio);
            }
          } catch (error) {
            console.error('Erro ao processar venda_inicio:', error);
            apiParams.set('venda_inicio', vendaInicio); // Fallback para o valor original se houver erro
          }
        }
        
        if (vendaFim) apiParams.set('venda_fim', vendaFim);
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
    const apiBaseUrl = API_BASE_URL;
    
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
    
    // Adicionar parâmetro para incluir vendas explicitamente
    apiParams.set('include_sales', 'true');
    apiParams.set('include_conversions', 'true');
    
    // Garantir que venda_inicio esteja sempre presente com horário correto
    if (!apiParams.has('venda_inicio') && !hasWebinarCycleParams) {
      // Se não há nenhum filtro de data, usar a data atual formatada corretamente
      const today = new Date();
      const formattedVendaInicio = formatISOWithBrazilTimezoneAndCorrectTime(today, 'venda_inicio');
      apiParams.set('venda_inicio', formattedVendaInicio);
      console.log(`Adicionando venda_inicio padrão: ${formattedVendaInicio}`);
    }
    
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
    
    // Processar e verificar se temos dados de vendas
    let processedData = apiData;
    if (Array.isArray(apiData)) {
      // Verificar se alguma pergunta tem dados de vendas
      const hasSalesData = apiData.some((question: any) => 
        question.vendas_count !== undefined || 
        question.conversion_rate !== undefined || 
        question.vendas_percentage !== undefined
      );
      
      if (!hasSalesData) {
        console.log(`Aviso: Dados de vendas não encontrados na resposta para ID: ${apiSurveyId}`);
      }
      
      // Garantir que todas as questões tenham valores padrão para dados de vendas
      processedData = apiData.map((question: any) => ({
        ...question,
        vendas_count: question.vendas_count !== undefined ? question.vendas_count : 0,
        conversion_rate: question.conversion_rate !== undefined ? question.conversion_rate : 0,
        vendas_percentage: question.vendas_percentage !== undefined ? question.vendas_percentage : 0
      }));
    }
    
    return NextResponse.json(processedData);
  } catch (error: any) {
    console.error(`Erro ao buscar detalhes da pesquisa:`, error);
    return NextResponse.json(
      { error: "Erro interno ao buscar detalhes da pesquisa: " + error.message },
      { status: 500 }
    );
  }
} 