import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_ENDPOINTS } from '@/app/config/api';

// Função para buscar dados reais unificados das APIs (leads + faturamento)
async function fetchRealAnalyticsData(params: {
  from?: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) {
  try {
    // Buscar dados de sessões e revenue unificado (leads + faturamento) das APIs
    const sessionParams = new URLSearchParams({
      count_only: 'true', 
      period: 'true',
      landingPage: 'lp.vagasjustica.com.br',
      ...(params.from && { from: params.from }),
      ...(params.to && { to: params.to }),
      ...(params.time_from && { time_from: params.time_from }),
      ...(params.time_to && { time_to: params.time_to }),
      ...(params.profession_id && { profession_id: params.profession_id })
    });

    // Parâmetros para buscar dados unificados de revenue (leads + faturamento)
    const revenueParams = new URLSearchParams({
      ...(params.from && { from: params.from }),
      ...(params.to && { to: params.to }),
      ...(params.profession_id && { profession_id: params.profession_id })
    });

    // Adicionar parâmetro para obter dados do dashboard completo
    const dashboardParams = new URLSearchParams({
      ...(params.from && { from: params.from }),
      ...(params.to && { to: params.to }),
      ...(params.time_from && { time_from: params.time_from }),
      ...(params.time_to && { time_to: params.time_to }),
      ...(params.profession_id && { profession_id: params.profession_id })
    });

    // Usar endpoint específico por profissão se profession_id for fornecido
    const revenueEndpoint = params.profession_id 
      ? API_ENDPOINTS.DASHBOARD_REVENUE_BY_PROFESSION
      : API_ENDPOINTS.DASHBOARD_REVENUE;

    const [sessionsResponse, revenueResponse, dashboardResponse] = await Promise.all([
      fetch(`${API_ENDPOINTS.SESSION}?${sessionParams.toString()}`),
      fetch(`${revenueEndpoint}?${revenueParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      }),
      fetch(`${API_BASE_URL}/dashboard?${dashboardParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      })
    ]);

    let totalLeads = 0;
    let totalSessions = 0;
    let totalRevenue = 0;
    let totalPurchases = 0;
    let dashboardData = null;
    let revenueData = null;

    if (sessionsResponse.ok) {
      const sessionsData = await sessionsResponse.json();
      if (sessionsData.periods) {
        totalSessions = Object.values(sessionsData.periods).reduce((sum: number, count: any) => sum + Number(count), 0);
      } else if (sessionsData.count) {
        totalSessions = Number(sessionsData.count);
      }
    }

    // Processar dados unificados de revenue (leads + faturamento)
    if (revenueResponse.ok) {
      revenueData = await revenueResponse.json();
      
      if (revenueData.success) {
        if (params.profession_id && Array.isArray(revenueData.data)) {
          // Para dados por profissão específica, encontrar a profissão solicitada

          const professionData = revenueData.data.find((item: any) => 
            item.profession_id === params.profession_id || 
            item.profession_id === parseInt(params.profession_id || '0')
          );
          
          if (professionData) {
            totalLeads = Number(professionData.leads?.current || 0);
            totalRevenue = Number(professionData.revenue?.current || 0);
            totalPurchases = Number(professionData.purchases?.current || 0);
            
            // Criar estrutura compatível com dados gerais
            revenueData = {
              success: true,
              data: {
                leads: professionData.leads,
                revenue: professionData.revenue,
                purchases: professionData.purchases,
                hourly_data: professionData.hourly_data
              }
            };
          }
        } else if (revenueData.data && !Array.isArray(revenueData.data)) {
          // Dados gerais (estrutura original)
          totalLeads = Number(revenueData.data.leads?.current || 0);
          totalRevenue = Number(revenueData.data.revenue?.current || 0);
          totalPurchases = Number(revenueData.data.purchases?.current || 0);
        }
      }
    } else {
      console.error('Revenue API Error:', revenueResponse.status, revenueResponse.statusText);
    }

    if (dashboardResponse.ok) {
      dashboardData = await dashboardResponse.json();
    }

    // Calcular métricas baseadas nos dados reais - deixar zerado se não há dados
    const cplPerLead = 0; // Sem dados de investimento, deixar zerado
    const totalInvestment = 0; // Sem dados de investimento, deixar zerado
    const roas = 0; // Sem dados de investimento, deixar zerado

    return {
      totalLeads,
      totalSessions,
      totalInvestment,
      totalRevenue,
      totalPurchases,
      cplPerLead,
      roas,
      dashboardData, // Incluir dados brutos do dashboard para uso no gráfico
      revenueData // Incluir dados estruturados de revenue
    };
  } catch (error) {
    console.error('Erro ao buscar dados reais:', error);
    return null;
  }
}

// Buscar profissões reais da API
async function fetchProfessions() {
  try {
    const response = await fetch(`${API_BASE_URL}/professions`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch professions');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar profissões:', error);
    return [];
  }
}

// Buscar dados diretamente da nova API revenue-by-profession
const fetchRevenueByProfessionData = async (params: {
  from: string;
  to: string;
  profession_id?: string;
}) => {
  try {
    const apiParams = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    
    if (params.profession_id) {
      apiParams.set('profession_ids', params.profession_id);
    }

    const response = await fetch(`${API_ENDPOINTS.DASHBOARD_REVENUE_BY_PROFESSION}?${apiParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Revenue by profession API Error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Erro ao buscar dados de revenue por profissão:', error);
    return null;
  }
};

// Gerar dados históricos para o gráfico usando a nova API revenue-by-profession
const generateChartData = async (params: {
  from: string;
  to: string;
  profession_id?: string;
}) => {
  const fromDate = new Date(params.from);
  const toDate = new Date(params.to);
  const chartData: any[] = [];

  // Verificar se é um único dia
  const isSingleDay = fromDate.toDateString() === toDate.toDateString();

  // Buscar dados da nova API revenue-by-profession
  const revenueData = await fetchRevenueByProfessionData(params);
  
  if (!revenueData?.data || revenueData.data.length === 0) {
    return chartData;
  }

  // Se for profissão específica, usar os dados dessa profissão
  // Se for geral, agregar dados de todas as profissões
  const professionData = params.profession_id 
    ? revenueData.data.find((p: any) => String(p.profession_id) === String(params.profession_id))
    : null;

  if (isSingleDay) {
    // Para um único dia, usar dados por hora se disponíveis
    if (professionData?.hourly_data) {
      const hourlyData = professionData.hourly_data;
      const previousHourlyData = professionData?.previous_period_data?.hourly_data;
      
      // Gerar dados das 0h às 23h
      for (let hour = 0; hour <= 23; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        
        const leads = Number(hourlyData.leads_by_hour?.[hourStr]) || 0;
        const purchases = Number(hourlyData.purchases_by_hour?.[hourStr]) || 0;
        const revenue = Number(hourlyData.revenue_by_hour?.[hourStr]) || 0;
        
        // Dados do período anterior (mesma hora)
        const previousLeads = Number(previousHourlyData?.leads_by_hour?.[hourStr]) || 0;
        const previousPurchases = Number(previousHourlyData?.purchases_by_hour?.[hourStr]) || 0;
        const previousRevenue = Number(previousHourlyData?.revenue_by_hour?.[hourStr]) || 0;
        
        chartData.push({
          date: params.from,
          period: `${hourStr}h`,
          hour: hour,
          leads,
          sessions: 0, // Sessions não estão na nova API
          purchases,
          cpl: 0, // Sem dados de investimento
          investment: 0, // Sem dados de investimento
          revenue: Math.round(revenue * 100) / 100,
          roas: 0, // Sem dados de investimento
          // Dados do período anterior
          previous_leads: previousLeads,
          previous_purchases: previousPurchases,
          previous_revenue: Math.round(previousRevenue * 100) / 100,
          previous_cpl: 0,
          previous_investment: 0,
          previous_roas: 0
        });
      }
    } else if (professionData) {
      // Se não houver dados por hora, usar dados do dia
      chartData.push({
        date: params.from,
        period: `${String(fromDate.getDate()).padStart(2, '0')}/${String(fromDate.getMonth() + 1).padStart(2, '0')}`,
        leads: Number(professionData.leads?.current || 0),
        sessions: 0,
        purchases: Number(professionData.purchases?.current || 0),
        cpl: 0,
        investment: 0,
        revenue: Math.round(Number(professionData.revenue?.current || 0) * 100) / 100,
        roas: 0,
        // Dados do período anterior
        previous_leads: Number(professionData.leads?.previous || 0),
        previous_purchases: Number(professionData.purchases?.previous || 0),
        previous_revenue: Math.round(Number(professionData.revenue?.previous || 0) * 100) / 100,
        previous_cpl: 0,
        previous_investment: 0,
        previous_roas: 0
      });
    } else if (!params.profession_id) {
      // Para dados gerais (todas as profissões), verificar se há dados por hora
      const hasHourlyData = revenueData.data.some((prof: any) => prof.hourly_data);
      
      if (hasHourlyData) {
        // Agregar dados por hora de todas as profissões
        for (let hour = 0; hour <= 23; hour++) {
          const hourStr = hour.toString().padStart(2, '0');
          
          let totalLeads = 0;
          let totalPurchases = 0;
          let totalRevenue = 0;
          let totalPreviousLeads = 0;
          let totalPreviousPurchases = 0;
          let totalPreviousRevenue = 0;

          revenueData.data.forEach((prof: any) => {
            if (prof.hourly_data) {
              totalLeads += Number(prof.hourly_data.leads_by_hour?.[hourStr]) || 0;
              totalPurchases += Number(prof.hourly_data.purchases_by_hour?.[hourStr]) || 0;
              totalRevenue += Number(prof.hourly_data.revenue_by_hour?.[hourStr]) || 0;
              
              // Dados do período anterior
              if (prof.previous_period_data?.hourly_data) {
                totalPreviousLeads += Number(prof.previous_period_data.hourly_data.leads_by_hour?.[hourStr]) || 0;
                totalPreviousPurchases += Number(prof.previous_period_data.hourly_data.purchases_by_hour?.[hourStr]) || 0;
                totalPreviousRevenue += Number(prof.previous_period_data.hourly_data.revenue_by_hour?.[hourStr]) || 0;
              }
            }
          });

          chartData.push({
            date: params.from,
            period: `${hourStr}h`,
            hour: hour,
            leads: totalLeads,
            sessions: 0,
            purchases: totalPurchases,
            cpl: 0,
            investment: 0,
            revenue: Math.round(totalRevenue * 100) / 100,
            roas: 0,
            // Dados do período anterior agregados
            previous_leads: totalPreviousLeads,
            previous_purchases: totalPreviousPurchases,
            previous_revenue: Math.round(totalPreviousRevenue * 100) / 100,
            previous_cpl: 0,
            previous_investment: 0,
            previous_roas: 0
          });
        }
      } else {
        // Se não houver dados por hora, agregar dados totais do dia
        let totalLeads = 0;
        let totalPurchases = 0;
        let totalRevenue = 0;
        let totalPreviousLeads = 0;
        let totalPreviousPurchases = 0;
        let totalPreviousRevenue = 0;

        revenueData.data.forEach((prof: any) => {
          totalLeads += Number(prof.leads?.current || 0);
          totalPurchases += Number(prof.purchases?.current || 0);
          totalRevenue += Number(prof.revenue?.current || 0);
          totalPreviousLeads += Number(prof.leads?.previous || 0);
          totalPreviousPurchases += Number(prof.purchases?.previous || 0);
          totalPreviousRevenue += Number(prof.revenue?.previous || 0);
        });

        chartData.push({
          date: params.from,
          period: `${String(fromDate.getDate()).padStart(2, '0')}/${String(fromDate.getMonth() + 1).padStart(2, '0')}`,
          leads: totalLeads,
          sessions: 0,
          purchases: totalPurchases,
          cpl: 0,
          investment: 0,
          revenue: Math.round(totalRevenue * 100) / 100,
          roas: 0,
          // Dados do período anterior agregados
          previous_leads: totalPreviousLeads,
          previous_purchases: totalPreviousPurchases,
          previous_revenue: Math.round(totalPreviousRevenue * 100) / 100,
          previous_cpl: 0,
          previous_investment: 0,
          previous_roas: 0
        });
      }
    }
  } else {
    // Para múltiplos dias, usar leads_by_day, purchases_by_day, revenue_by_day
    if (professionData) {
      // Dados específicos de uma profissão
      const leadsByDay = professionData.leads_by_day || {};
      const purchasesByDay = professionData.purchases_by_day || {};
      const revenueByDay = professionData.revenue_by_day || {};
      
      // Dados do período anterior
      const previousLeadsByDay = professionData.previous_period_data?.leads_by_day || {};
      const previousPurchasesByDay = professionData.previous_period_data?.purchases_by_day || {};
      const previousRevenueByDay = professionData.previous_period_data?.revenue_by_day || {};

      // Iterar por cada dia do período
      const currentDate = new Date(fromDate);
      let dayIndex = 0;
      while (currentDate <= toDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const leads = Number(leadsByDay[dateStr]) || 0;
        const purchases = Number(purchasesByDay[dateStr]) || 0;
        const revenue = Number(revenueByDay[dateStr]) || 0;

        // Para dados do período anterior, usar índice relativo
        const previousDates = Object.keys(previousLeadsByDay).sort();
        const previousDateStr = previousDates[dayIndex];
        const previousLeads = previousDateStr ? Number(previousLeadsByDay[previousDateStr]) || 0 : 0;
        const previousPurchases = previousDateStr ? Number(previousPurchasesByDay[previousDateStr]) || 0 : 0;
        const previousRevenue = previousDateStr ? Number(previousRevenueByDay[previousDateStr]) || 0 : 0;

        // Só adicionar se houver dados no período atual
        if (leads > 0 || purchases > 0 || revenue > 0) {
          chartData.push({
            date: dateStr,
            period: `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
            leads,
            sessions: 0,
            purchases,
            cpl: 0,
            investment: 0,
            revenue: Math.round(revenue * 100) / 100,
            roas: 0,
            // Dados do período anterior
            previous_leads: previousLeads,
            previous_purchases: previousPurchases,
            previous_revenue: Math.round(previousRevenue * 100) / 100,
            previous_cpl: 0,
            previous_investment: 0,
            previous_roas: 0
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
        dayIndex++;
      }
    } else if (!params.profession_id) {
              // Para dados gerais, agregar todas as profissões por dia
        const currentDate = new Date(fromDate);
        let dayIndex = 0;
        while (currentDate <= toDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          let totalLeads = 0;
          let totalPurchases = 0;
          let totalRevenue = 0;
          let totalPreviousLeads = 0;
          let totalPreviousPurchases = 0;
          let totalPreviousRevenue = 0;

          revenueData.data.forEach((prof: any) => {
            totalLeads += Number(prof.leads_by_day?.[dateStr]) || 0;
            totalPurchases += Number(prof.purchases_by_day?.[dateStr]) || 0;
            totalRevenue += Number(prof.revenue_by_day?.[dateStr]) || 0;

            // Dados do período anterior - usar índice relativo
            const previousLeadsByDay = prof.previous_period_data?.leads_by_day || {};
            const previousPurchasesByDay = prof.previous_period_data?.purchases_by_day || {};
            const previousRevenueByDay = prof.previous_period_data?.revenue_by_day || {};
            
            const previousDates = Object.keys(previousLeadsByDay).sort();
            const previousDateStr = previousDates[dayIndex];
            
            if (previousDateStr) {
              totalPreviousLeads += Number(previousLeadsByDay[previousDateStr]) || 0;
              totalPreviousPurchases += Number(previousPurchasesByDay[previousDateStr]) || 0;
              totalPreviousRevenue += Number(previousRevenueByDay[previousDateStr]) || 0;
            }
          });

          // Só adicionar se houver dados
          if (totalLeads > 0 || totalPurchases > 0 || totalRevenue > 0) {
            chartData.push({
              date: dateStr,
              period: `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
              leads: totalLeads,
              sessions: 0,
              purchases: totalPurchases,
              cpl: 0,
              investment: 0,
              revenue: Math.round(totalRevenue * 100) / 100,
              roas: 0,
              // Dados do período anterior agregados
              previous_leads: totalPreviousLeads,
              previous_purchases: totalPreviousPurchases,
              previous_revenue: Math.round(totalPreviousRevenue * 100) / 100,
              previous_cpl: 0,
              previous_investment: 0,
              previous_roas: 0
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
          dayIndex++;
        }
    }
  }

  return chartData;
};

// Gerar dados de analytics baseados nos dados reais unificados das APIs
const generateAnalyticsData = async (realData: any, params: {
  from: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) => {
  // Buscar profissões reais da API
  const professions = await fetchProfessions();

  // Dados gerais baseados nos dados reais
  const totalLeads = realData.totalLeads;
  const totalPurchases = realData.totalPurchases;
  const cpl = realData.cplPerLead;
  const investment = realData.totalInvestment;
  const revenue = realData.totalRevenue;
  const roas = realData.roas;

  // Usar dados da nova estrutura da API se disponível
  let previousLeads = 0;
  let previousPurchases = 0;
  let previousCPL = 0;
  let previousInvestment = 0;
  let previousRevenue = 0;
  let previousROAS = 0;

  if (realData?.revenueData?.success && realData.revenueData.data) {
    previousLeads = Number(realData.revenueData.data.leads?.previous || 0);
    previousPurchases = Number(realData.revenueData.data.purchases?.previous || 0);
    previousRevenue = Number(realData.revenueData.data.revenue?.previous || 0);
    // CPL, Investment e ROAS continuam zerados
  }

  // Calcular crescimento real usando dados da API
  let leadsGrowth = 0;
  let purchasesGrowth = 0;
  let revenueGrowth = 0;

  if (realData?.revenueData?.success && realData.revenueData.data) {
    leadsGrowth = Number(realData.revenueData.data.leads?.percentage || 0);
    purchasesGrowth = Number(realData.revenueData.data.purchases?.percentage || 0);
    revenueGrowth = Number(realData.revenueData.data.revenue?.percentage || 0);
  }

  const cplGrowth = 0; // Sem dados de investimento
  const investmentGrowth = 0; // Sem dados de investimento
  const roasGrowth = 0; // Sem dados de investimento

  const generalData = {
    overall_leads: {
      current: totalLeads,
      previous: previousLeads,
      percentage: Math.abs(leadsGrowth),
      is_increasing: leadsGrowth >= 0
    },
    overall_purchases: {
      current: totalPurchases,
      previous: previousPurchases,
      percentage: Math.abs(purchasesGrowth),
      is_increasing: purchasesGrowth >= 0
    },
    overall_cpl: {
      current: cpl,
      previous: previousCPL,
      percentage: Math.abs(cplGrowth),
      is_increasing: cplGrowth >= 0
    },
    overall_investment: {
      current: investment,
      previous: previousInvestment,
      percentage: Math.abs(investmentGrowth),
      is_increasing: investmentGrowth >= 0
    },
    overall_revenue: {
      current: revenue,
      previous: previousRevenue,
      percentage: Math.abs(revenueGrowth),
      is_increasing: revenueGrowth >= 0
    },
    overall_roas: {
      current: roas,
      previous: previousROAS,
      percentage: Math.abs(roasGrowth),
      is_increasing: roasGrowth >= 0
    }
  };

  // Dados por profissão baseados na nova estrutura profession_summary
  let professionData: any[] = [];
  
  console.log('Analytics API - Debug profession_summary:', {
    hasRevenueData: !!realData?.revenueData,
    revenueDataSuccess: realData?.revenueData?.success,
    hasProfessionSummary: !!realData?.revenueData?.data?.profession_summary,
    professionSummaryLength: realData?.revenueData?.data?.profession_summary?.length,
    professionSummary: realData?.revenueData?.data?.profession_summary
  });
  
  if (realData?.revenueData?.success && realData.revenueData.data?.profession_summary) {
    professionData = realData.revenueData.data.profession_summary.map((professionSummary: any) => {
      const professionLeads = Number(professionSummary.leads?.current || 0);
      const professionPurchases = Number(professionSummary.purchases?.current || 0);
      const professionRevenue = Number(professionSummary.revenue?.current || 0);
      
      const professionPreviousLeads = Number(professionSummary.leads?.previous || 0);
      const professionPreviousPurchases = Number(professionSummary.purchases?.previous || 0);
      const professionPreviousRevenue = Number(professionSummary.revenue?.previous || 0);
      
      // CPL, Investment e ROAS continuam zerados (sem dados de investimento)
      const professionCPL = 0;
      const professionInvestment = 0;
      const professionROAS = 0;
      const professionPreviousCpl = 0;
      const professionPreviousInvestment = 0;
      const professionPreviousRoas = 0;

      // Usar percentuais da API
      const growthLeads = Number(professionSummary.leads?.percentage || 0);
      const growthRevenue = Number(professionSummary.revenue?.percentage || 0);
      const growthPurchases = Number(professionSummary.purchases?.percentage || 0);

      return {
        profession_id: String(professionSummary.profession_id),
        profession_name: professionSummary.profession_name,
        leads: professionLeads,
        purchases: professionPurchases,
        cpl: professionCPL,
        investment: professionInvestment,
        revenue: professionRevenue,
        roas: professionROAS,
        previous_leads: professionPreviousLeads,
        previous_purchases: professionPreviousPurchases,
        previous_cpl: professionPreviousCpl,
        previous_investment: professionPreviousInvestment,
        previous_revenue: professionPreviousRevenue,
        previous_roas: professionPreviousRoas,
        growth_leads: Math.round(growthLeads * 10) / 10,
        growth_purchases: Math.round(growthPurchases * 10) / 10,
        growth_cpl: 0,
        growth_investment: 0,
        growth_revenue: Math.round(growthRevenue * 10) / 10,
        growth_roas: 0,
        is_increasing_leads: professionSummary.leads?.is_increasing || false,
        is_increasing_purchases: professionSummary.purchases?.is_increasing || false,
        is_increasing_cpl: false,
        is_increasing_investment: false,
        is_increasing_revenue: professionSummary.revenue?.is_increasing || false,
        is_increasing_roas: false,
        is_active: true
      };
    });
  }

  return {
    ...generalData,
    profession_data: professionData
  };
};

// Gerar dados de analytics baseados nos dados da nova API revenue-by-profession
const generateAnalyticsDataFromRevenueAPI = async (revenueData: any, params: {
  from: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) => {
  if (!revenueData?.data || revenueData.data.length === 0) {
    return {
      overall_leads: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      overall_purchases: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      overall_cpl: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      overall_investment: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      overall_revenue: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      overall_roas: { current: 0, previous: 0, percentage: 0, is_increasing: false },
      profession_data: []
    };
  }

  // Agregar dados de todas as profissões para métricas gerais
  let totalLeads = 0;
  let totalPurchases = 0;
  let totalRevenue = 0;
  let totalPreviousLeads = 0;
  let totalPreviousPurchases = 0;
  let totalPreviousRevenue = 0;

  revenueData.data.forEach((profession: any) => {
    totalLeads += Number(profession.leads?.current || 0);
    totalPurchases += Number(profession.purchases?.current || 0);
    totalRevenue += Number(profession.revenue?.current || 0);
    totalPreviousLeads += Number(profession.leads?.previous || 0);
    totalPreviousPurchases += Number(profession.purchases?.previous || 0);
    totalPreviousRevenue += Number(profession.revenue?.previous || 0);
  });

  // Calcular crescimento geral
  const leadsGrowth = totalPreviousLeads > 0 ? ((totalLeads - totalPreviousLeads) / totalPreviousLeads) * 100 : 0;
  const purchasesGrowth = totalPreviousPurchases > 0 ? ((totalPurchases - totalPreviousPurchases) / totalPreviousPurchases) * 100 : 0;
  const revenueGrowth = totalPreviousRevenue > 0 ? ((totalRevenue - totalPreviousRevenue) / totalPreviousRevenue) * 100 : 0;

  const generalData = {
    overall_leads: {
      current: totalLeads,
      previous: totalPreviousLeads,
      percentage: Math.abs(leadsGrowth),
      is_increasing: leadsGrowth >= 0
    },
    overall_purchases: {
      current: totalPurchases,
      previous: totalPreviousPurchases,
      percentage: Math.abs(purchasesGrowth),
      is_increasing: purchasesGrowth >= 0
    },
    overall_cpl: {
      current: 0, // Sem dados de investimento
      previous: 0,
      percentage: 0,
      is_increasing: false
    },
    overall_investment: {
      current: 0, // Sem dados de investimento
      previous: 0,
      percentage: 0,
      is_increasing: false
    },
    overall_revenue: {
      current: totalRevenue,
      previous: totalPreviousRevenue,
      percentage: Math.abs(revenueGrowth),
      is_increasing: revenueGrowth >= 0
    },
    overall_roas: {
      current: 0, // Sem dados de investimento
      previous: 0,
      percentage: 0,
      is_increasing: false
    }
  };

  // Dados por profissão baseados na nova estrutura da API
  const professionData = revenueData.data.map((profession: any) => {
    return {
      profession_id: String(profession.profession_id),
      profession_name: profession.profession_name,
      leads: Number(profession.leads?.current || 0),
      purchases: Number(profession.purchases?.current || 0),
      cpl: 0, // Sem dados de investimento
      investment: 0, // Sem dados de investimento
      revenue: Number(profession.revenue?.current || 0),
      roas: 0, // Sem dados de investimento
      previous_leads: Number(profession.leads?.previous || 0),
      previous_purchases: Number(profession.purchases?.previous || 0),
      previous_cpl: 0,
      previous_investment: 0,
      previous_revenue: Number(profession.revenue?.previous || 0),
      previous_roas: 0,
      growth_leads: Math.round(Number(profession.leads?.percentage || 0) * 10) / 10,
      growth_purchases: Math.round(Number(profession.purchases?.percentage || 0) * 10) / 10,
      growth_cpl: 0,
      growth_investment: 0,
      growth_revenue: Math.round(Number(profession.revenue?.percentage || 0) * 10) / 10,
      growth_roas: 0,
      is_increasing_leads: profession.leads?.is_increasing || false,
      is_increasing_purchases: profession.purchases?.is_increasing || false,
      is_increasing_cpl: false,
      is_increasing_investment: false,
      is_increasing_revenue: profession.revenue?.is_increasing || false,
      is_increasing_roas: false,
      is_active: true
    };
  });

  return {
    ...generalData,
    profession_data: professionData
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extrair parâmetros
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');
    const professionId = searchParams.get('profession_id');
    const chartData = searchParams.get('chart_data');

    // Log dos parâmetros recebidos
    console.log('Analytics API - Parâmetros recebidos:', {
      from,
      to,
      timeFrom,
      timeTo,
      professionId,
      chartData
    });

    // Se foi solicitado dados do gráfico, retornar dados históricos
    if (chartData === 'true') {
      if (!from || !to) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Parâmetros "from" e "to" são obrigatórios para dados do gráfico' 
          },
          { status: 400 }
        );
      }

      const historicalData = await generateChartData({
        from,
        to,
        profession_id: professionId || undefined
      });

      return NextResponse.json({
        success: true,
        chart_data: historicalData,
        metadata: {
          period: { from, to },
          profession_id: professionId,
          data_points: historicalData.length
        }
      });
    }

    // Validar parâmetros obrigatórios
    if (!from) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parâmetro "from" é obrigatório' 
        },
        { status: 400 }
      );
    }

    // Buscar dados da nova API revenue-by-profession para métricas mais precisas
    const revenueData = await fetchRevenueByProfessionData({
      from,
      to: to || from,
      profession_id: professionId || undefined
    });

    // Se não conseguir dados da nova API, tentar a API antiga como fallback
    if (!revenueData?.data || revenueData.data.length === 0) {
      const realData = await fetchRealAnalyticsData({
        from,
        to: to || from,
        time_from: timeFrom || undefined,
        time_to: timeTo || undefined,
        profession_id: professionId || undefined
      });

      if (!realData || (realData.totalLeads === 0 && realData.totalRevenue === 0)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Não foi possível obter dados das APIs',
            data: null
          },
          { status: 503 }
        );
      }

      // Usar dados da API antiga
      const analyticsData = await generateAnalyticsData(realData, {
        from,
        to: to || undefined,
        time_from: timeFrom || undefined,
        time_to: timeTo || undefined,
        profession_id: professionId || undefined
      });

      return NextResponse.json({
        success: true,
        data: analyticsData,
        metadata: {
          period: {
            from,
            to: to || from,
            time_from: timeFrom,
            time_to: timeTo
          },
          source: 'legacy_api'
        }
      });
    }

    // Usar dados da nova API revenue-by-profession
    const analyticsData = await generateAnalyticsDataFromRevenueAPI(revenueData, {
      from,
      to: to || undefined,
      time_from: timeFrom || undefined,
      time_to: timeTo || undefined,
      profession_id: professionId || undefined
    });

    // Se foi solicitada uma profissão específica, filtrar os dados
    if (professionId) {
      const professionData = analyticsData.profession_data.find(
        (p: any) => p.profession_id === professionId
      );

      if (!professionData) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Profissão não encontrada' 
          },
          { status: 404 }
        );
      }

      // Retornar dados filtrados para a profissão específica
      return NextResponse.json({
        success: true,
        data: {
          ...analyticsData,
          profession_data: [professionData]
        },
        metadata: {
          period: {
            from,
            to: to || from,
            time_from: timeFrom,
            time_to: timeTo
          },
          profession_id: professionId,
          profession_name: professionData.profession_name
        }
      });
    }

    // Retornar todos os dados
    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        period: {
          from,
          to: to || from,
          time_from: timeFrom,
          time_to: timeTo
        },
        total_professions: analyticsData.profession_data.length,
        active_professions: analyticsData.profession_data.filter((p: any) => p.is_active).length
      }
    });

  } catch (error) {
    console.error('Erro na API de Analytics:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Método POST para futuras funcionalidades (ex: salvar configurações)
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Método POST não implementado ainda' 
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Erro no POST da API de Analytics:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
} 