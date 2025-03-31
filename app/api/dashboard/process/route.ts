import { NextRequest, NextResponse } from 'next/server';
import { format, parse, parseISO } from 'date-fns';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';

interface DateRange {
  from: string;
  to: string;
}

// Add cache control for better performance
export const revalidate = 60; // Cache for 60 seconds

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { data, timeFrame, dateRange } = await request.json();
    
    // Early return if no data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    // Create a unique cache key based on the request parameters
    const cacheKey = `dashboard-${timeFrame}-${JSON.stringify(dateRange)}-${data.length}`;
    
    // Create response with cache headers
    return new Response(
      // Use a Stream to improve initial load time
      new ReadableStream({
        async start(controller) {
          try {
            // Process data in the stream
            const processedData = await processDataWithTimeFrame(data, timeFrame, dateRange);
            
            // Send data as a JSON string
            controller.enqueue(new TextEncoder().encode(JSON.stringify(processedData)));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60, stale-while-revalidate=600',
        }
      }
    );
  } catch (error) {
    console.error('Error processing chart data:', error);
    return NextResponse.json({ 
      error: `Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Separate data processing logic for better organization
async function processDataWithTimeFrame(
  data: DashboardDataItem[], 
  timeFrame: TimeFrame,
  dateRange: DateRange | null
) {
  // Extract from and to dates from dateRange if available
  let fromDate: string | null = null;
  let toDate: string | null = null;
  
  if (dateRange && dateRange.from) {
    fromDate = dateRange.from.split('T')[0]; // Get just the date part
  }
  
  if (dateRange && dateRange.to) {
    toDate = dateRange.to.split('T')[0]; // Get just the date part
  }
  
  // Group data by date and type
  const groupedByDate: Record<string, any> = {};
  
  // Log all unique dates being processed for debugging
  const uniqueDates = Array.from(new Set(data.map((item: DashboardDataItem) => item.date.split('T')[0])));
  console.log(`Processing ${uniqueDates.length} unique dates in data`);
  
  // Group by date and initialize all counts to 0
  data.forEach((item: DashboardDataItem) => {
    // Extract just the date part (YYYY-MM-DD)
    const datePart = item.date.split('T')[0];
    
    // If we don't have this date yet, initialize all counts to 0
    if (!groupedByDate[datePart]) {
      groupedByDate[datePart] = {
        period: datePart,
        leads: 0,
        clients: 0,
        sessions: 0,
        conversions: 0
      };
    }
    
    // Add the count to the appropriate type
    switch (item.type) {
      case 'leads':
        groupedByDate[datePart].leads += item.count;
        break;
      case 'clients':
        groupedByDate[datePart].clients += item.count;
        break;
      case 'sessions':
        groupedByDate[datePart].sessions += item.count;
        break;
      case 'conversions':
        groupedByDate[datePart].conversions += item.count;
        break;
    }
  });
  
  // Fill in missing dates if we have enough data
  if (Object.keys(groupedByDate).length > 0) {
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
  
  console.log(`Returning ${processedData.length} processed data points`);
  
  return processedData;
} 