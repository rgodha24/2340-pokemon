import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

interface Trade {
  pokemon: {
    name: string
    imageUrl?: string
    id: string
  }
  creator: {
    username: string
    id?: string
  }
  type: 'money' | 'barter'
  amount?: number
  description?: string
  id?: string
}

export default function TradeCard({ trade }: { trade: Trade }) {
  return (
    <div className="border p-4 rounded-lg">
      <h3 className="font-bold">{trade.pokemon.name}</h3>
      <p>Seller: {trade.creator.username}</p>
      {trade.type === 'money' ? (
        <p>Price: ${trade.amount}</p>
      ) : (
        <p>Trade for: {trade.description}</p>
      )}
      <Button asChild>
        <Link to="/pokemon/$pokemonId" params={{ pokemonId: trade.pokemon.id }}>
          View Details
        </Link>
      </Button>
    </div>
  )
}
