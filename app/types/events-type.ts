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
    fullname: string;
    email: string;
    phone: string;
    isClient: boolean;
    initialDeviceType: string;
  };
  profession: {
    profession_name: string;
  };
  product: {
    product_name: string;
  };
  funnel: {
    funnel_name: string;
    funnel_tag: string;
  };
  session: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
    country: string;
    state: string;
    city: string;
  };
}

export interface FetchEventsResponse {
  events: Event[]
  meta: {
    total: number
    page: number
    limit: number
    last_page: number
    profession_id?: number
    funnel_id?: number
  }
}

export interface EventsTableProps {
  result: FetchEventsResponse;
  isLoading: boolean;
  onSort: (columnId: string, direction: 'asc' | 'desc' | null) => void;
  currentPage: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
} 