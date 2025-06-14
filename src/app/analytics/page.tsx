import { Metadata } from "next";
import { GeneralMetrics } from "../../components/analytics/GeneralMetrics";
import { ProfessionalMetrics } from "../../components/analytics/ProfessionalMetrics";
import { MetricsChart } from "../../components/analytics/MetricsChart";
import { useState } from "react";
import { getMetricHistory } from "../../lib/api/analytics";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Analytics dashboard",
};

export default function AnalyticsPage() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const handleMetricSelect = async (metric: string) => {
    setSelectedMetric(metric);
    try {
      const historyData = await getMetricHistory(metric);
      setChartData(historyData);
    } catch (error) {
      console.error('Error fetching metric history:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GeneralMetrics onMetricSelect={handleMetricSelect} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ProfessionalMetrics onMetricSelect={handleMetricSelect} />
      </div>
      <MetricsChart selectedMetric={selectedMetric} data={chartData} />
    </div>
  );
} 