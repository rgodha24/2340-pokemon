import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { TradeRequest } from '@/lib/types'
import { ApiService } from '@/lib/api'

export const Route = createFileRoute('/incoming-trades')({
  component: IncomingTradesPage,
})

function IncomingTradesPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['incomingTrades'],
    queryFn: async () => ApiService.getInstance().getIncomingTrades(),
  })

  const respondTrade = useMutation({
    mutationFn: async ({
      tradeId,
      action,
    }: {
      tradeId: number
      action: 'accept' | 'decline'
    }) => ApiService.getInstance().respondTradeRequest(tradeId, action),
    onSuccess: () => {
      toast.success('Trade updated!')
      queryClient.invalidateQueries({ queryKey: ['incomingTrades'] })
    },
    onError: () => {
      toast.error('Failed to respond to trade')
    },
  })

  if (isLoading) return <p>Loading incoming trades...</p>

  if (!data?.success) return <p>Failed to load incoming trades.</p>

  const trades: TradeRequest[] = data.trades

  if (trades.length === 0) {
    return <p>No incoming trade requests.</p>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Incoming Trade Requests</h1>

      {trades.map((trade) => (
        <div key={trade.id} className="border p-4 rounded shadow space-y-2">
          <p>
            <strong>From:</strong> {trade.sender.username}
          </p>
          <p>
            <strong>Offering:</strong> {trade.sender_pokemon.name}
          </p>
          <p>
            <strong>For your:</strong> {trade.receiver_pokemon.name}
          </p>

          {trade.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  respondTrade.mutate({ tradeId: trade.id, action: 'accept' })
                }
                disabled={respondTrade.isPending}
              >
                Accept
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  respondTrade.mutate({ tradeId: trade.id, action: 'decline' })
                }
                disabled={respondTrade.isPending}
              >
                Decline
              </Button>
            </div>
          )}

          {trade.status !== 'pending' && (
            <p className="text-sm italic">Already {trade.status}</p>
          )}
        </div>
      ))}
    </div>
  )
}

