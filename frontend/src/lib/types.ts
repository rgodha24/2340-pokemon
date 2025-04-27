export interface User {
  id: number
  username: string
  email?: string
  is_staff: boolean
}

export interface Profile {
  id: number
  user: User
  money: number
}

export interface Pokemon {
  id: number
  user: User
  pokeapi_id: number
  name: string
  rarity: number
  image_url?: string
  types: string[]
  offered_in_trade?: BarterTrade
}

export interface Trade {
  id: number
  pokemon__name: string
  buyer__username: string
  seller__username: string
  amount: number
  timestamp: string
  is_flagged: boolean
  admin_notes?: string
}

export interface TradeHistory {
  id: number
  buyer: User
  seller: User
  pokemon: Pokemon | null
  amount: number
  timestamp: string
  admin_notes?: string
  is_flagged: boolean
  flag_reason?: string
}

export interface Notification {
  id: number
  user: User
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface MoneyTrade {
  id: number
  pokemon: Pokemon
  amount_asked: number
  status: 'active' | 'completed' | 'flagged' | 'removed'
  is_flagged: boolean
  flag_reason?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  owner: User
}

export interface BarterTrade {
  id: number
  pokemon: Pokemon
  trade_preferences: string
  status: 'active' | 'completed' | 'flagged' | 'removed'
  is_flagged: boolean
  flag_reason?: string
  admin_notes?: string
  created_at: string
  updated_at: string
  owner: User
}

export interface Report {
  id: number
  trade_type: 'money' | 'barter'
  trade_id: number
  reporter: string
  reason: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at: string | null
  admin_notes: string | null
}

export interface TradeReport {
  id: number
  reporter: User
  reason: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  admin_notes?: string
  created_at: string
  resolved_at?: string
  resolved_by?: User
  money_trade?: MoneyTrade
  barter_trade?: BarterTrade
}

export interface DashboardData {
  active_trades: number
  flagged_trades: number
  pending_reports: number
  recent_trades: Trade[]
}
export interface TradeRequest {
  id: number
  sender: { id: number; username: string }
  receiver: { id: number; username: string }
  sender_pokemon: { id: number; name: string }
  receiver_pokemon: { id: number; name: string }
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface FeaturedPokemon {
  id: number
  pokeapi_id: number
  name: string
  rarity: number
  image_url: string
  types: string[]
  owner: {
    id: number
    username: string
  }
  money_trade: {
    id: number
    amount_asked: number
  } | null
  barter_trade: {
    id: number
    trade_preferences: string
  } | null
}

export interface FeaturedPokemonResponse {
  success: boolean
  featured_pokemon: FeaturedPokemon[]
}

export interface UserProfile {
  id: number
  username: string
  collection: {
    id: number
    name: string
    image_url: string
    rarity: number
    types: string[]
  }[]
}

export type PokemonDetailResponse = {
  id: number
  success: boolean
  pokeapi_id: number
  name: string
  rarity: number
  image_url: string
  types: string[]
  owner: {
    id: number
    username: string
  }
  is_owner: boolean
  money_trade?: {
    id: number
    amount_asked: number
  } | null
  barter_trade?: {
    id: number
    trade_preferences: string
  } | null
  pokemon: Pokemon
}

