import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getGeneralMetrics } from "../../lib/api/analytics";

interface GeneralMetricsProps {
  onMetricSelect: (metric: string) => void;
}

export async function GeneralMetrics({ onMetricSelect }: GeneralMetricsProps) {
  const metrics = await getGeneralMetrics();

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('totalUsers')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalUsers}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('activeUsers')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeUsers}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('totalProfessionals')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Profissionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalProfessionals}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('activeProfessionals')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profissionais Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeProfessionals}</div>
        </CardContent>
      </Card>
    </>
  );
} 