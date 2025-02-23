export interface User {
    userId: string
    phone: string
    fbc: string
    fbp: string
    createdAt: string // ISO date string
    isRecent: boolean
    fullname: string
    initialCountry: string
    initialCountryCode: string
    initialRegion: string
    initialCity: string
    initialZip: string
    initialIp: string
    initialUserAgent: string
    initialReferrer: string
    initialTimezone: string
    isIdentified: boolean
    initialDeviceType: string
    initialPlatform: string
    initialBrowser: string
    initialLandingPage: string
    initialMarketingChannel: string
    initialProfession: string
    initialFunnel: string
    isClient: boolean
    initialUtmSource: string
    initialUtmMedium: string
    initialUtmCampaign: string
    initialUtmContent: string
    initialUtmTerm: string
    initialLandingSpecialPath: string
    initialReferrerDomain: string
    initialReferrerQuery: string
    initialReferrerHostname: string
    initialReferrerPath: string
  }
  
  export interface FetchUserResponse {
    users: User[]
    total: number
    page: number
    limit: number
    totalPages: number
  }