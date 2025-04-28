import { ApiService } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

export default function TradeHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['tradeHistory'],
    queryFn: async () => {
      return ApiService.getInstance().getTradeHistory()
    },
  })

  if (isLoading) return <p>Loading history...</p>
  if (!data?.success) return <p>Failed to load history</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Trade History</h1>
      {data.history.length === 0 ? (
        <p>No past trades found.</p>
      ) : (
        <ul className="space-y-4">
          {data.history.map((h: any, i: number) => (
            <li key={i} className="border p-4 rounded shadow">
              <p>
                <strong>{h.pokemon_name}</strong> (Trade ID: {h.id})
              </p>
              <p>
                {h.buyer === h.currentUser
                  ? `You bought it from ${h.seller}`
                  : `You sold it to ${h.buyer}`}
              </p>
              <p>Amount: ${h.amount}</p>
              <p className="text-gray-500 text-sm">
                Date: {new Date(h.timestamp).toLocaleString()}
              </p>
              {h.trade_ref_id && (
                <p>
                  <Link
                    to="/trade/$tradeId"
                    params={{ tradeId: String(h.trade_ref_id) }}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    View Trade Details
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
