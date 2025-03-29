"use server";

import { format, parse, parseISO } from 'date-fns';

// Get the API base URL from environment variables
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8080' 
  : (process.env.NEXT_PUBLIC_API_URL || '');

// Ensure the URL has a protocol and hostname for absolute URLs
function getAbsoluteUrl(path: string): string {
  // If the URL already includes a protocol, return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Otherwise, join with the API base URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${API_BASE_URL}${normalizedPath}`;
  return fullUrl;
}

export type TimeFrame = "Daily" | "Weekly" | "Monthly" | "Yearly";

export interface DashboardDataItem {
  date: string;
  count: number;
  type: string;
}

export interface DashboardDataResult {
  data: DashboardDataItem[];
  errors?: string;
}

/**
 * Helper function to fetch data from an API endpoint
 */
async function fetchApiData(url: string | undefined, type: string): Promise<DashboardDataItem[]> {
  if (!url) return [];
  
  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      next: { revalidate: 60 } // Revalidate data every minute
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      // Map the API data to our format
      return data.map(item => ({
        date: item.date,
        count: item.count || 0,
        type
      }));
    } else if (data && typeof data === 'object' && data.periods) {
      // Handle periods-specific format (correct key name is "periods" not "period")
      const entries = Object.entries(data.periods);
      
      return entries.map(([date, count]) => ({
        date,
        count: count as number,
        type
      }));
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Helper function to get unique dates from arrays
 */
function getUniqueDates(arrays: string[][]): string[] {
  // Flatten arrays and get unique values
  const allDates = arrays.flat();
  const uniqueDates: string[] = [];
  
  // Manual deduplication
  for (const date of allDates) {
    if (!uniqueDates.includes(date)) {
      uniqueDates.push(date);
    }
  }
  
  return uniqueDates;
}

/**
 * Server action to fetch dashboard data
 */
export async function fetchDashboardDataAction(
  timeFrame: TimeFrame,
  dateRange: { from: string; to: string } | null,
  cardType?: string
): Promise<DashboardDataResult> {
  try {
    // Determine if we should use all_data=true (when no date range is provided)
    const useAllData = !dateRange || (!dateRange.from && !dateRange.to);
    
    // Set up the API query parameters based on whether we're using all data or a date range
    let queryParams: string;
    let fromDate: string | null = null;
    let toDate: string | null = null;
    
    if (useAllData) {
      // When no date filter is applied, use all_data=true to get full history
      queryParams = 'count_only=true&all_data=true';
    } else {
      // When a date range is selected, use from/to parameters
      // Make sure dates are exactly as provided, without any adjustments
      fromDate = dateRange.from;
      toDate = dateRange.to;
      queryParams = `count_only=true&from=${fromDate}&to=${toDate}&period=true`;
    }
    
    // Normalize card type
    const normalizedCardType = cardType 
      ? cardType.endsWith('s') ? cardType : `${cardType}s` 
      : undefined;
    
    try {
      // Build the URLs based on the card type
      let sessionUrl;
      let leadUrl;
      let clientUrl;
      
      // Create absolute URLs with trailing slash
      if (normalizedCardType) {
        switch (normalizedCardType) {
          case 'sessions':
            sessionUrl = getAbsoluteUrl(`/session/?${queryParams}`);
            break;
          case 'leads':
            leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
            break;
          case 'clients':
            clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
            break;
          case 'conversions':
            // Conversions requires both leads and clients data
            leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
            clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
            break;
        }
      } else {
        // If no specific card, we need all data
        sessionUrl = getAbsoluteUrl(`/session/?${queryParams}`);
        leadUrl = getAbsoluteUrl(`/lead/?${queryParams}`);
        clientUrl = getAbsoluteUrl(`/client/?${queryParams}`);
      }

      // Fetch data from the specified endpoints
      let sessionData: DashboardDataItem[] = [];
      let leadData: DashboardDataItem[] = [];
      let clientData: DashboardDataItem[] = [];
      let conversionData: DashboardDataItem[] = [];
      
      // Fetch data in parallel
      const promises = [];
      
      if (sessionUrl) {
        promises.push(fetchApiData(sessionUrl, 'sessions').then(data => { sessionData = data; }));
      }
      
      if (leadUrl) {
        promises.push(fetchApiData(leadUrl, 'leads').then(data => { leadData = data; }));
      }
      
      if (clientUrl) {
        promises.push(fetchApiData(clientUrl, 'clients').then(data => { clientData = data; }));
      }
      
      // Wait for all fetch operations to complete
      try {
        await Promise.all(promises);
      } catch (error) {
        return { 
          data: [],
          errors: `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
      
      // Generate conversion data if we have both leads and clients
      if (leadData.length > 0 && clientData.length > 0) {
        // Get all unique dates using the helper function
        const leadDates = leadData.map(item => item.date);
        const clientDates = clientData.map(item => item.date);
        const dates = getUniqueDates([leadDates, clientDates]);
        
        // For each date, calculate conversions (clients as a percentage of leads)
        conversionData = dates.map(date => {
          const leadsForDate = leadData.find(item => item.date === date)?.count || 0;
          const clientsForDate = clientData.find(item => item.date === date)?.count || 0;
          
          // Conversion is the percentage of leads that became clients
          // If there are zero leads, default to 0 to avoid division by zero
          const conversionRate = leadsForDate > 0 
            ? (clientsForDate / leadsForDate) * 100 
            : 0;
          
          return {
            date,
            count: Math.round(conversionRate),
            type: 'conversions'
          };
        });
      }
      
      // Merge all data
      let combinedData: DashboardDataItem[] = [
        ...sessionData,
        ...leadData,
        ...clientData,
        ...conversionData
      ];
      
      // Filter data based on card type if specified
      if (normalizedCardType) {
        combinedData = combinedData.filter(item => item.type === normalizedCardType);
      }
      
      // If a date range was provided, ensure we only include data within that range
      if (fromDate && toDate) {
        // Parse the date strings to get just YYYY-MM-DD for comparison
        const fromDateStr = fromDate.split('T')[0];
        const toDateStr = toDate.split('T')[0];
        
        // Only include data points within the date range
        const beforeFilter = combinedData.length;
        combinedData = combinedData.filter(item => {
          const itemDate = item.date.split('T')[0]; // Remove any time part
          const inRange = itemDate >= fromDateStr && itemDate <= toDateStr;
          
          return inRange;
        });
        
        return {
          data: combinedData
        };
      }
      
      return {
        data: combinedData
      };
      
    } catch (error) {
      return {
        data: [],
        errors: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  } catch (error) {
    return {
      data: [],
      errors: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Server action to process chart data
 */
export async function processChartDataAction(
  data: DashboardDataItem[],
  timeFrame: TimeFrame,
  dateRange?: { from: string; to: string } | null
): Promise<any[]> {
  try {
    // Extract date range boundaries if provided
    const fromDate = dateRange?.from?.split('T')[0];
    const toDate = dateRange?.to?.split('T')[0];
    
    if (fromDate && toDate) {
      // Pre-filter data to only include items within date range
      data = data.filter(item => {
        const itemDate = item.date.split('T')[0];
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }
    
    // Log all dates we're receiving
    console.log("Processing data with the following dates:", 
      data.map(item => item.date).filter((v, i, a) => a.indexOf(v) === i).sort()
    );
    
    // More detailed logging
    const uniqueDatesByDay = Array.from(new Set(data.map(item => item.date.split('T')[0]))).sort();
    console.log(`Unique dates by day: ${uniqueDatesByDay.join(', ')}`);
    
    // Group by date and type first
    const groupedByDate = data.reduce((acc, item) => {
      const dateKey = item.date.split('T')[0]; // Use just YYYY-MM-DD as the key
      
      // Initialize if this date doesn't exist
      if (!acc[dateKey]) {
        acc[dateKey] = {
          period: dateKey,
          leads: 0,
          clients: 0,
          sessions: 0,
          conversions: 0
        };
      }
      
      // Add the count to the correct type
      if (item.type && acc[dateKey]) {
        acc[dateKey][item.type] = item.count;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Fill in missing dates if we have enough data
    if (data.length > 0) {
      try {
        // Get all dates from the data and sort them
        const dates = Object.keys(groupedByDate).map(date => new Date(date));
        dates.sort((a, b) => a.getTime() - b.getTime());
        
        // If we have at least two dates, we can fill in the gaps
        if (dates.length >= 2) {
          // If we have date range boundaries, use them instead of min/max from data
          let startDate = dates[0];
          let endDate = dates[dates.length - 1];
          
          if (fromDate) {
            const fromDateObj = new Date(fromDate);
            if (fromDateObj > startDate) {
              startDate = fromDateObj;
            }
          }
          
          if (toDate) {
            const toDateObj = new Date(toDate);
            if (toDateObj < endDate) {
              endDate = toDateObj;
            }
          }
          
          console.log(`Filling dates from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
          
          // Create dates for each day in the range
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            
            // If this date doesn't exist in our data, add it with zeros
            if (!groupedByDate[dateStr]) {
              groupedByDate[dateStr] = {
                period: dateStr,
                leads: 0,
                clients: 0,
                sessions: 0,
                conversions: 0
              };
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      } catch (error) {
        console.error('Error filling dates:', error);
      }
    }
    
    // Convert to array and ensure we only include dates within the range
    let processedData = Object.values(groupedByDate);
    
    // Apply final filter to ensure only dates within range are included
    if (fromDate && toDate) {
      processedData = processedData.filter(item => {
        const itemDate = item.period.split('T')[0];
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }
    
    // Sort by date to ensure correct order
    processedData.sort((a, b) => {
      const dateA = new Date(a.period);
      const dateB = new Date(b.period);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Apply date formatting based on timeframe
    processedData = processedData.map(item => {
      const dateObj = parseISO(item.period);
      
      // Format the period based on the time frame
      let formattedPeriod = item.period;
      switch (timeFrame) {
        case "Daily":
          // Ensure we have a consistent date format no matter what the input is
          try {
            formattedPeriod = format(dateObj, 'dd/MM/yyyy');
          } catch (e) {
            formattedPeriod = item.period; // Fallback to original
          }
          break;
        case "Weekly":
          const weekStart = new Date(dateObj);
          weekStart.setDate(dateObj.getDate() - dateObj.getDay() + 1); // Monday
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Sunday
          formattedPeriod = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;
          break;
        case "Monthly":
          formattedPeriod = format(dateObj, 'MMM yyyy');
          break;
        case "Yearly":
          formattedPeriod = format(dateObj, 'yyyy');
          break;
      }
      
      return {
        ...item,
        period: formattedPeriod
      };
    });
    
    // If timeframe is not daily, aggregate data by period
    if (timeFrame !== "Daily") {
      const aggregatedData: Record<string, any> = {};
      
      processedData.forEach(item => {
        if (!aggregatedData[item.period]) {
          aggregatedData[item.period] = {
            period: item.period,
            leads: 0,
            clients: 0,
            sessions: 0,
            conversions: 0
          };
        }
        
        // Add values
        aggregatedData[item.period].leads += item.leads || 0;
        aggregatedData[item.period].clients += item.clients || 0;
        aggregatedData[item.period].sessions += item.sessions || 0;
        
        // Conversion is special - it's clients/leads ratio, not a sum
        // We'll recalculate it after summing leads and clients
      });
      
      // Recalculate conversions for each period
      Object.values(aggregatedData).forEach(item => {
        if (item.leads > 0) {
          item.conversions = Math.round((item.clients / item.leads) * 100);
        } else {
          item.conversions = 0;
        }
      });
      
      processedData = Object.values(aggregatedData);
    }
    
    // Sort by date
    processedData.sort((a, b) => {
      // For daily, we can parse dd/MM/yyyy
      if (timeFrame === "Daily") {
        const dateA = parse(a.period, 'dd/MM/yyyy', new Date());
        const dateB = parse(b.period, 'dd/MM/yyyy', new Date());
        return dateA.getTime() - dateB.getTime();
      }
      // For weekly, we'll use the first date in the range
      else if (timeFrame === "Weekly") {
        const startDateA = a.period.split(' - ')[0];
        const startDateB = b.period.split(' - ')[0];
        const dateA = parse(startDateA, 'dd/MM', new Date());
        const dateB = parse(startDateB, 'dd/MM', new Date());
        return dateA.getTime() - dateB.getTime();
      }
      // For monthly, we'll parse MMM yyyy
      else if (timeFrame === "Monthly") {
        const dateA = parse(a.period, 'MMM yyyy', new Date());
        const dateB = parse(b.period, 'MMM yyyy', new Date());
        return dateA.getTime() - dateB.getTime();
      }
      // For yearly, just compare years
      else {
        return parseInt(a.period) - parseInt(b.period);
      }
    });
    
    return processedData;
  } catch (error) {
    console.error('Error processing data:', error);
    throw error;
  }
} 