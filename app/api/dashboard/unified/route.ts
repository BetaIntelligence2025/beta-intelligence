import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/app/config/api';

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

// Usar Edge Runtime para melhor performance
export const runtime = 'edge';

/**
 * Função para encaminhar solicitações para o endpoint unificado da API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log(`[API] Unified dashboard data request received, params:`, Object.fromEntries(searchParams));
    
    // Verificar parâmetros obrigatórios
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    // Se os parâmetros obrigatórios não estiverem presentes, retornar erro
    if (!fromParam || !toParam) {
      console.error(`[API] Missing required parameters: from=${fromParam}, to=${toParam}`);
      return NextResponse.json(
        { error: 'Os parâmetros "from" e "to" são obrigatórios', 
          details: { providedParams: Object.fromEntries(searchParams) } 
        },
        { status: 400 }
      );
    }
    
    // Verificar se os parâmetros estão no formato correto YYYY-MM-DD
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateFormatRegex.test(fromParam) || !dateFormatRegex.test(toParam)) {
      console.error(`[API] Invalid date format: from=${fromParam}, to=${toParam}. Expected format: YYYY-MM-DD`);
      return NextResponse.json(
        { error: 'As datas devem estar no formato YYYY-MM-DD',
          details: { from: fromParam, to: toParam }
        },
        { status: 400 }
      );
    }
    
    // Construir URL da API externa com os mesmos parâmetros
    const externalApiUrl = new URL(`${API_BASE_URL}/dashboard/unified`);
    
    // Garantir que os parâmetros de data estejam no formato correto
    externalApiUrl.searchParams.append('from', fromParam);
    externalApiUrl.searchParams.append('to', toParam);
    
    // Transferir todos os outros parâmetros da requisição para a URL da API externa
    searchParams.forEach((value, key) => {
      if (key !== 'from' && key !== 'to') { // Já adicionamos from e to
        externalApiUrl.searchParams.append(key, value);
      }
    });
    
    console.log(`[API] Forwarding request to: ${externalApiUrl.toString()}`);
    
    // Encaminhar a solicitação para a API externa
    const fetchResponse = await fetch(externalApiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error(`[API] External API error: ${fetchResponse.status}. Response: ${errorText}`);
      return NextResponse.json(
        { error: 'External API error', status: fetchResponse.status, details: errorText },
        { status: fetchResponse.status }
      );
    }
    
    // Obter dados da resposta
    const data = await fetchResponse.json();
    
    // Configurar headers para cache
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300'); // Cache por 5 minutos
    headers.set('X-Source', 'unified-api');
    console.log(`[API] Unified dashboard data received:`, data);
    
    return NextResponse.json(data, { 
      headers,
      status: 200 
    });
  } catch (error) {
    console.error('[API] Error in unified dashboard data proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 