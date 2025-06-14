"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  overall_leads: {
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
    previous_cpl?: number;
    previous_investment?: number;
    previous_revenue?: number;
    previous_roas?: number;
    previous_leads?: number;
    growth_cpl?: number;
    growth_investment?: number;
    growth_revenue?: number;
    growth_roas?: number;
    growth_leads?: number;
    is_increasing_cpl?: boolean;
    is_increasing_investment?: boolean;
    is_increasing_revenue?: boolean;
    is_increasing_roas?: boolean;
    is_increasing_leads?: boolean;
    is_active?: boolean;
  }>;
}

interface AnalyticsVisualizationProps {
  analyticsData: AnalyticsData | null;
  isLoading: boolean;
  viewType: "geral" | "profissoes";
  selectedProfession: string | null;
}

// Função para formatar valores monetários
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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

// Componente para card de profissão
const ProfessionCard = ({ 
  profession, 
  isSelected = false 
}: { 
  profession: any; 
  isSelected?: boolean;
}) => {
  const isActive = profession.is_active !== false;
  
  return (
    <Card className={cn(
      "transition-all duration-200 cursor-pointer",
      isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-md",
      !isActive ? "opacity-60 border-dashed" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-black">
            {profession.profession_name}
          </CardTitle>
          {!isActive && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Profissão inativa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* CPL */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">CPL (custo por lead) geral</span>
          <div className="text-right">
            <div className="text-sm font-semibold text-black">
              {formatCurrency(profession.cpl || 0)}
            </div>
            {profession.previous_cpl && profession.previous_cpl > 0 ? (
              <div className={cn(
                "text-xs flex items-center gap-1",
                profession.is_increasing_cpl ? "text-red-600" : "text-green-600" // CPL menor é melhor, então invertemos as cores
              )}>
                {profession.is_increasing_cpl ? "↑" : "↓"} {(profession.growth_cpl || 0).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
        </div>

        {/* Investment */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Investimento geral</span>
          <div className="text-right">
            <div className="text-sm font-semibold text-black">
              {formatCurrency(profession.investment || 0)}
            </div>
            {profession.previous_investment && profession.previous_investment > 0 ? (
              <div className={cn(
                "text-xs flex items-center gap-1",
                profession.is_increasing_investment ? "text-blue-600" : "text-gray-600"
              )}>
                {profession.is_increasing_investment ? "↑" : "↓"} {(profession.growth_investment || 0).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Faturamento geral</span>
          <div className="text-right">
            <div className="text-sm font-semibold text-black">
              {formatCurrency(profession.revenue || 0)}
            </div>
            {profession.previous_revenue && profession.previous_revenue > 0 ? (
              <div className={cn(
                "text-xs flex items-center gap-1",
                profession.is_increasing_revenue ? "text-green-600" : "text-red-600"
              )}>
                {profession.is_increasing_revenue ? "↑" : "↓"} {(profession.growth_revenue || 0).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
        </div>

        {/* ROAS */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">ROAS (retorno sobre o investimento de marketing) geral</span>
          <div className="text-right">
            <div className="text-sm font-semibold text-black">
              {(profession.roas || 0).toFixed(2)}x
            </div>
            {profession.previous_roas && profession.previous_roas > 0 ? (
              <div className={cn(
                "text-xs flex items-center gap-1",
                profession.is_increasing_roas ? "text-green-600" : "text-red-600"
              )}>
                {profession.is_increasing_roas ? "↑" : "↓"} {(profession.growth_roas || 0).toFixed(1)}%
              </div>
            ) : (
              <div className="text-xs text-gray-400">-</div>
            )}
          </div>
        </div>

        {/* Leads */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Total de leads no período</span>
          <div className="text-sm font-semibold text-black">
            {formatNumber(profession.leads || 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AnalyticsVisualization({ 
  analyticsData, 
  isLoading, 
  viewType, 
  selectedProfession 
}: AnalyticsVisualizationProps) {
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black">
            {viewType === "geral" ? "Resumo por Profissões" : "Detalhes da Profissão"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se há dados disponíveis
  if (!analyticsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black">
            {viewType === "geral" ? "Resumo por Profissões" : "Detalhes da Profissão"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum dado encontrado para o período selecionado.</p>
            <p className="text-gray-400 text-sm mt-2">Tente selecionar um período diferente ou verifique se há leads cadastrados.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewType === "geral") {
    // Visão geral - mostrar todas as profissões
    const professionData = analyticsData?.profession_data || [];
    
    if (professionData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Resumo por Profissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum dado de profissão disponível para o período selecionado.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Ordenar profissões: ativas primeiro, depois por faturamento
    const sortedProfessions = professionData.sort((a, b) => {
      // Profissões ativas primeiro
      const aActive = a.is_active !== false;
      const bActive = b.is_active !== false;
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // Entre profissões com o mesmo status, ordenar por revenue (maior primeiro)
      return (b.revenue || 0) - (a.revenue || 0);
    });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-black">Resumo por Profissões</CardTitle>
            <span className="text-sm text-gray-500">
              {professionData.length} {professionData.length === 1 ? 'profissão' : 'profissões'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedProfessions.map((profession) => (
              <ProfessionCard 
                key={profession.profession_id} 
                profession={profession}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Visão por profissão específica
  if (viewType === "profissoes") {
    if (!selectedProfession) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Detalhes da Profissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">Selecione uma profissão para ver os detalhes.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const professionData = analyticsData?.profession_data?.find(
      p => p.profession_id === selectedProfession
    );

    if (!professionData) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Detalhes da Profissão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">Dados não encontrados para a profissão selecionada.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-black">
            Detalhes: {professionData.profession_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md mx-auto">
            <ProfessionCard 
              profession={professionData}
              isSelected={true}
            />
          </div>
          
          {/* Seção adicional com insights */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-black mb-3">Insights da Profissão</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Eficiência do CPL:</span>
                <span className={cn(
                  "font-medium",
                  (professionData.cpl || 0) <= 50 ? "text-green-600" : 
                  (professionData.cpl || 0) <= 100 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(professionData.cpl || 0) <= 50 ? "Excelente" : 
                   (professionData.cpl || 0) <= 100 ? "Boa" : "Precisa melhorar"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Performance do ROAS:</span>
                <span className={cn(
                  "font-medium",
                  (professionData.roas || 0) >= 3 ? "text-green-600" : 
                  (professionData.roas || 0) >= 2 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(professionData.roas || 0) >= 3 ? "Excelente" : 
                   (professionData.roas || 0) >= 2 ? "Boa" : "Precisa melhorar"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Volume de leads:</span>
                <span className={cn(
                  "font-medium",
                  (professionData.leads || 0) >= 100 ? "text-green-600" : 
                  (professionData.leads || 0) >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(professionData.leads || 0) >= 100 ? "Alto" : 
                   (professionData.leads || 0) >= 50 ? "Médio" : "Baixo"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
} 