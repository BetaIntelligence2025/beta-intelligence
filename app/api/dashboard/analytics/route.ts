import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_ENDPOINTS } from '@/app/config/api';

// Função para buscar dados da nova API com dados da Meta
async function fetchRevenueWithMetaData(params: {
  from?: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) {
  try {
    // Parâmetros para buscar dados de revenue com Meta
    const revenueParams = new URLSearchParams({
      ...(params.from && { from: params.from }),
      ...(params.to && { to: params.to }),
      ...(params.profession_id && { profession_ids: params.profession_id })
    });

    const revenueResponse = await fetch(`${API_ENDPOINTS.DASHBOARD_REVENUE}?${revenueParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!revenueResponse.ok) {
      console.error('Revenue API Error:', revenueResponse.status, revenueResponse.statusText);
      return null;
    }

    const revenueData = await revenueResponse.json();
    
    if (!revenueData.success) {
      console.error('Revenue API returned success: false');
      return null;
    }
    


    // Extrair dados da nova estrutura com current_period e previous_period
    const consolidatedMetrics = revenueData.data?.consolidated_metrics;
    const metaSection = revenueData.data?.meta;
    const currentMeta = metaSection?.current_period;
    const previousMeta = metaSection?.previous_period;
    const metaComparison = metaSection?.comparison;
    const revenueDataInternal = revenueData.data?.revenue;
    
    // Verificar se há dados da Meta
    const hasMetaData = !!currentMeta && (
      currentMeta.total_investment > 0 || 
      currentMeta.total_leads > 0 || 
      currentMeta.total_purchases > 0 ||
      currentMeta.total_revenue > 0
    );

    // Dados básicos sempre vindos do revenue interno (mais confiáveis)
    const basicLeads = Number(revenueDataInternal?.leads?.current || 0);
    const basicRevenue = Number(revenueDataInternal?.revenue?.current || 0);
    const basicPurchases = Number(revenueDataInternal?.purchases?.current || 0);
    
    const basicPreviousLeads = Number(revenueDataInternal?.leads?.previous || 0);
    const basicPreviousRevenue = Number(revenueDataInternal?.revenue?.previous || 0);
    const basicPreviousPurchases = Number(revenueDataInternal?.purchases?.previous || 0);

    if (hasMetaData) {
      // Dados da Meta do current_period (todos os campos disponíveis)
      const totalInvestment = Number(currentMeta.total_investment || 0);
      const metaTotalRevenue = Number(currentMeta.total_revenue || 0);
      const metaTotalLeads = Number(currentMeta.total_leads || 0);
      const metaTotalPurchases = Number(currentMeta.total_purchases || 0);
      const roas = Number(currentMeta.roas || 0);
      const roi = Number(currentMeta.roi || 0);
      const connectRate = Number(currentMeta.connect_rate || 0);
      const costPerLead = Number(currentMeta.cost_per_lead || 0);
      const costPerPurchase = Number(currentMeta.cost_per_purchase || 0);
      
      // Somar impressões, clicks de todas as contas para obter totais
      const accountBreakdown = currentMeta.account_breakdown || [];
      const totalImpressions = accountBreakdown.reduce((sum: number, account: any) => sum + Number(account.impressions || 0), 0);
      const totalClicks = accountBreakdown.reduce((sum: number, account: any) => sum + Number(account.clicks || 0), 0);
      const totalSpend = accountBreakdown.reduce((sum: number, account: any) => sum + Number(account.spend || 0), 0);
      
      // Calcular CTR e CPC dos totais
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      
      // Priorizar dados internos quando disponíveis, usar Meta como fallback
      const finalLeads = basicLeads > 0 ? basicLeads : metaTotalLeads;
      const finalRevenue = basicRevenue > 0 ? basicRevenue : metaTotalRevenue;
      const finalPurchases = basicPurchases > 0 ? basicPurchases : metaTotalPurchases;
      
      // CPL baseado no investment da Meta e leads finais
      const cplPerLead = finalLeads > 0 ? totalInvestment / finalLeads : costPerLead;

      return {
        // Dados básicos do período atual (Meta + dados internos)
        totalLeads: finalLeads,
        totalSessions: 0, // Sessions não estão na API
        totalRevenue: finalRevenue,
        totalPurchases: finalPurchases,
        totalInvestment,
        cplPerLead,
        roas,
        
        previousLeads: basicPreviousLeads,
        previousRevenue: basicPreviousRevenue,
        previousPurchases: basicPreviousPurchases,
        previousInvestment: Number(previousMeta?.total_investment || 0),
        previousCPL: Number(previousMeta?.cost_per_lead || 0),
        previousROAS: Number(previousMeta?.roas || 0),
        previousROI: Number(previousMeta?.roi || 0),
        previousConnectRate: Number(previousMeta?.connect_rate || 0),
        // Calcular métricas do período anterior da Meta
        previousCTR: (() => {
          const prevAccounts = previousMeta?.account_breakdown || [];
          const prevImpressions = prevAccounts.reduce((sum: number, account: any) => sum + Number(account.impressions || 0), 0);
          const prevClicks = prevAccounts.reduce((sum: number, account: any) => sum + Number(account.clicks || 0), 0);
          return prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
        })(),
        previousCPC: (() => {
          const prevAccounts = previousMeta?.account_breakdown || [];
          const prevSpend = prevAccounts.reduce((sum: number, account: any) => sum + Number(account.spend || 0), 0);
          const prevClicks = prevAccounts.reduce((sum: number, account: any) => sum + Number(account.clicks || 0), 0);
          return prevClicks > 0 ? prevSpend / prevClicks : 0;
        })(),
        previousSpend: (() => {
          const prevAccounts = previousMeta?.account_breakdown || [];
          return prevAccounts.reduce((sum: number, account: any) => sum + Number(account.spend || 0), 0);
        })(),
        previousImpressions: (() => {
          const prevAccounts = previousMeta?.account_breakdown || [];
          return prevAccounts.reduce((sum: number, account: any) => sum + Number(account.impressions || 0), 0);
        })(),
        previousClicks: (() => {
          const prevAccounts = previousMeta?.account_breakdown || [];
          return prevAccounts.reduce((sum: number, account: any) => sum + Number(account.clicks || 0), 0);
        })(),
        previousCostPerPurchase: Number(previousMeta?.cost_per_purchase || 0),
        
        // Métricas adicionais da Meta
        connectRate,
        roi,
        costPerLead,
        costPerPurchase,
        totalSpend,
        totalImpressions,
        totalClicks,
        ctr,
        cpc,
        
        // Comparações consolidadas (usando nova estrutura de comparison)
        comparison: {
          investment_comparison: metaComparison?.spend_change ? {
            percentage: Number(metaComparison.spend_change || 0),
            is_increasing: (metaComparison.spend_change || 0) >= 0
          } : consolidatedMetrics?.investment_comparison,
          roas_comparison: metaComparison?.roas_change ? {
            percentage: Number(metaComparison.roas_change || 0),
            is_increasing: (metaComparison.roas_change || 0) >= 0
          } : consolidatedMetrics?.roas_comparison,
          roi_comparison: consolidatedMetrics?.roi_comparison,
          connect_rate_comparison: metaComparison?.connect_rate_change ? {
            percentage: Number(metaComparison.connect_rate_change || 0),
            is_increasing: (metaComparison.connect_rate_change || 0) >= 0
          } : null,
          leads_change: revenueDataInternal?.leads ? {
            percentage: Number(revenueDataInternal.leads.percentage || 0),
            is_increasing: revenueDataInternal.leads.is_increasing || false
          } : null,
          revenue_change: revenueDataInternal?.revenue ? {
            percentage: Number(revenueDataInternal.revenue.percentage || 0),
            is_increasing: revenueDataInternal.revenue.is_increasing || false
          } : null,
          purchases_change: revenueDataInternal?.purchases ? {
            percentage: Number(revenueDataInternal.purchases.percentage || 0),
            is_increasing: revenueDataInternal.purchases.is_increasing || false
          } : null
        },
        
        // Dados completos da resposta da API
        fullData: revenueData.data,
        metaData: currentMeta,
        revenueDataInternal,
        
        // Flag para indicar que dados da Meta estão disponíveis
        hasMetaData: true,
        
        // Dados consolidados básicos
        consolidatedMetrics: consolidatedMetrics,
        
        // Dados por profissão se disponível
        professionData: revenueDataInternal?.profession_summary || []
      };
    } else {
      // Usar apenas dados internos sem Meta
      return {
        // Dados básicos do período atual (apenas dados internos)
        totalLeads: basicLeads,
        totalSessions: 0,
        totalRevenue: basicRevenue,
        totalPurchases: basicPurchases,
        totalInvestment: 0, // Sem dados da Meta
        cplPerLead: 0, // Sem dados da Meta
        roas: 0, // Sem dados da Meta
        
        // Dados do período anterior
        previousLeads: basicPreviousLeads,
        previousRevenue: basicPreviousRevenue,
        previousPurchases: basicPreviousPurchases,
        previousInvestment: 0,
        previousCPL: 0,
        previousROAS: 0,
        
        // Comparações e dados de crescimento (se disponível)
        comparison: consolidatedMetrics?.comparison || {
          leads_change: revenueDataInternal?.leads ? {
            percentage: Number(revenueDataInternal.leads.percentage || 0),
            is_increasing: revenueDataInternal.leads.is_increasing || false
          } : null,
          revenue_change: revenueDataInternal?.revenue ? {
            percentage: Number(revenueDataInternal.revenue.percentage || 0),
            is_increasing: revenueDataInternal.revenue.is_increasing || false
          } : null,
          purchases_change: revenueDataInternal?.purchases ? {
            percentage: Number(revenueDataInternal.purchases.percentage || 0),
            is_increasing: revenueDataInternal.purchases.is_increasing || false
          } : null
        },
        
        // Dados completos da resposta da API
        fullData: revenueData.data,
        metaData: null,
        revenueDataInternal,
        
        // Flag para indicar que dados da Meta não estão disponíveis
        hasMetaData: false,
        
        // Dados consolidados básicos
        consolidatedMetrics: consolidatedMetrics,
        
        // Dados por profissão se disponível
        professionData: revenueDataInternal?.profession_summary || []
      };
    }
  } catch (error) {
    console.error('Erro ao buscar dados da nova API com Meta:', error);
    return null;
  }
}

// Função para buscar dados da API (com ou sem Meta)
async function fetchRealAnalyticsData(params: {
  from?: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) {
  try {
    // Buscar dados da nova API
    const metaData = await fetchRevenueWithMetaData(params);
    
    if (!metaData) {
      throw new Error('Não foi possível obter dados da API');
    }

    return metaData;
  } catch (error) {
    console.error('Erro ao buscar dados da API:', error);
    throw error;
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



// Gerar dados históricos para o gráfico usando a API revenue
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

  // Buscar dados da API
  const apiData = await fetchRevenueWithMetaData(params);
  
  if (!apiData) {
    throw new Error('Dados da API não disponíveis para o gráfico');
  }

  const revenueData = apiData.revenueDataInternal;
  const metaData = apiData.metaData;
  
  if (isSingleDay && revenueData?.hourly_data) {
    // Para um único dia, usar dados por hora se disponíveis
    const hourlyData = revenueData.hourly_data;
    const previousHourlyData = revenueData.previous_period_data?.hourly_data;
    
    // Dados granulados da Meta por hora - nova estrutura
    const currentMeta = apiData.fullData?.meta?.current_period || {};
    const previousMeta = apiData.fullData?.meta?.previous_period || {};
    
    const metaSpendByHour = currentMeta.meta_spend_by_hour || {};
    const metaImpressByHour = currentMeta.meta_impressions_by_hour || {};
    const metaClicksByHour = currentMeta.meta_clicks_by_hour || {};
    const metaLeadsByHour = currentMeta.meta_leads_by_hour || {};
    const metaPurchasesByHour = currentMeta.meta_purchases_by_hour || {};
    const metaRevenueByHour = currentMeta.meta_revenue_by_hour || {};
    
    // Dados do período anterior da Meta
    const previousMetaSpendByHour = previousMeta.meta_spend_by_hour || {};
    const previousMetaImpressByHour = previousMeta.meta_impressions_by_hour || {};
    const previousMetaClicksByHour = previousMeta.meta_clicks_by_hour || {};
    
    // Gerar dados das 0h às 23h
    for (let hour = 0; hour <= 23; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      
      // Dados internos por hora
      const leads = Number(hourlyData.leads_by_hour?.[hourStr]) || 0;
      const purchases = Number(hourlyData.purchases_by_hour?.[hourStr]) || 0;
      const revenue = Number(hourlyData.revenue_by_hour?.[hourStr]) || 0;
      
      // Dados da Meta por hora (granulados)
      const metaSpend = Number(metaSpendByHour[hourStr]) || 0;
      const metaImpressions = Number(metaImpressByHour[hourStr]) || 0;
      const metaClicks = Number(metaClicksByHour[hourStr]) || 0;
      const metaLeads = Number(metaLeadsByHour[hourStr]) || 0;
      const metaPurchases = Number(metaPurchasesByHour[hourStr]) || 0;
      const metaRevenue = Number(metaRevenueByHour[hourStr]) || 0;
      
      // Usar dados internos como prioridade, Meta como fallback/complemento
      const finalLeads = leads > 0 ? leads : metaLeads;
      const finalPurchases = purchases > 0 ? purchases : metaPurchases;
      const finalRevenue = revenue > 0 ? revenue : metaRevenue;
      
      // Métricas da Meta calculadas para esta hora
      const hourCTR = metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0;
      const hourCPC = metaClicks > 0 ? metaSpend / metaClicks : 0;
      const hourCPL = finalLeads > 0 ? metaSpend / finalLeads : 0;
      const hourROAS = metaSpend > 0 ? finalRevenue / metaSpend : 0;
      const hourROI = metaSpend > 0 ? ((finalRevenue - metaSpend) / metaSpend) * 100 : 0;
      
      // Dados do período anterior (mesma hora)
      const previousLeads = Number(previousHourlyData?.leads_by_hour?.[hourStr]) || 0;
      const previousPurchases = Number(previousHourlyData?.purchases_by_hour?.[hourStr]) || 0;
      const previousRevenue = Number(previousHourlyData?.revenue_by_hour?.[hourStr]) || 0;
      const previousMetaSpend = Number(previousMetaSpendByHour[hourStr]) || 0;
      const previousMetaImpressions = Number(previousMetaImpressByHour[hourStr]) || 0;
      const previousMetaClicks = Number(previousMetaClicksByHour[hourStr]) || 0;
      
      const previousCTR = previousMetaImpressions > 0 ? (previousMetaClicks / previousMetaImpressions) * 100 : 0;
      const previousCPC = previousMetaClicks > 0 ? previousMetaSpend / previousMetaClicks : 0;
      const previousCPL = previousLeads > 0 ? previousMetaSpend / previousLeads : 0;
      const previousROAS = previousMetaSpend > 0 ? previousRevenue / previousMetaSpend : 0;
      const previousROI = previousMetaSpend > 0 ? ((previousRevenue - previousMetaSpend) / previousMetaSpend) * 100 : 0;

      chartData.push({
        date: params.from,
        period: `${hourStr}h`,
        hour: hour,
        leads: finalLeads,
        sessions: 0,
        purchases: finalPurchases,
        cpl: hourCPL,
        investment: metaSpend,
        revenue: Math.round(finalRevenue * 100) / 100,
        roas: hourROAS,
        roi: hourROI,
        ctr: hourCTR,
        cpc: hourCPC,
        impressions: metaImpressions,
        clicks: metaClicks,
        // Dados do período anterior
        previous_leads: previousLeads,
        previous_purchases: previousPurchases,
        previous_revenue: Math.round(previousRevenue * 100) / 100,
        previous_cpl: previousCPL,
        previous_investment: previousMetaSpend,
        previous_roas: previousROAS,
        previous_roi: previousROI,
        previous_ctr: previousCTR,
        previous_cpc: previousCPC,
        previous_impressions: previousMetaImpressions,
        previous_clicks: previousMetaClicks
      });
    }
    
    return chartData;
  } else if (!isSingleDay && revenueData?.leads_by_day) {
    // Para múltiplos dias, usar dados por dia
    const leadsByDay = revenueData.leads_by_day || {};
    const purchasesByDay = revenueData.purchases_by_day || {};
    const revenueByDay = revenueData.revenue_by_day || {};
    
    // Dados granulados da Meta por dia - nova estrutura
    const currentMeta = apiData.fullData?.meta?.current_period || {};
    const previousMeta = apiData.fullData?.meta?.previous_period || {};
    
    const metaSpendByDay = currentMeta.meta_spend_by_day || {};
    const metaImpressionsByDay = currentMeta.meta_impressions_by_day || {};
    const metaClicksByDay = currentMeta.meta_clicks_by_day || {};
    const metaLeadsByDay = currentMeta.meta_leads_by_day || {};
    const metaPurchasesByDay = currentMeta.meta_purchases_by_day || {};
    const metaRevenueByDay = currentMeta.meta_revenue_by_day || {};
    
    // Dados do período anterior
    const previousLeadsByDay = revenueData.previous_period_data?.leads_by_day || {};
    const previousPurchasesByDay = revenueData.previous_period_data?.purchases_by_day || {};
    const previousRevenueByDay = revenueData.previous_period_data?.revenue_by_day || {};
    
    // Dados do período anterior da Meta
    const previousMetaSpendByDay = previousMeta.meta_spend_by_day || {};
    const previousMetaImpressionsByDay = previousMeta.meta_impressions_by_day || {};
    const previousMetaClicksByDay = previousMeta.meta_clicks_by_day || {};

    // Iterar por cada dia do período
    const currentDate = new Date(fromDate);
    let dayIndex = 0;
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Dados internos por dia
      const leads = Number(leadsByDay[dateStr]) || 0;
      const purchases = Number(purchasesByDay[dateStr]) || 0;
      const revenue = Number(revenueByDay[dateStr]) || 0;
      
      // Dados da Meta por dia (granulados)
      const metaSpend = Number(metaSpendByDay[dateStr]) || 0;
      const metaImpressions = Number(metaImpressionsByDay[dateStr]) || 0;
      const metaClicks = Number(metaClicksByDay[dateStr]) || 0;
      const metaLeads = Number(metaLeadsByDay[dateStr]) || 0;
      const metaPurchases = Number(metaPurchasesByDay[dateStr]) || 0;
      const metaRevenue = Number(metaRevenueByDay[dateStr]) || 0;
      
      // Usar dados internos como prioridade, Meta como fallback/complemento
      const finalLeads = leads > 0 ? leads : metaLeads;
      const finalPurchases = purchases > 0 ? purchases : metaPurchases;
      const finalRevenue = revenue > 0 ? revenue : metaRevenue;
      
      // Métricas da Meta calculadas para este dia
      const dayCTR = metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0;
      const dayCPC = metaClicks > 0 ? metaSpend / metaClicks : 0;
      const dayCPL = finalLeads > 0 ? metaSpend / finalLeads : 0;
      const dayROAS = metaSpend > 0 ? finalRevenue / metaSpend : 0;
      const dayROI = metaSpend > 0 ? ((finalRevenue - metaSpend) / metaSpend) * 100 : 0;

      // Para dados do período anterior, usar índice relativo
      const previousDates = Object.keys(previousLeadsByDay).sort();
      const previousDateStr = previousDates[dayIndex];
      const previousLeads = previousDateStr ? Number(previousLeadsByDay[previousDateStr]) || 0 : 0;
      const previousPurchases = previousDateStr ? Number(previousPurchasesByDay[previousDateStr]) || 0 : 0;
      const previousRevenue = previousDateStr ? Number(previousRevenueByDay[previousDateStr]) || 0 : 0;
      
      // Dados do período anterior da Meta
      const previousMetaSpend = Number(previousMetaSpendByDay[dateStr]) || 0;
      const previousMetaImpressions = Number(previousMetaImpressionsByDay[dateStr]) || 0;
      const previousMetaClicks = Number(previousMetaClicksByDay[dateStr]) || 0;
      
      const previousCTR = previousMetaImpressions > 0 ? (previousMetaClicks / previousMetaImpressions) * 100 : 0;
      const previousCPC = previousMetaClicks > 0 ? previousMetaSpend / previousMetaClicks : 0;
      const previousCPL = previousLeads > 0 ? previousMetaSpend / previousLeads : 0;
      const previousROAS = previousMetaSpend > 0 ? previousRevenue / previousMetaSpend : 0;
      const previousROI = previousMetaSpend > 0 ? ((previousRevenue - previousMetaSpend) / previousMetaSpend) * 100 : 0;

      // Só adicionar se houver dados no período atual
      if (finalLeads > 0 || finalPurchases > 0 || finalRevenue > 0 || metaSpend > 0) {
        chartData.push({
          date: dateStr,
          period: `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
          leads: finalLeads,
          sessions: 0,
          purchases: finalPurchases,
          cpl: dayCPL,
          investment: metaSpend,
          revenue: Math.round(finalRevenue * 100) / 100,
          roas: dayROAS,
          roi: dayROI,
          ctr: dayCTR,
          cpc: dayCPC,
          impressions: metaImpressions,
          clicks: metaClicks,
          // Dados do período anterior
          previous_leads: previousLeads,
          previous_purchases: previousPurchases,
          previous_revenue: Math.round(previousRevenue * 100) / 100,
          previous_cpl: previousCPL,
          previous_investment: previousMetaSpend,
          previous_roas: previousROAS,
          previous_roi: previousROI,
          previous_ctr: previousCTR,
          previous_cpc: previousCPC,
          previous_impressions: previousMetaImpressions,
          previous_clicks: previousMetaClicks
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
      dayIndex++;
    }
    
    return chartData;
  } else {
    // Fallback para dados consolidados (quando não há dados detalhados)
    chartData.push({
      date: params.from,
      period: isSingleDay ? "Hoje" : `${String(fromDate.getDate()).padStart(2, '0')}/${String(fromDate.getMonth() + 1).padStart(2, '0')}`,
      leads: apiData.totalLeads || 0,
      sessions: 0,
      purchases: apiData.totalPurchases || 0,
      cpl: apiData.cplPerLead || 0,
      investment: apiData.totalInvestment || 0,
      revenue: Math.round((apiData.totalRevenue || 0) * 100) / 100,
      roas: apiData.roas || 0,
      roi: apiData.roi || 0,
      ctr: apiData.ctr || 0,
      cpc: apiData.cpc || 0,
      impressions: apiData.totalImpressions || 0,
      clicks: apiData.totalClicks || 0,
      // Dados do período anterior
      previous_leads: apiData.previousLeads || 0,
      previous_purchases: apiData.previousPurchases || 0,
      previous_cpl: apiData.previousCPL || 0,
      previous_investment: apiData.previousInvestment || 0,
      previous_revenue: Math.round((apiData.previousRevenue || 0) * 100) / 100,
      previous_roas: apiData.previousROAS || 0,
      previous_roi: apiData.previousROI || 0,
      previous_ctr: apiData.previousCTR || 0,
      previous_cpc: apiData.previousCPC || 0,
      previous_impressions: apiData.previousImpressions || 0,
      previous_clicks: apiData.previousClicks || 0
         });
     
     return chartData;
  }
};

// Gerar dados de analytics baseados nos dados da API (com ou sem Meta)
const generateAnalyticsData = async (realData: any, params: {
  from: string;
  to?: string;
  time_from?: string;
  time_to?: string;
  profession_id?: string;
}) => {
  // Buscar profissões reais da API
  const professions = await fetchProfessions();

  // Usar dados da API com ou sem Meta
  const comparison = realData.comparison;
  const hasMetaData = realData.hasMetaData;
  

  
  // Métricas da Meta (quando disponíveis)
  const currentROI = hasMetaData ? (realData.roi || 0) : 0;
  const previousROI = hasMetaData ? (realData.previousROI || 0) : 0;
  const roiGrowth = hasMetaData && previousROI > 0 ? ((currentROI - previousROI) / previousROI) * 100 : 0;
  
  const currentCTR = hasMetaData ? (realData.ctr || 0) : 0;
  const previousCTR = hasMetaData ? (realData.previousCTR || 0) : 0;
  const ctrGrowth = hasMetaData && previousCTR > 0 ? ((currentCTR - previousCTR) / previousCTR) * 100 : 0;
  
  const currentCPC = hasMetaData ? (realData.cpc || 0) : 0;
  const previousCPC = hasMetaData ? (realData.previousCPC || 0) : 0;
  const cpcGrowth = hasMetaData && previousCPC > 0 ? ((currentCPC - previousCPC) / previousCPC) * 100 : 0;
  
  const currentConnectRate = hasMetaData ? (realData.connectRate || 0) : 0;
  const previousConnectRate = hasMetaData ? (realData.previousConnectRate || 0) : 0;
  const connectRateGrowth = hasMetaData && previousConnectRate > 0 ? ((currentConnectRate - previousConnectRate) / previousConnectRate) * 100 : 0;
  
  const generalData = {
    overall_leads: {
      current: realData.totalLeads,
      previous: realData.previousLeads,
      percentage: Math.abs(Number(comparison?.leads_change?.percentage || 0)),
      is_increasing: comparison?.leads_change?.is_increasing || false
    },
    overall_purchases: {
      current: realData.totalPurchases,
      previous: realData.previousPurchases,
      percentage: Math.abs(Number(comparison?.purchases_change?.percentage || 0)),
      is_increasing: comparison?.purchases_change?.is_increasing || false
    },
    overall_cpl: {
      current: hasMetaData ? realData.cplPerLead : 0,
      previous: hasMetaData ? realData.previousCPL : 0,
      percentage: hasMetaData ? Math.abs(Number(comparison?.investment_change?.percentage || 0)) : 0,
      is_increasing: hasMetaData ? !(comparison?.investment_change?.is_increasing || false) : false
    },
    overall_investment: {
      current: hasMetaData ? realData.totalInvestment : 0,
      previous: hasMetaData ? realData.previousInvestment : 0,
      percentage: hasMetaData ? Math.abs(Number(comparison?.investment_comparison?.percentage || 0)) : 0,
      is_increasing: hasMetaData ? (comparison?.investment_comparison?.is_increasing || false) : false
    },
    overall_revenue: {
      current: realData.totalRevenue,
      previous: realData.previousRevenue,
      percentage: Math.abs(Number(comparison?.revenue_change?.percentage || 0)),
      is_increasing: comparison?.revenue_change?.is_increasing || false
    },
    overall_roas: {
      current: hasMetaData ? realData.roas : 0,
      previous: hasMetaData ? realData.previousROAS : 0,
      percentage: hasMetaData ? Math.abs(Number(comparison?.roas_comparison?.percentage || 0)) : 0,
      is_increasing: hasMetaData ? (comparison?.roas_comparison?.is_increasing || false) : false
    },
    overall_roi: {
      current: currentROI,
      previous: previousROI,
      percentage: hasMetaData ? Math.abs(Number(comparison?.roi_comparison?.percentage || roiGrowth)) : 0,
      is_increasing: hasMetaData ? (comparison?.roi_comparison?.is_increasing || (roiGrowth >= 0)) : false
    },
    overall_ctr: {
      current: currentCTR,
      previous: previousCTR,
      percentage: Math.abs(ctrGrowth),
      is_increasing: ctrGrowth >= 0
    },
    overall_cpc: {
      current: currentCPC,
      previous: previousCPC,
      percentage: Math.abs(cpcGrowth),
      is_increasing: !(cpcGrowth >= 0) // CPC menor é melhor
    },
    overall_impressions: {
      current: hasMetaData ? (realData.totalImpressions || 0) : 0,
      previous: hasMetaData ? (realData.previousImpressions || 0) : 0,
      percentage: hasMetaData && (realData.previousImpressions || 0) > 0 ? 
        Math.abs(((realData.totalImpressions || 0) - (realData.previousImpressions || 0)) / (realData.previousImpressions || 0) * 100) : 0,
      is_increasing: hasMetaData ? (realData.totalImpressions || 0) >= (realData.previousImpressions || 0) : false
    },
    overall_clicks: {
      current: hasMetaData ? (realData.totalClicks || 0) : 0,
      previous: hasMetaData ? (realData.previousClicks || 0) : 0,
      percentage: hasMetaData && (realData.previousClicks || 0) > 0 ? 
        Math.abs(((realData.totalClicks || 0) - (realData.previousClicks || 0)) / (realData.previousClicks || 0) * 100) : 0,
      is_increasing: hasMetaData ? (realData.totalClicks || 0) >= (realData.previousClicks || 0) : false
    },
    overall_connect_rate: {
      current: currentConnectRate,
      previous: previousConnectRate,
      percentage: Math.abs(connectRateGrowth),
      is_increasing: connectRateGrowth >= 0
    },
    // Métricas adicionais da Meta
    overall_total_spend: {
      current: hasMetaData ? (realData.totalSpend || 0) : 0,
      previous: hasMetaData ? (realData.previousSpend || 0) : 0
    },
    overall_total_impressions: {
      current: hasMetaData ? (realData.totalImpressions || 0) : 0,
      previous: hasMetaData ? (realData.previousImpressions || 0) : 0
    },
    overall_total_clicks: {
      current: hasMetaData ? (realData.totalClicks || 0) : 0,
      previous: hasMetaData ? (realData.previousClicks || 0) : 0
    },
    overall_cost_per_purchase: {
      current: hasMetaData ? (realData.costPerPurchase || 0) : 0,
      previous: hasMetaData ? (realData.previousCostPerPurchase || 0) : 0
    }
  };

  // Processar dados por profissão se disponível
  let professionData: any[] = [];
  
  if (realData.professionData && realData.professionData.length > 0) {
    professionData = realData.professionData.map((professionSummary: any) => {
      const professionLeads = Number(professionSummary.leads?.current || 0);
      const professionPurchases = Number(professionSummary.purchases?.current || 0);
      const professionRevenue = Number(professionSummary.revenue?.current || 0);
      
      const professionPreviousLeads = Number(professionSummary.leads?.previous || 0);
      const professionPreviousPurchases = Number(professionSummary.purchases?.previous || 0);
      const professionPreviousRevenue = Number(professionSummary.revenue?.previous || 0);
      
      // Dados de investimento apenas se Meta disponível E se vier do backend
      const professionInvestment = hasMetaData ? Number(professionSummary.investment?.current || 0) : 0;
      const professionPreviousInvestment = hasMetaData ? Number(professionSummary.investment?.previous || 0) : 0;
      
      // Usar APENAS dados que vierem do backend - não calcular/distribuir fake data
      const finalProfessionInvestment = professionInvestment;
      const finalProfessionPreviousInvestment = professionPreviousInvestment;
      
      const professionCPL = hasMetaData && professionLeads > 0 ? finalProfessionInvestment / professionLeads : 0;
      const professionPreviousCpl = hasMetaData && professionPreviousLeads > 0 ? finalProfessionPreviousInvestment / professionPreviousLeads : 0;
      const professionROAS = hasMetaData && finalProfessionInvestment > 0 ? professionRevenue / finalProfessionInvestment : 0;
      const professionPreviousRoas = hasMetaData && finalProfessionPreviousInvestment > 0 ? professionPreviousRevenue / finalProfessionPreviousInvestment : 0;
      
      // Métricas adicionais da Meta para profissão
      const professionROI = hasMetaData && finalProfessionInvestment > 0 ? ((professionRevenue - finalProfessionInvestment) / finalProfessionInvestment) * 100 : 0;
      const professionPreviousRoi = hasMetaData && finalProfessionPreviousInvestment > 0 ? ((professionPreviousRevenue - finalProfessionPreviousInvestment) / finalProfessionPreviousInvestment) * 100 : 0;

      // Usar percentuais da API
      const growthLeads = Number(professionSummary.leads?.percentage || 0);
      const growthRevenue = Number(professionSummary.revenue?.percentage || 0);
      const growthPurchases = Number(professionSummary.purchases?.percentage || 0);
      const growthInvestment = hasMetaData ? Number(professionSummary.investment?.percentage || 0) : 0;

      return {
        profession_id: String(professionSummary.profession_id),
        profession_name: professionSummary.profession_name,
        leads: professionLeads,
        purchases: professionPurchases,
        cpl: professionCPL,
        investment: finalProfessionInvestment,
        revenue: professionRevenue,
        roas: professionROAS,
        roi: professionROI,
        connect_rate: hasMetaData && finalProfessionInvestment > 0 ? (realData.connectRate || 0) : 0,
        ctr: hasMetaData && finalProfessionInvestment > 0 ? (realData.ctr || 0) : 0,
        cpc: hasMetaData && finalProfessionInvestment > 0 ? (realData.cpc || 0) : 0,
        cost_per_purchase: hasMetaData && professionPurchases > 0 ? finalProfessionInvestment / professionPurchases : 0,
        previous_leads: professionPreviousLeads,
        previous_purchases: professionPreviousPurchases,
        previous_cpl: professionPreviousCpl,
        previous_investment: finalProfessionPreviousInvestment,
        previous_revenue: professionPreviousRevenue,
        previous_roas: professionPreviousRoas,
        previous_roi: professionPreviousRoi,
        previous_connect_rate: hasMetaData && finalProfessionPreviousInvestment > 0 ? (realData.previousConnectRate || 0) : 0,
        previous_ctr: hasMetaData && finalProfessionPreviousInvestment > 0 ? (realData.previousCTR || 0) : 0,
        previous_cpc: hasMetaData && finalProfessionPreviousInvestment > 0 ? (realData.previousCPC || 0) : 0,
        previous_cost_per_purchase: hasMetaData && professionPreviousPurchases > 0 ? finalProfessionPreviousInvestment / professionPreviousPurchases : 0,
        growth_leads: Math.round(growthLeads * 10) / 10,
        growth_purchases: Math.round(growthPurchases * 10) / 10,
        growth_cpl: hasMetaData ? Math.round(((professionCPL - professionPreviousCpl) / professionPreviousCpl || 0) * 1000) / 10 : 0,
        growth_investment: Math.round(growthInvestment * 10) / 10,
        growth_revenue: Math.round(growthRevenue * 10) / 10,
        growth_roas: hasMetaData ? Math.round(((professionROAS - professionPreviousRoas) / professionPreviousRoas || 0) * 1000) / 10 : 0,
        growth_roi: hasMetaData ? Math.round(((professionROI - professionPreviousRoi) / Math.abs(professionPreviousRoi) || 0) * 100) / 10 : 0,
        growth_connect_rate: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? Math.round(((realData.connectRate - realData.previousConnectRate) / realData.previousConnectRate || 0) * 1000) / 10 : 0,
        growth_ctr: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? Math.round(((realData.ctr - realData.previousCTR) / realData.previousCTR || 0) * 1000) / 10 : 0,
        growth_cpc: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? Math.round(((realData.cpc - realData.previousCPC) / realData.previousCPC || 0) * 1000) / 10 : 0,
        is_increasing_leads: professionSummary.leads?.is_increasing || false,
        is_increasing_purchases: professionSummary.purchases?.is_increasing || false,
        is_increasing_cpl: hasMetaData ? (professionCPL <= professionPreviousCpl) : false, // CPL menor é melhor
        is_increasing_investment: hasMetaData ? (professionSummary.investment?.is_increasing || false) : false,
        is_increasing_revenue: professionSummary.revenue?.is_increasing || false,
        is_increasing_roas: hasMetaData ? (professionROAS >= professionPreviousRoas) : false,
        is_increasing_roi: hasMetaData ? (professionROI >= professionPreviousRoi) : false,
        is_increasing_connect_rate: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? (realData.connectRate >= realData.previousConnectRate) : false,
        is_increasing_ctr: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? (realData.ctr >= realData.previousCTR) : false,
        is_increasing_cpc: hasMetaData && finalProfessionInvestment > 0 && finalProfessionPreviousInvestment > 0 ? (realData.cpc <= realData.previousCPC) : false, // CPC menor é melhor
        is_active: true
      };
    });
  }

  // Retornar dados gerais + dados por profissão, indicando se Meta está disponível
  const result = {
    ...generalData,
    profession_data: professionData,
    meta_available: hasMetaData,
    // Incluir dados brutos da Meta para debug/transparência
    meta_data: hasMetaData ? {
      total_investment: realData.totalInvestment,
      total_spend: realData.totalSpend,
      total_impressions: realData.totalImpressions,
      total_clicks: realData.totalClicks,
      roas: realData.roas,
      roi: realData.roi,
      ctr: realData.ctr,
      cpc: realData.cpc,
      connect_rate: realData.connectRate,
      cost_per_lead: realData.costPerLead,
      cost_per_purchase: realData.costPerPurchase,
      previous_investment: realData.previousInvestment,
      previous_roas: realData.previousROAS,
      previous_roi: realData.previousROI,
      previous_ctr: realData.previousCTR,
      previous_cpc: realData.previousCPC,
      previous_connect_rate: realData.previousConnectRate
    } : null
  };
  

  
  return result;
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

    // Buscar dados da API com Meta
    const realData = await fetchRealAnalyticsData({
      from,
      to: to || from,
      time_from: timeFrom || undefined,
      time_to: timeTo || undefined,
      profession_id: professionId || undefined
    });

    // Gerar dados de analytics usando dados da Meta
    const analyticsData = await generateAnalyticsData(realData, {
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
            error: 'Profissão não encontrada nos dados disponíveis' 
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
          profession_name: professionData.profession_name,
          meta_available: analyticsData.meta_available
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
        active_professions: analyticsData.profession_data.filter((p: any) => p.is_active).length,
        meta_available: analyticsData.meta_available
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