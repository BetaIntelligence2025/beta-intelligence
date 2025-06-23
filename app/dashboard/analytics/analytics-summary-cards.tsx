"use client";

import { DollarSign, TrendingUp, Target, BarChart3, Users, ShoppingCart, Eye, MousePointer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/count-animation";
import { cn } from "@/lib/utils";
import { CardType } from "@/components/dashboard/summary-cards";

export type AnalyticsCardType = "leads" | "purchases" | "cpl" | "investment" | "revenue" | "roas" | "roi" | "ctr" | "cpc" | "impressions" | "clicks" | null;

interface AnalyticsData {
  overall_leads: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_purchases: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_cpl: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_investment: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_revenue: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_roas: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_roi?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_ctr?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_cpc?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_impressions?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  overall_clicks?: {
    current: number;
    previous: number;
    percentage: number;
    is_increasing: boolean;
  };
  meta_available?: boolean;
  profession_data?: Array<{
    profession_id: string;
    profession_name: string;
    cpl: number;
    investment: number;
    revenue: number;
    roas: number;
    leads: number;
    purchases: number;
    previous_cpl?: number;
    previous_investment?: number;
    previous_revenue?: number;
    previous_roas?: number;
    previous_leads?: number;
    previous_purchases?: number;
    growth_cpl?: number;
    growth_investment?: number;
    growth_revenue?: number;
    growth_roas?: number;
    growth_leads?: number;
    growth_purchases?: number;
    is_increasing_cpl?: boolean;
    is_increasing_investment?: boolean;
    is_increasing_revenue?: boolean;
    is_increasing_roas?: boolean;
    is_increasing_leads?: boolean;
    is_increasing_purchases?: boolean;
  }>;
}

interface AnalyticsSummaryCardsProps {
  analyticsData: AnalyticsData | null;
  isLoading: boolean;
  viewType: "geral" | "profissoes";
  selectedProfession?: string | null;
  selectedCard?: AnalyticsCardType;
  onCardSelect?: (cardType: AnalyticsCardType) => void;
}

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

// Função para formatar números grandes
const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
};

// Componente para mostrar variação percentual detalhada
const DetailedPercentageVariation = ({ 
  current, 
  previous, 
  percentage, 
  isIncreasing, 
  label,
  showPreviousValue = true,
  formatValue = (val: number) => val.toLocaleString('pt-BR')
}: {
  current: number;
  previous: number;
  percentage: number;
  isIncreasing: boolean;
  label: string;
  showPreviousValue?: boolean;
  formatValue?: (value: number) => string;
}) => {
  if (previous === 0 && current === 0) {
    return (
      <div className="text-xs text-gray-500">
        <div>Sem dados para comparação</div>
      </div>
    );
  }

  const formatPercentage = (num: number): string => {
    return num.toFixed(2).replace('.', ',');
  };

  const changeText = isIncreasing ? "de crescimento" : "de queda";
  const arrowIcon = isIncreasing ? "↗" : "↘";
  const textColor = isIncreasing ? "text-green-600" : "text-red-600";

  return (
    <div className="space-y-1">
      <div className={cn("text-xs flex items-center gap-1", textColor)}>
        <span>{arrowIcon}</span>
        <span>{isIncreasing ? "+" : "-"}{formatPercentage(percentage)}% {changeText}</span>
      </div>
      <div className="text-xs text-gray-500">
        em relação aos {formatValue(previous)} anteriores
      </div>
    </div>
  );
};

export default function AnalyticsSummaryCards({ 
  analyticsData, 
  isLoading, 
  viewType,
  selectedProfession,
  selectedCard,
  onCardSelect
}: AnalyticsSummaryCardsProps) {

  // Função para lidar com o clique em um card
  const handleCardClick = (cardType: AnalyticsCardType) => {
    if (onCardSelect) {
      onCardSelect(cardType === selectedCard ? null : cardType);
    }
  };
  
  // Para visão geral, usar dados gerais
  if (viewType === "geral") {
    // Verificar se há dados disponíveis
    if (!analyticsData && !isLoading) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Todas as profissões</span>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
                <p className="text-gray-400 text-sm mt-2">Tente selecionar um período diferente ou verifique se há leads cadastrados.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Resumo Geral</h2>
          <span className="text-sm text-gray-500">Todas as profissões</span>
        </div>
        
        <div className="overflow-hidden rounded-md">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Leads Gerais */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "leads" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("leads")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Total de Leads</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <Users className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    analyticsData?.overall_leads?.current?.toLocaleString('pt-BR') || "0"
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_leads ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_leads.current}
                      previous={analyticsData.overall_leads.previous}
                      percentage={analyticsData.overall_leads.percentage}
                      isIncreasing={analyticsData.overall_leads.is_increasing}
                      label="Leads"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Compras Gerais */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "purchases" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("purchases")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Total de Compras</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <ShoppingCart className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    analyticsData?.overall_purchases?.current?.toLocaleString('pt-BR') || "0"
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_purchases ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_purchases.current}
                      previous={analyticsData.overall_purchases.previous}
                      percentage={analyticsData.overall_purchases.percentage}
                      isIncreasing={analyticsData.overall_purchases.is_increasing}
                      label="Compras"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CPL Geral */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "cpl" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("cpl")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">CPL (Custo por Lead) Geral</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <Target className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    formatCurrency(analyticsData?.overall_cpl?.current || 0)
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_cpl ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_cpl.current}
                      previous={analyticsData.overall_cpl.previous}
                      percentage={analyticsData.overall_cpl.percentage}
                      isIncreasing={analyticsData.overall_cpl.is_increasing}
                      label="CPL"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Investimento Geral */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "investment" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("investment")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Investimento Geral</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <TrendingUp className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    formatCurrency(analyticsData?.overall_investment?.current || 0)
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_investment ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_investment.current}
                      previous={analyticsData.overall_investment.previous}
                      percentage={analyticsData.overall_investment.percentage}
                      isIncreasing={analyticsData.overall_investment.is_increasing}
                      label="Investment"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Geral */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "revenue" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("revenue")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Faturamento Geral</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <DollarSign className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    formatCurrency(analyticsData?.overall_revenue?.current || 0)
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_revenue ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_revenue.current}
                      previous={analyticsData.overall_revenue.previous}
                      percentage={analyticsData.overall_revenue.percentage}
                      isIncreasing={analyticsData.overall_revenue.is_increasing}
                      label="Revenue"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ROAS Geral */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedCard === "roas" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => handleCardClick("roas")}
            >
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">ROAS Geral</CardTitle>
                <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                  <BarChart3 className="size-5 text-gray-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    `${(analyticsData?.overall_roas?.current || 0).toFixed(2)}x`
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_roas ? (
                    <DetailedPercentageVariation 
                      current={analyticsData.overall_roas.current}
                      previous={analyticsData.overall_roas.previous}
                      percentage={analyticsData.overall_roas.percentage}
                      isIncreasing={analyticsData.overall_roas.is_increasing}
                      label="ROAS"
                    />
                  ) : (
                    "Sem dados"
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mostrar métricas adicionais da Meta apenas se os dados estiverem disponíveis */}
            {analyticsData?.meta_available && (
              <>
                {/* ROI Geral */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCard === "roi" ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleCardClick("roi")}
                >
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-black">ROI Geral</CardTitle>
                    <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                      <TrendingUp className="size-5 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">
                      {isLoading ? (
                        "Carregando..."
                      ) : (
                        `${(analyticsData?.overall_roi?.current || 0).toFixed(1)}%`
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? (
                        "Calculando..."
                      ) : analyticsData?.overall_roi ? (
                        <DetailedPercentageVariation 
                          current={analyticsData.overall_roi.current}
                          previous={analyticsData.overall_roi.previous}
                          percentage={analyticsData.overall_roi.percentage}
                          isIncreasing={analyticsData.overall_roi.is_increasing}
                          label="ROI"
                        />
                      ) : (
                        "Sem dados"
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* CTR Geral */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCard === "ctr" ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleCardClick("ctr")}
                >
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-black">CTR Geral</CardTitle>
                    <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                      <Target className="size-5 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">
                      {isLoading ? (
                        "Carregando..."
                      ) : (
                        `${(analyticsData?.overall_ctr?.current || 0).toFixed(2)}%`
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? (
                        "Calculando..."
                      ) : analyticsData?.overall_ctr ? (
                        <DetailedPercentageVariation 
                          current={analyticsData.overall_ctr.current}
                          previous={analyticsData.overall_ctr.previous}
                          percentage={analyticsData.overall_ctr.percentage}
                          isIncreasing={analyticsData.overall_ctr.is_increasing}
                          label="CTR"
                        />
                      ) : (
                        "Sem dados"
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* CPC Geral */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCard === "cpc" ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleCardClick("cpc")}
                >
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-black">CPC Geral</CardTitle>
                    <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                      <DollarSign className="size-5 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">
                      {isLoading ? (
                        "Carregando..."
                      ) : (
                        formatCurrency(analyticsData?.overall_cpc?.current || 0)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? (
                        "Calculando..."
                      ) : analyticsData?.overall_cpc ? (
                        <DetailedPercentageVariation 
                          current={analyticsData.overall_cpc.current}
                          previous={analyticsData.overall_cpc.previous}
                          percentage={analyticsData.overall_cpc.percentage}
                          isIncreasing={analyticsData.overall_cpc.is_increasing}
                          label="CPC"
                        />
                      ) : (
                        "Sem dados"
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Impressions */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCard === "impressions" ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleCardClick("impressions")}
                >
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-black">Impressões</CardTitle>
                    <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                      <Eye className="size-5 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">
                      {isLoading ? (
                        "Carregando..."
                      ) : (
                        formatNumber(analyticsData?.overall_impressions?.current || 0)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? (
                        "Calculando..."
                      ) : analyticsData?.overall_impressions ? (
                        <DetailedPercentageVariation 
                          current={analyticsData.overall_impressions.current}
                          previous={analyticsData.overall_impressions.previous}
                          percentage={analyticsData.overall_impressions.percentage}
                          isIncreasing={analyticsData.overall_impressions.is_increasing}
                          label="Impressões"
                        />
                      ) : (
                        "Sem dados"
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Clicks */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedCard === "clicks" ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleCardClick("clicks")}
                >
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-black">Cliques</CardTitle>
                    <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                      <MousePointer className="size-5 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-black">
                      {isLoading ? (
                        "Carregando..."
                      ) : (
                        formatNumber(analyticsData?.overall_clicks?.current || 0)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {isLoading ? (
                        "Calculando..."
                      ) : analyticsData?.overall_clicks ? (
                        <DetailedPercentageVariation 
                          current={analyticsData.overall_clicks.current}
                          previous={analyticsData.overall_clicks.previous}
                          percentage={analyticsData.overall_clicks.percentage}
                          isIncreasing={analyticsData.overall_clicks.is_increasing}
                          label="Cliques"
                        />
                      ) : (
                        "Sem dados"
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Para visão por profissão
  // Verificar se há dados disponíveis para profissões
  if (viewType === "profissoes" && !analyticsData && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Métricas por Profissão</h2>
          <span className="text-sm text-gray-500">Dados não disponíveis</span>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
              <p className="text-gray-400 text-sm mt-2">Tente selecionar um período diferente ou verifique se há leads cadastrados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const professionData = analyticsData?.profession_data?.find(
    p => String(p.profession_id) === String(selectedProfession)
  );



  if (viewType === "profissoes" && !selectedProfession) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">Selecione uma profissão</h3>
        <p className="text-gray-500">
          Para visualizar as métricas específicas, selecione uma profissão.
        </p>
      </div>
    );
  }

  if (viewType === "profissoes" && selectedProfession && !professionData && !isLoading) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">Dados não encontrados</h3>
        <p className="text-gray-500">
          Não foram encontrados dados para a profissão selecionada no período especificado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Métricas por Profissão</h2>
        <span className="text-sm text-gray-500">
          {professionData?.profession_name || "Carregando..."}
        </span>
      </div>
      
      <div className="overflow-hidden rounded-md">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Leads por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "leads" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("leads")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Leads da Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <Users className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  professionData?.leads?.toLocaleString() || "0"
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_leads ? (
                  <DetailedPercentageVariation 
                    current={professionData.leads}
                    previous={professionData.previous_leads}
                    percentage={professionData.growth_leads || 0}
                    isIncreasing={professionData.is_increasing_leads || false}
                    label="Leads"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compras por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "purchases" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("purchases")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Compras da Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <ShoppingCart className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  professionData?.purchases?.toLocaleString() || "0"
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_purchases ? (
                  <DetailedPercentageVariation 
                    current={professionData.purchases}
                    previous={professionData.previous_purchases}
                    percentage={professionData.growth_purchases || 0}
                    isIncreasing={professionData.is_increasing_purchases || false}
                    label="Compras"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>

          {/* CPL por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "cpl" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("cpl")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">CPL por Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <Target className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  formatCurrency(professionData?.cpl || 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_cpl ? (
                  <DetailedPercentageVariation 
                    current={professionData.cpl}
                    previous={professionData.previous_cpl}
                    percentage={professionData.growth_cpl || 0}
                    isIncreasing={professionData.is_increasing_cpl || false}
                    label="CPL"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investimento por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "investment" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("investment")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Investimento por Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <TrendingUp className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  formatCurrency(professionData?.investment || 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_investment ? (
                  <DetailedPercentageVariation 
                    current={professionData.investment}
                    previous={professionData.previous_investment}
                    percentage={professionData.growth_investment || 0}
                    isIncreasing={professionData.is_increasing_investment || false}
                    label="Investment"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "revenue" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("revenue")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Faturamento por Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <DollarSign className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  formatCurrency(professionData?.revenue || 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_revenue ? (
                  <DetailedPercentageVariation 
                    current={professionData.revenue}
                    previous={professionData.previous_revenue}
                    percentage={professionData.growth_revenue || 0}
                    isIncreasing={professionData.is_increasing_revenue || false}
                    label="Revenue"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>

          {/* ROAS por Profissão */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedCard === "roas" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => handleCardClick("roas")}
          >
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">ROAS por Profissão</CardTitle>
              <div className="absolute end-4 top-4 flex size-12 items-center justify-center rounded-full bg-gray-100 p-4">
                <BarChart3 className="size-5 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {isLoading ? (
                  "Carregando..."
                ) : (
                  `${(professionData?.roas || 0).toFixed(2)}x`
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? (
                  "Calculando..."
                ) : professionData && professionData.previous_roas ? (
                  <DetailedPercentageVariation 
                    current={professionData.roas}
                    previous={professionData.previous_roas}
                    percentage={professionData.growth_roas || 0}
                    isIncreasing={professionData.is_increasing_roas || false}
                    label="ROAS"
                  />
                ) : (
                  "Sem dados comparativos"
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 