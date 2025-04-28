import type {
  Pokemon,
  Trade,
  TradeHistory,
  Notification,
  Report,
  DashboardData,
  TradeRequest,
  FeaturedPokemon,
  FeaturedPokemonResponse,
  PokemonDetailResponse,
} from './types'

import type {
  UserResponse,
  LoginCredentials,
  SignupCredentials,
  AuthResponse,
} from './auth'

// Define parameter types if they are not already in types.ts or auth.ts
interface ManageTradeParams {
  type: 'money' | 'barter' // Assuming only these two types
  id: number
  action: 'flag' | 'unflag' | 'remove' // Based on admin.tsx
  reason?: string
  admin_notes?: string
}

interface ManageReportParams {
  id: number
  status: Report['status']
  notes?: string // Corresponds to admin_notes in the API call
}

interface SendTradeRequestParams {
  receiver_id: number
  receiver_pokemon_id: number
  sender_pokemon_id: number
}

interface CreateMoneyTradeParams {
  pokemonId: number
  amount_asked: number
}

interface CreateBarterTradeParams {
  pokemonId: number
  trade_preferences: string
}

// Define specific response types if not fully covered or need refinement
interface AdminReportsResponse {
  reports: Report[]
  total_pages: number
  current_page: number
}

interface AdminActivityResponse {
  trades: Trade[] // Assuming Trade type fits here
}

interface MyPokemonResponse {
  success: boolean
  pokemon: { id: number; name: string }[]
}

interface IncomingOffersResponse {
  success: boolean
  trades: {
    id: number
    sender_username: string
    sender_pokemon_name: string
    // Add other fields if needed based on API response
  }[]
}

interface CancelTradeResponse {
  success: boolean
  message: string
}

interface BuyPokemonResponse {
  success: boolean
  message: string
  pokemon: {
    id: number
    name: string
    previous_owner: string
  }
  money_remaining: number
  error?: string
}

interface SendTradeResponse {
  success: boolean
  trade_id?: number // Optional because it might fail
  error?: string
}

interface RespondTradeResponse {
  success: boolean
  new_status?: TradeRequest['status'] // Optional on failure
  error?: string
}

interface CreateTradeResponse {
  success: boolean
  trade?: {
    id: number
    amount_asked?: number // For money trade
    trade_preferences?: string // For barter trade
    pokemon_id: number
  }
  error?: string
}

interface PasswordResetResponse {
  success: boolean
  message?: string
  error?: string
}

interface SearchMarketplaceParams {
  q?: string
  rarity?: '1' | '2' | '3' | '4' | '5' | ''
  type?: 'fire' | 'water' | 'grass' | 'electric' | '' // Add other types if needed
}

interface SearchMarketplaceResponse {
  success: boolean
  // Assuming results match FeaturedPokemon structure based on search.tsx usage
  results: FeaturedPokemon[]
  error?: string
}

// Simplified Trade Detail type based on trade.$tradeId.tsx usage
// Needs refinement based on actual API response structure
interface TradeDetail {
  id: number
  pokemon: { name: string }
  type: 'money' | 'barter'
  owner: { username: string }
  amount_asked?: number
  trade_preferences?: string
}

interface TradeDetailResponse {
  success: boolean
  trade?: TradeDetail
  error?: string
}

// Type based on user.$username.tsx loader and component usage
interface UserProfileResponse {
  success: boolean
  user: {
    id: number
    username: string
    money: number
  }
  pokemon?: (Pokemon & {
    // Augmenting Pokemon type based on usage
    money_trade: { id: number; amount_asked: number } | null
    barter_trade: { id: number; trade_preferences: string } | null
  })[]
  open_trades?: {
    money_trades: { id: number; amount_asked: number; pokemon__name: string }[]
    barter_trades: {
      id: number
      trade_preferences: string
      pokemon__name: string
    }[]
  }
  error?: string
}

interface BasicSuccessResponse {
  success: boolean
  error?: string
}

interface ChatbotResponse {
  success: boolean
  reply?: string
  error?: string
}

export class ApiService {
  private static instance: ApiService | null = null
  private baseUrl: string = '/api' // Base URL for API endpoints

  // Private constructor ensures singleton pattern
  private constructor() {}

  // Static method to get the single instance
  public static getInstance(): ApiService {
    if (ApiService.instance === null) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  // Private helper method for making fetch requests
  private async _request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeCredentials = false, // Flag to include credentials
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      // Add other default headers if needed, e.g., 'Accept': 'application/json'
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    // Include credentials if specified
    if (includeCredentials) {
      config.credentials = 'include'
    }

    try {
      const response = await fetch(url, config)

      // Attempt to parse JSON regardless of status code initially
      // to potentially get error details from the body
      let responseData: any
      try {
        responseData = await response.json()
      } catch (jsonError) {
        // Handle cases where response is not JSON or empty
        if (!response.ok) {
          // If fetch failed and JSON parsing failed, throw generic error
          throw new Error(
            `HTTP error ${response.status}: ${response.statusText}`,
          )
        }
        // If fetch was ok but no JSON body, might be acceptable for some requests (e.g., 204 No Content)
        // or might indicate an issue depending on the endpoint.
        // Let's assume for now successful non-JSON responses return null or handle specifically in calling methods if needed.
        responseData = null
      }

      if (!response.ok) {
        // Throw error using message from parsed JSON if available
        const errorMessage =
          responseData?.error ||
          responseData?.message ||
          `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      return responseData as T
    } catch (error) {
      console.error(
        `API Request Error (${options.method || 'GET'} ${endpoint}):`,
        error,
      )
      // Re-throw the error so the caller can handle it (e.g., show toast)
      throw error
    }
  }

  // --- Authentication Methods ---

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this._request<AuthResponse>(
      '/login/',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
      true,
    ) // Login usually involves cookies/session
  }

  public async logout(): Promise<BasicSuccessResponse> {
    return this._request<BasicSuccessResponse>(
      '/logout/',
      {
        method: 'POST',
      },
      true,
    ) // Logout needs to clear session/cookie
  }

  public async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    return this._request<AuthResponse>('/signup/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  public async getUser(): Promise<UserResponse> {
    // Assuming user session is checked via cookie
    return this._request<UserResponse>('/user/', {}, true)
  }

  public async requestPasswordReset(
    email: string,
  ): Promise<PasswordResetResponse> {
    return this._request<PasswordResetResponse>('/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  // --- Pokemon & Marketplace Methods ---

  public async getFeaturedPokemon(): Promise<FeaturedPokemonResponse> {
    return this._request<FeaturedPokemonResponse>('/featured-pokemon/')
  }

  public async getPokemonDetail(
    pokemonId: string | number,
  ): Promise<PokemonDetailResponse> {
    return this._request<PokemonDetailResponse>(
      `/pokemon/${pokemonId}/`,
      {},
      true,
    )
  }

  public async searchMarketplace(
    params: SearchMarketplaceParams,
  ): Promise<SearchMarketplaceResponse> {
    const queryParams = new URLSearchParams()
    if (params.q) queryParams.append('q', params.q)
    if (params.rarity) queryParams.append('rarity', params.rarity)
    if (params.type) queryParams.append('type', params.type)
    return this._request<SearchMarketplaceResponse>(
      `/marketplace/filter/?${queryParams.toString()}`,
    )
  }

  public async filterMarketplace(
    params: SearchMarketplaceParams,
  ): Promise<SearchMarketplaceResponse> {
    // This seems identical to searchMarketplace based on api/views.py and search.tsx
    // Using the same implementation, adjust if distinct functionality is needed.
    const queryParams = new URLSearchParams()
    if (params.q) queryParams.append('q', params.q) // Assuming q might be used here too? Check API.
    if (params.rarity) queryParams.append('rarity', params.rarity)
    if (params.type) queryParams.append('type', params.type)
    // Add max_price if needed: if (params.max_price) queryParams.append('max_price', params.max_price);
    return this._request<SearchMarketplaceResponse>(
      `/marketplace/filter/?${queryParams.toString()}`,
    )
  }

  // --- User Profile & Collection Methods ---

  public async getUserProfile(username: string): Promise<UserProfileResponse> {
    return this._request<UserProfileResponse>(`/user/${username}`)
  }

  public async getMyPokemon(): Promise<MyPokemonResponse> {
    return this._request<MyPokemonResponse>('/my-pokemon/', {}, true)
  }

  // --- Trading Methods ---

  public async createMoneyTrade({
    pokemonId,
    amount_asked,
  }: CreateMoneyTradeParams): Promise<CreateTradeResponse> {
    return this._request<CreateTradeResponse>(
      `/pokemon/${pokemonId}/trade/money/`,
      {
        method: 'POST',
        body: JSON.stringify({ amount_asked }),
      },
      true,
    )
  }

  public async createBarterTrade({
    pokemonId,
    trade_preferences,
  }: CreateBarterTradeParams): Promise<CreateTradeResponse> {
    return this._request<CreateTradeResponse>(
      `/pokemon/${pokemonId}/trade/barter/`,
      {
        method: 'POST',
        body: JSON.stringify({ trade_preferences }),
      },
      true,
    )
  }

  public async cancelTradeListing(
    pokemonId: number,
  ): Promise<CancelTradeResponse> {
    return this._request<CancelTradeResponse>(
      `/pokemon/${pokemonId}/trade/cancel/`,
      {
        method: 'POST',
      },
      true,
    )
  }

  public async buyPokemon(pokemonId: number): Promise<BuyPokemonResponse> {
    return this._request<BuyPokemonResponse>(
      `/pokemon/${pokemonId}/buy/`,
      {
        method: 'POST',
      },
      true,
    )
  }

  public async sendTradeRequest(
    data: SendTradeRequestParams,
  ): Promise<SendTradeResponse> {
    return this._request<SendTradeResponse>(
      '/send-trade/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    )
  }

  public async respondTradeRequest(
    tradeId: number,
    action: 'accept' | 'decline',
  ): Promise<RespondTradeResponse> {
    return this._request<RespondTradeResponse>(
      `/respond-trade/${tradeId}/`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      },
      true,
    )
  }

  public async getIncomingTrades(): Promise<{
    success: boolean
    trades: TradeRequest[]
  }> {
    return this._request<{ success: boolean; trades: TradeRequest[] }>(
      '/incoming-trades/',
      {},
      true,
    )
  }

  public async getIncomingOffersForPokemon(
    pokemonId: number,
  ): Promise<IncomingOffersResponse> {
    return this._request<IncomingOffersResponse>(
      `/incoming-trades/${pokemonId}/`,
      {},
      true,
    )
  }

  public async getTradeHistory(): Promise<{
    success: boolean
    history: TradeHistory[]
  }> {
    // Assuming the endpoint is /marketplace/history/ based on api/urls.py
    return this._request<{ success: boolean; history: TradeHistory[] }>(
      '/marketplace/history/',
      {},
      true,
    )
  }

  public async getTradeDetail(
    tradeId: string | number,
  ): Promise<TradeDetailResponse> {
    // Assuming endpoint /api/trade/{tradeId}/ based on routes/trade.$tradeId.tsx queryFn
    // Note: This URL isn't explicitly listed in api/urls.py, might need adjustment.
    // Let's assume it exists for now.
    return this._request<TradeDetailResponse>(`/trade/${tradeId}/`)
  }

  // --- Notification Methods ---

  public async getNotifications(): Promise<{
    success: boolean
    notifications: Notification[]
  }> {
    return this._request<{ success: boolean; notifications: Notification[] }>(
      '/notifications/',
      {},
      true,
    )
  }

  public async markNotificationsRead(): Promise<BasicSuccessResponse> {
    return this._request<BasicSuccessResponse>(
      '/notifications/read/',
      {
        method: 'POST',
      },
      true,
    )
  }

  // --- Admin Methods ---

  public async getAdminDashboard(): Promise<DashboardData> {
    // Assuming admin actions require authenticated staff user (checked server-side)
    // We still send credentials if needed for session check
    return this._request<DashboardData>('/admin/dashboard/', {}, true)
  }

  public async getAdminReports(
    page: number,
    filter: string,
  ): Promise<AdminReportsResponse> {
    const queryParams = new URLSearchParams({ page: String(page) })
    if (filter) queryParams.append('status', filter)
    return this._request<AdminReportsResponse>(
      `/admin/reports/?${queryParams.toString()}`,
      {},
      true,
    )
  }

  public async getAdminActivity(
    days: number = 7,
  ): Promise<AdminActivityResponse> {
    return this._request<AdminActivityResponse>(
      `/admin/activity/?days=${days}`,
      {},
      true,
    )
  }

  public async manageTrade(
    params: ManageTradeParams,
  ): Promise<BasicSuccessResponse> {
    const { type, id, ...body } = params
    return this._request<BasicSuccessResponse>(
      `/admin/trade/${type}/${id}/`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true,
    )
  }

  public async manageReport(
    params: ManageReportParams,
  ): Promise<BasicSuccessResponse> {
    const { id, status, notes } = params
    return this._request<BasicSuccessResponse>(
      `/admin/report/${id}/`,
      {
        method: 'POST',
        body: JSON.stringify({ status, admin_notes: notes }), // Match API expected body
      },
      true,
    )
  }

  // --- Chatbot Method ---
  public async chatbotChat(prompt: string): Promise<ChatbotResponse> {
    return this._request<ChatbotResponse>('/chat/', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
  }
}
