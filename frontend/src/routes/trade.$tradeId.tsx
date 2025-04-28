import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ApiService } from '@/lib/api'
import { ReportDialog } from '@/components/ReportDialog'

export const Route = createFileRoute('/trade/$tradeId')({
  component: TradeDetail,
})

function TradeDetail() {
  const { tradeId } = Route.useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['tradeDetail', tradeId],
    queryFn: async () => {
      return ApiService.getInstance().getTradeDetail(tradeId)
    },
  })

  if (isLoading) return <p>Loading trade...</p>
  if (!data?.success) return <p>{data?.error || 'Trade not found'}</p>

  const trade = data.trade!

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Trade Detail</h1>
        <ReportDialog tradeId={trade.id} />
      </div>
      <div className="space-y-4">
        <p>Pokémon: {trade.pokemon.name}</p>
        <p>Type: {trade.type}</p>
        <p>Creator: {trade.owner.username}</p>
        <p>
          {trade.type === 'money'
            ? `Price: $${trade.amount_asked}`
            : `Preferences: ${trade.trade_preferences}`}
        </p>
      </div>
    </div>
  )
}
