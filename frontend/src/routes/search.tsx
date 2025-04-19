import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import TradeCard from '../TradeCard'

export default function SearchMarketplace() {
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('')
  const [ptype, setType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['searchMarket', query, rarity, ptype],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (rarity) params.append('rarity', rarity)
      if (ptype) params.append('type', ptype)

      const res = await fetch(`/api/marketplace/filter/?${params.toString()}`)
      return res.json()
    },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Search Marketplace</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          placeholder="Search Pokémon"
          className="border px-4 py-2 rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">All Rarities</option>
          <option value="1">★☆☆☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="3">★★★☆☆</option>
          <option value="4">★★★★☆</option>
          <option value="5">★★★★★</option>
        </select>
        <select value={ptype} onChange={(e) => setType(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">All Types</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="grass">Grass</option>
          <option value="electric">Electric</option>
          {/* Add more types as needed */}
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : data?.results?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.results.map((t: any) => (
            <TradeCard
              key={t.id}
              trade={{
                pokemon: { name: t.name, imageUrl: t.image_url },
                creator: t.owner,
                type: t.money_trade ? 'money' : 'barter',
                amount: t.money_trade?.amount_asked,
                description: t.barter_trade?.trade_preferences,
                id: t.id,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No Pokémon match your criteria</p>
      )}
    </div>
  )
}
