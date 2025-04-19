import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import TradeCard from '@/components/TradeCard'

const searchSchema = z.object({
  q: z.string().optional(),
  rarity: z.enum(['1', '2', '3', '4', '5']).optional(),
  type: z.enum(['fire', 'water', 'grass', 'electric', '']).optional(),
})

type SearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/search')({
  validateSearch: zodValidator(searchSchema),
  component: SearchMarketplace,
})

export default function SearchMarketplace() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const { data, isLoading } = useQuery({
    queryKey: ['searchMarket', search.q, search.rarity, search.type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.q) params.append('q', search.q)
      if (search.rarity) params.append('rarity', search.rarity)
      if (search.type) params.append('type', search.type)

      const res = await fetch(`/api/marketplace/filter/?${params.toString()}`)
      return res.json()
    },
  })

  const update = (patch: Partial<SearchParams>) =>
    navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
    })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Search Marketplace</h1>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          placeholder="Search Pokémon"
          className="border px-4 py-2 rounded"
          value={search.q ?? ''}
          onChange={(e) => update({ q: e.target.value })}
        />
        <select
          className="border px-3 py-2 rounded"
          value={search.rarity ?? ''}
          onChange={(e) => update({ rarity: e.target.value as any })}
        >
          <option value="">All Rarities</option>
          <option value="1">★☆☆☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="3">★★★☆☆</option>
          <option value="4">★★★★☆</option>
          <option value="5">★★★★★</option>
        </select>
        <select
          className="border px-3 py-2 rounded"
          value={search.type ?? ''}
          onChange={(e) => update({ type: e.target.value as any })}
        >
          <option value="">All Types</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="grass">Grass</option>
          <option value="electric">Electric</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : data?.results?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.results.map((t) => (
            <TradeCard
              key={t.id}
              trade={{
                pokemon: {
                  name: t.name,
                  imageUrl: t.image_url,
                  id: t.id,
                },
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
