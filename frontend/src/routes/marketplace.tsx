import { createFileRoute } from '@tanstack/react-router'
import TradeCard from './TradeCard'

export const Route = createFileRoute('/marketplace')({
  component: MarketplaceComponent,
  loader: async () => {
    const res = await fetch('/api/marketplace/trades')
    return await res.json()
  },
})

function MarketplaceComponent() {
  const data = Route.useLoaderData()

  if (!data.success) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Error Loading Marketplace</h1>
        <p>{data.error}</p>
      </div>
    )
  }

  const moneyTrades = data.trades.filter(t => t.type === 'money')
  const barterTrades = data.trades.filter(t => t.type === 'barter')

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Pokémon Marketplace</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Money Trades</h2>
          {moneyTrades.length === 0 ? (
            <p className="text-gray-500">No money trades available</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {moneyTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Barter Trades</h2>
          {barterTrades.length === 0 ? (
            <p className="text-gray-500">No barter trades available</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {barterTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
