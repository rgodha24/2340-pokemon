import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

const searchSchema = z.object({
  q: z.string().optional(),
  rarity: z.enum(['1', '2', '3', '4', '5', '']).default(''),
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.results.map((t) => (
            <div key={t.id} className="w-full">
              <div className="w-full overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-4">
                    {t.image_url ? (
                      <img
                        src={t.image_url}
                        alt={t.name}
                        className="w-full max-w-[120px] h-auto object-contain"
                      />
                    ) : (
                      <div className="w-[120px] h-[120px] bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="md:w-2/3 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold capitalize">{t.name}</h3>
                      <p className="text-yellow-500">
                        {'★'.repeat(t.rarity || 0)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.types?.map((type: string) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <p>
                        Owner:{' '}
                        <span className="font-medium">{t.owner.username}</span>
                      </p>
                      {t.money_trade ? (
                        <p className="font-semibold text-green-700">
                          Price: ${t.money_trade.amount_asked}
                        </p>
                      ) : t.barter_trade ? (
                        <p className="text-indigo-700">
                          Trading for:{' '}
                          {t.barter_trade.trade_preferences || 'Open to offers'}
                        </p>
                      ) : null}
                    </div>
                    <a
                      href={`/pokemon/${t.id}`}
                      className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No Pokémon match your criteria</p>
      )}
    </div>
  )
}
