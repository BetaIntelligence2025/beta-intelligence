interface GeneralMetrics {
  totalUsers: number;
  activeUsers: number;
  totalProfessionals: number;
  activeProfessionals: number;
}

interface ProfessionalMetrics {
  totalAppointments: number;
  completedAppointments: number;
  averageRating: number;
  totalRevenue: number;
}

export async function getGeneralMetrics(): Promise<GeneralMetrics> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/general`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch general metrics');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching general metrics:', error);
    throw error;
  }
}

export async function getProfessionalMetrics(): Promise<ProfessionalMetrics> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/professional`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch professional metrics');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching professional metrics:', error);
    throw error;
  }
}

export async function getMetricHistory(metric: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/history/${metric}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history for metric: ${metric}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching history for metric ${metric}:`, error);
    throw error;
  }
} 