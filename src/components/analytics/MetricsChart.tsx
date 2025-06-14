import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricsChartProps {
  selectedMetric: string | null;
  data: any[];
}

export function MetricsChart({ selectedMetric, data }: MetricsChartProps) {
  if (!selectedMetric) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Selecione uma métrica para visualizar</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Clique em um dos cards acima para ver a visualização</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart
  const chartData = data.map(item => ({
    date: item.date,
    value: item[selectedMetric],
  }));

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Evolução da {selectedMetric}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 