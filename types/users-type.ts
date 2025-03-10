export interface User {
    userId: string
    fullname: string
    email: string
    phone: string
    isClient: boolean
    initialDeviceType: string
    initialProfession: string
    initialFunnel: string
    initialUtmMedium: string
    initialUtmSource: string
    initialUtmCampaign: string
    initialUtmContent: string
    initialUtmTerm: string
    initialCountryCode: string
    initialStateCode: string
    initialCityCode: string
    fbc: string
    fbp: string
    is_recent: boolean
    created_at: string
    updated_at: string
}

export interface FetchUserResponse {
    users: User[]
    total: number
    page: number
    limit: number
    totalPages: number
}