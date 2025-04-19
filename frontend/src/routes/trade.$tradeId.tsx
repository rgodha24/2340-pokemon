import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/trade/$tradeId')({
  component: TradeDetail,
})

function TradeDetail() {
  const { tradeId } = Route.useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['tradeDetail', tradeId],
    queryFn: async () => {
      const res = await fetch(`/api/trade/${tradeId}/`)
      return res.json()
    },
  })

  if (isLoading) return <p>Loading trade...</p>
  if (!data?.success) return <p>{data?.error || 'Trade not found'}</p>

  const trade = data.trade

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Trade Detail</h1>
      <p className="mt-4">Pokémon: {trade.pokemon.name}</p>
      <p>Type: {trade.type}</p>
      <p>Creator: {trade.owner.username}</p>
      <p>
        {trade.type === 'money'
          ? `Price: $${trade.amount_asked}`
          : `Preferences: ${trade.trade_preferences}`}
      </p>
    </div>
  )
}
