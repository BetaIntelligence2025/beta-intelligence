import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getProfessionalMetrics } from "../../lib/api/analytics";

interface ProfessionalMetricsProps {
  onMetricSelect: (metric: string) => void;
}

export async function ProfessionalMetrics({ onMetricSelect }: ProfessionalMetricsProps) {
  const metrics = await getProfessionalMetrics();

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('totalAppointments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('completedAppointments')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completedAppointments}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('averageRating')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</div>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={() => onMetricSelect('totalRevenue')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {metrics.totalRevenue.toFixed(2)}</div>
        </CardContent>
      </Card>
    </>
  );
} 