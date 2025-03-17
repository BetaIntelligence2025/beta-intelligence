import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS, buildApiUrl, buildPaginationParams } from "@/app/config/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const allTypes = searchParams.get("allTypes") === "true";
    
    const params = buildPaginationParams(
      page, 
      limit, 
      sortBy, 
      sortDirection,
      allTypes ? "true" : undefined
    );
    
    const apiUrl = buildApiUrl(API_ENDPOINTS.USERS, params);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformar o formato de dados para o formato esperado pelo componente
    // Verificando se os dados já estão no formato correto ou se precisam ser transformados
    const transformedData = {
      users: Array.isArray(data.users) ? data.users : [],
      total: data.total || 0,
      page: data.page || parseInt(page),
      limit: data.limit || parseInt(limit),
      totalPages: data.totalPages || 1,
      sortBy: data.sortBy || sortBy,
      sortDirection: data.sortDirection || sortDirection
    };
    
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({
      users: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      sortBy: 'created_at',
      sortDirection: 'desc'
    }, { status: 500 });
  }
}