import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/$username')({
  component: RouteComponent,
  loader: async ({ params: { username } }) => {
    const res = await fetch(`/api/user/${username}`)
    return await res.json()
  },
})

function RouteComponent() {
  const data = Route.useLoaderData()

  if (!data.success) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold">Error</h1>
        <p>{data.error}</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        {data.user.username}'s Profile
      </h1>

      <h2 className="text-xl font-semibold mt-6 mb-2">Pokémon Collection</h2>
      {data.pokemon.length === 0 ? (
        <p>No Pokémon yet!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.pokemon.map((pokemon) => (
            <div key={pokemon.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-lg">{pokemon.name}</h3>
              <p className="text-sm text-gray-500">ID: {pokemon.pokeapi_id}</p>

              {(pokemon.money_trades.length > 0 ||
                pokemon.barter_trades.length > 0) && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Active Trades:</p>
                  <ul className="text-xs pl-4">
                    {pokemon.money_trades.map((trade) => (
                      <li key={`money-${trade.id}`}>
                        Money trade: ${trade.amount_asked}
                      </li>
                    ))}
                    {pokemon.barter_trades.map((trade) => (
                      <li key={`barter-${trade.id}`}>
                        Barter trade: {trade.trade_preferences}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mt-6 mb-2">Open Trades</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Money Trades</h3>
          {data.open_trades.money_trades.length === 0 ? (
            <p>No open money trades</p>
          ) : (
            <ul className="space-y-2">
              {data.open_trades.money_trades.map((trade) => (
                <li key={trade.id} className="border rounded p-3">
                  <p>
                    <span className="font-medium">{trade.pokemon__name}</span>{' '}
                    for ${trade.amount_asked}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Barter Trades</h3>
          {data.open_trades.barter_trades.length === 0 ? (
            <p>No open barter trades</p>
          ) : (
            <ul className="space-y-2">
              {data.open_trades.barter_trades.map((trade) => (
                <li key={trade.id} className="border rounded p-3">
                  <p>
                    <span className="font-medium">{trade.pokemon__name}</span>
                  </p>
                  <p className="text-sm">
                    Looking for: {trade.trade_preferences}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
