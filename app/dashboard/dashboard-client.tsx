"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw } from "lucide-react";
import { DateFilterButton, DateRange } from "./date-filter-button";
import { useRouter } from "next/navigation";
import { DashboardDataResult } from "./types";
import { CardType } from "@/components/dashboard/summary-cards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardClientProps {
  initialData: DashboardDataResult;
  initialDateRange: { from: string, to: string };
}

export default function DashboardClient({ initialData, initialDateRange }: DashboardClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState("geral");
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  
  // Convert date strings to Date objects for the client side
  const defaultDateRange: DateRange = {
    from: new Date(initialDateRange.from),
    to: new Date(initialDateRange.to)
  };

  // Initialize date range state with converted values from props
  const [currentDateRange, setCurrentDateRange] = useState<DateRange>(defaultDateRange);

  // Update URL with new date range for server components to refetch data
  const handleDateRangeChange = useCallback((dateRange: DateRange | undefined) => {
    if (!dateRange || !dateRange.from) return;
    
    // Format dates for URL
    const formatDateForUrl = (date: Date | undefined) => {
      return date ? date.toISOString() : '';
    };
    
    // Create URL with new date params
    const url = new URL(window.location.href);
    url.searchParams.set('from', formatDateForUrl(dateRange.from));
    
    if (dateRange.to) {
      url.searchParams.set('to', formatDateForUrl(dateRange.to));
    } else {
      url.searchParams.delete('to');
    }
    
    // Update URL without full page reload
    window.history.pushState({}, '', url.toString());
    
    // Update local state
    setCurrentDateRange(dateRange);
    
    // Trigger router refresh to get new data from server
    router.refresh();
  }, [router]);

  // Handle refresh button click
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    
    // Refresh the current route
    router.refresh();
    
    // Disable button for 2 seconds after refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      setIsRefreshing(false);
      refreshTimeoutRef.current = null;
    }, 2000);
  }, [router]);

  // Capture dashboard screenshot
  const captureScreenshot = useCallback(async () => {
    try {
      setIsDownloading(true);
      
      // Get the document element as fallback
      const element = dashboardRef.current || document.documentElement;
      
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture the dashboard
      const canvas = await html2canvas(element, {
        logging: false,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Create download link
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const fileName = `dashboard_${dateStr}_${timeStr}.png`;
      
      link.download = fileName;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Screenshot error:", error);
      alert('Não foi possível capturar a tela. Por favor, tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // Connect client components to server-rendered data
  useEffect(() => {
    // Initialize client-side visualization with server data
    const summaryCardsPlaceholder = document.getElementById('summary-cards-placeholder');
    const visualizationPlaceholder = document.getElementById('visualization-placeholder');
    
    if (summaryCardsPlaceholder && visualizationPlaceholder) {
      // This would be replaced with actual hydration of client components using the data
      console.log('Hydrating client components with server data');
      
      // In a real implementation, you would:
      // 1. Get data from data attributes
      // 2. Initialize client-side charts/components
      // 3. Set up interactivity
    }
  }, [initialData]);

  return (
    <div>
      <div className="flex items-center space-x-2">
        <DateFilterButton onChange={handleDateRangeChange} />
        <Button 
          size="sm" 
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
        <Button 
          size="sm" 
          className="gap-2"
          onClick={captureScreenshot}
          disabled={isDownloading}
        >
          <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} />
          {isDownloading ? 'Gerando...' : 'Download'}
        </Button>
      </div>
      
      <Tabs defaultValue="geral" value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsList className="mb-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="funis">Funis</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {activeTab === "funis" && (
        <div className="flex flex-col items-center justify-center p-8 rounded-md border border-dashed">
          <h3 className="text-xl font-semibold mb-2">Visualização de Funis</h3>
          <p className="text-gray-500 text-center mb-4">
            Esta visualização mostrará os funis de conversão do seu negócio.
          </p>
          <p className="text-sm text-muted-foreground">
            Em desenvolvimento. Disponível em breve.
          </p>
        </div>
      )}
    </div>
  );
} 