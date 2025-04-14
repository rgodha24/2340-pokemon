//backend
export interface User {
  id: string
  username: string
  money: number
}

export interface MoneyTrade {
  id: string
  owner_id: string
  amount_asked: number
  status: boolean
}

export interface BarterTrade {
  id: number
  owner_id: string
  trade_preferences: string
  status: boolean
}

export interface Pokemon {
  id: number
  name: string
  // for when you're trying to sell a pokemon
  trade?: MoneyTrade | BarterTrade
  // for when you're offering this pokemon to someone else in a barter trade
  offering_to?: BarterTrade
  rarity: number
  image_url: string
  types: string[]
}
