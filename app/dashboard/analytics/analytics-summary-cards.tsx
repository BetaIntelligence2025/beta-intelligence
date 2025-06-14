"use client";

import { DollarSign, TrendingUp, Target, BarChart3, Users, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/count-animation";
import { cn } from "@/lib/utils";
import { CardType } from "@/components/dashboard/summary-cards";

export type AnalyticsCardType = "leads" | "purchases" | "cpl" | "investment" | "revenue" | "roas" | null;

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

// Componente para mostrar variação percentual
const PercentageVariation = ({ 
  current, 
  previous, 
  percentage, 
  isIncreasing, 
  label 
}: {
  current: number;
  previous: number;
  percentage: number;
  isIncreasing: boolean;
  label: string;
}) => {
  if (previous === 0) {
    return (
      <span className="text-gray-500 text-xs">
        Não comparável
      </span>
    );
  }

  const formatPercentage = (num: number): string => {
    return num.toFixed(1).replace('.', ',');
  };

  return (
    <span className={cn(
      "text-xs flex items-center gap-1",
      isIncreasing ? "text-green-600" : "text-red-600"
    )}>
      {isIncreasing ? "↑" : "↓"} {formatPercentage(percentage)}% vs período anterior
    </span>
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
                    analyticsData?.overall_leads?.current?.toLocaleString() || "0"
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_leads ? (
                    <PercentageVariation 
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
                    analyticsData?.overall_purchases?.current?.toLocaleString() || "0"
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isLoading ? (
                    "Calculando..."
                  ) : analyticsData?.overall_purchases ? (
                    <PercentageVariation 
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
                    <PercentageVariation 
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
                    <PercentageVariation 
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
                    <PercentageVariation 
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
                    <PercentageVariation 
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
                  <PercentageVariation 
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
                  <PercentageVariation 
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
                  <PercentageVariation 
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
                  <PercentageVariation 
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
                  <PercentageVariation 
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
                  <PercentageVariation 
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