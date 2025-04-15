import { NextRequest, NextResponse } from 'next/server';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardDataItem, TimeFrame } from '@/app/dashboard/types';

interface DateRange {
  from: string;
  to: string;
}

// Make cache dynamic based on request
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { data, timeFrame, dateRange } = await request.json();
    
    // Early return if no data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    try {
      // Process data
      const processedData = await processDataWithTimeFrame(data, timeFrame, dateRange);
      
      // Return the processed data as JSON
      return NextResponse.json(processedData, {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60, stale-while-revalidate=600',
        }
      });
    } catch (error) {
      console.error('Error processing data:', error);
      return NextResponse.json({ 
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in process route:', error);
    return NextResponse.json({ 
      error: `Request error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Separate data processing logic for better organization
async function processDataWithTimeFrame(
  data: DashboardDataItem[], 
  timeFrame: TimeFrame,
  dateRange: DateRange | null
) {
  try {
    // Validate inputs
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid or empty data array');
      return [];
    }
    
    // Extract from and to dates from dateRange if available
    let fromDate: string | null = null;
    let toDate: string | null = null;
    
    if (dateRange && dateRange.from) {
      try {
        fromDate = dateRange.from.split('T')[0]; // Get just the date part
      } catch (e) {
        console.error('Error parsing from date:', e);
      }
    }
    
    if (dateRange && dateRange.to) {
      try {
        toDate = dateRange.to.split('T')[0]; // Get just the date part
      } catch (e) {
        console.error('Error parsing to date:', e);
      }
    }
    
    // Check if we're looking at only the current day
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    const isOnlyToday = fromDate === todayString && toDate === todayString;
    
    // Check if this is a single day filter (where from and to dates are the same)
    const isSingleDayFilter = fromDate && toDate && fromDate === toDate;
    
    // If only a single day is selected, include previous day as well to have at least two points
    if (isSingleDayFilter) {
      const selectedDate = new Date(fromDate!);
      const previousDay = new Date(selectedDate);
      previousDay.setDate(previousDay.getDate() - 1);
      fromDate = format(previousDay, 'yyyy-MM-dd');
      console.log('Extending date range to include previous day:', { fromDate, toDate });
    }
    
    // Group data by date and type
    const groupedByDate: Record<string, any> = {};
    
    // Filter out items with invalid or missing dates
    const validData = data.filter(item => item && item.date && typeof item.date === 'string');
    
    // Log all unique dates being processed for debugging
    const uniqueDates = Array.from(new Set(validData.map((item: DashboardDataItem) => {
      try {
        return item.date.split('T')[0];
      } catch (e) {
        console.error('Error splitting date:', e, item);
        return null;
      }
    }).filter(Boolean)));
    
    console.log(`Processing ${uniqueDates.length} unique dates in data`);
    
    // Group by date and initialize all counts to 0
    validData.forEach((item: DashboardDataItem) => {
      try {
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
        if (item.type && typeof item.count === 'number') {
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
        }
      } catch (e) {
        console.error('Error processing item:', e, item);
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
            try {
              const fromDateObj = new Date(fromDate);
              if (!isNaN(fromDateObj.getTime()) && fromDateObj < startDate) {
                startDate = fromDateObj;
              }
            } catch (e) {
              console.error('Error parsing fromDate:', e);
            }
          }
          
          if (toDate) {
            try {
              const toDateObj = new Date(toDate);
              if (!isNaN(toDateObj.getTime()) && toDateObj > endDate) {
                endDate = toDateObj;
              }
            } catch (e) {
              console.error('Error parsing toDate:', e);
            }
          }
          
          console.log(`Filling dates from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
          
          // Create dates for each day in the range
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            try {
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
            } catch (e) {
              console.error('Error filling date:', e);
              // Prevent infinite loop in case of error
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        } else if (dates.length === 1 && !isSingleDayFilter) {
          // If we only have one date point and it's not a single day filter, 
          // add another point for the previous day
          const singleDate = dates[0];
          const previousDay = new Date(singleDate);
          previousDay.setDate(previousDay.getDate() - 1);
          
          const previousDateStr = format(previousDay, 'yyyy-MM-dd');
          if (!groupedByDate[previousDateStr]) {
            groupedByDate[previousDateStr] = {
              period: previousDateStr,
              leads: 0,
              clients: 0,
              sessions: 0,
              conversions: 0
            };
            console.log(`Added previous day ${previousDateStr} to ensure at least two data points`);
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
      try {
        processedData = processedData.filter(item => {
          if (!item.period) return false;
          const itemDate = item.period.split('T')[0];
          return itemDate >= fromDate && itemDate <= toDate;
        });
      } catch (e) {
        console.error('Error filtering date range:', e);
      }
    }
    
    // Sort by date to ensure correct order
    try {
      processedData.sort((a, b) => {
        const dateA = new Date(a.period);
        const dateB = new Date(b.period);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (e) {
      console.error('Error sorting by date:', e);
    }
    
    // Group data by week, month, or year if needed
    if (timeFrame !== "Daily") {
      try {
        // Create a map to hold our aggregated data
        const aggregatedData: Record<string, any> = {};
        
        for (const item of processedData) {
          try {
            const dateObj = parseISO(item.period);
            let groupKey: string;
            
            // Determine the key based on time frame
            if (timeFrame === "Weekly") {
              // Get the Monday of the week
              const weekStart = new Date(dateObj);
              weekStart.setDate(dateObj.getDate() - dateObj.getDay() + 1); // Monday
              groupKey = format(weekStart, 'yyyy-MM-dd');
            } else if (timeFrame === "Monthly") {
              // Group by year and month
              groupKey = format(dateObj, 'yyyy-MM');
            } else { // Yearly
              // Group by year
              groupKey = format(dateObj, 'yyyy');
            }
            
            // Initialize group if it doesn't exist
            if (!aggregatedData[groupKey]) {
              aggregatedData[groupKey] = {
                period: groupKey,
                leads: 0,
                clients: 0,
                sessions: 0,
                conversions: 0
              };
            }
            
            // Add the data to the group
            aggregatedData[groupKey].leads += item.leads || 0;
            aggregatedData[groupKey].clients += item.clients || 0;
            aggregatedData[groupKey].sessions += item.sessions || 0;
            aggregatedData[groupKey].conversions += item.conversions || 0;
            
          } catch (e) {
            console.error('Error aggregating item:', e, item);
          }
        }
        
        // Convert back to array and sort by date
        processedData = Object.values(aggregatedData).sort((a, b) => {
          const dateA = new Date(a.period);
          const dateB = new Date(b.period);
          return dateA.getTime() - dateB.getTime();
        });
        
        console.log(`Aggregated data to ${processedData.length} ${timeFrame.toLowerCase()} data points`);
      } catch (e) {
        console.error(`Error aggregating data by ${timeFrame}:`, e);
      }
    }
    
    // Apply date formatting based on timeframe
    try {
      processedData = processedData.map(item => {
        try {
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
              try {
                const weekStart = new Date(dateObj);
                weekStart.setDate(dateObj.getDate() - dateObj.getDay() + 1); // Monday
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6); // Sunday
                formattedPeriod = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;
              } catch (e) {
                formattedPeriod = item.period; // Fallback to original
              }
              break;
            case "Monthly":
              try {
                formattedPeriod = format(dateObj, 'MMM yyyy', { locale: ptBR });
              } catch (e) {
                formattedPeriod = item.period; // Fallback to original
              }
              break;
            case "Yearly":
              try {
                formattedPeriod = format(dateObj, 'yyyy');
              } catch (e) {
                formattedPeriod = item.period; // Fallback to original
              }
              break;
          }
          
          return {
            ...item,
            period: formattedPeriod
          };
        } catch (e) {
          console.error('Error formatting period:', e, item);
          return item; // Return unmodified item on error
        }
      });
    } catch (e) {
      console.error('Error mapping periods:', e);
    }
    
    // Sort by date
    try {
      processedData.sort((a, b) => {
        try {
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
            const dateA = parse(a.period, 'MMM yyyy', new Date(), { locale: ptBR });
            const dateB = parse(b.period, 'MMM yyyy', new Date(), { locale: ptBR });
            return dateA.getTime() - dateB.getTime();
          }
          // For yearly, just compare years
          else {
            return parseInt(a.period) - parseInt(b.period);
          }
        } catch (e) {
          console.error('Error in date comparison:', e, a, b);
          return 0; // Default to no change in case of error
        }
      });
    } catch (e) {
      console.error('Error sorting periods:', e);
    }
    
    console.log(`Returning ${processedData.length} processed data points`);
    
    return processedData;
  } catch (error) {
    console.error('Error processing data:', error);
    return [];
  }
} 
