export interface Event {
  event_id: string;
  event_name: string;
  pageview_id: string;
  session_id: string;
  event_time: string;
  user_id: string;
  profession_id: number;
  product_id: number;
  funnel_id: number;
  event_source: string;
  event_type: string;
  user: {
    phone: string;
    fullname: string;
    email: string;
    isClient: boolean;
  }
}

export interface FetchEventsResponse {
  events: Event[];
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}

export interface EventsTableProps {
  result: FetchEventsResponse;
  isLoading: boolean;
  onSort: (columnId: string, direction: 'asc' | 'desc' | null) => void;
  currentPage: number;
  totalResults: Event[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
} 