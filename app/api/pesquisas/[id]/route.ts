import { NextRequest, NextResponse } from "next/server";

/**
 * Handler para requisições GET - detalhes de uma pesquisa
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extrair ID da URL com segurança - usando await para acessar params
    const { id } = await params;
    
    // Log do ID recebido para debug
    console.log(`ID recebido na rota: "${id}"`);
    
    const { searchParams } = new URL(request.url);
    
    // Construir parâmetros para a API externa
    const apiParams = new URLSearchParams();
    
    // Copiar todos os parâmetros de busca para a API externa
    searchParams.forEach((value, key) => {
      if (value.trim() !== '') {
        apiParams.set(key, value);
      }
    });
    
    // Usar API_URL como fallback se API_BASE_URL não estiver definido
    // Remover caractere % que pode estar incorreto no .env
    const apiUrl = process.env.API_URL ? process.env.API_URL.replace(/%$/, '') : 'https://api-bi.cursobeta.com.br';
    
    const apiBaseUrl = process.env.NODE_ENV === 'production'
      ? apiUrl
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