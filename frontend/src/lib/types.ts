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

export interface TradeRequest {
  id: number;
  sender: { id: number; username: string };
  receiver: { id: number; username: string };
  sender_pokemon: { id: number; name: string };
  receiver_pokemon: { id: number; name: string };
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  collection: {
    id: number;
    name: string;
    image_url: string;
    rarity: number;
    types: string[];
  }[];
}

export type PokemonDetailResponse = {
  id: number;
  pokeapi_id: number;
  name: string;
  rarity: number;
  image_url: string;
  types: string[];
  owner: {
    id: number;
    username: string;
  };
  is_owner: boolean;
  money_trade?: {
    id: number;
    amount_asked: number;
  } | null;
  barter_trade?: {
    id: number;
    trade_preferences: string;
  } | null;
};