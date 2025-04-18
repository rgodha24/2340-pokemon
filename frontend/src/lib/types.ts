//backend
export interface User {
  id: string
  username: string
  money: number
}

export interface MoneyTrade {
  id: string | number
  amount_asked: number
  status: string
}

export interface BarterTrade {
  id: string | number
  trade_preferences: string
  status: string
}

export interface Pokemon {
  id: number
  name: string
  pokeapi_id?: number
  owner?: {
    id: string | number
    username: string
  }
  is_owner?: boolean
  // Current trades
  money_trade?: MoneyTrade | null
  barter_trade?: BarterTrade | null
  // Legacy fields for compatibility
  trade?: MoneyTrade | BarterTrade
  offering_to?: BarterTrade
  rarity: number
  image_url: string
  types: string[]
}
