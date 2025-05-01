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
  // Properties for purchase events
  event_propeties?: {
    value: string;
    order_id: string;
    order_bump: string;
    checkout_id: string;
    final_value: string;
    installments: string;
    interest_fee: string;
    product_name: string;
    product_type: string;
    payment_method: string;
    origem_slug_ltp: string;
    payment_gateway: string;
    presented_upsell: string;
    firepay_product_id: string;
    presented_orderbump: string;
    origem_description_ltp: string;
  };
  // Direct location properties
  initialCountry?: string;
  initialRegion?: string;
  initialCity?: string;
  initialDeviceType?: string;
  initialCountryCode?: string;
  initialZip?: string;
  initialIp?: string;
  user: {
    fullname: string;
    email: string;
    phone: string;
    isClient: boolean;
    initialDeviceType?: string;
    initialUtmSource?: string;
    initialUtmMedium?: string;
    initialUtmCampaign?: string;
    initialUtmContent?: string;
    initialUtmTerm?: string;
    initialCountry?: string;
    initialRegion?: string;
    initialCity?: string;
    initialCountryCode?: string;
    initialZip?: string;
    initialIp?: string;
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
    country_code?: string;
    zip?: string;
    ip?: string;
    // Additional session fields from API response
    session_id?: string;
    isActive?: boolean;
    sessionStart?: string;
    lastActivity?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    duration?: number;
  };
  // Direct UTM properties
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  // Structured UTM data
  utm_data?: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
  };
  // Session UTMs from API
  session_utms?: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
  };
  // Survey data direct on event object
  survey_name?: string;
  survey?: Survey;
  survey_response?: SurveyResponse;
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

// Enumeração para o campo "faixa"
export type SurveyFaixa = "A" | "B" | "C";

export interface Survey {
  survey_id: number;  // INT8 no banco, number no TypeScript
  survey_name: string;
  funnel_id: number;
  created_at: string;
  updated_at: string;
  responses?: SurveyResponse[];
}

export interface SurveyResponse {
  id: string;  // UUID
  survey_id: number;
  event_id: string;  // UUID
  total_score: number;
  completed: boolean;
  created_at: string;
  faixa: SurveyFaixa;
  survey?: Survey;
  answers: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: string;  // UUID
  survey_response_id: string;  // UUID
  question_id: string;
  question_text: string;
  value: string;
  score: number;
  time_to_answer: number;
  changed: boolean;
  timestamp: string;
} 