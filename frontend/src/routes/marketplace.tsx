import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import TradeCard from '@/components/TradeCard';

export const Route = createFileRoute('/marketplace')({
  component: Marketplace,
})

function Marketplace() {
    const { data: trades } = useQuery({
      queryKey: ['trades'],
      queryFn: () => fetch('/api/marketplace/trades').then(res => res.json())
    });
  
    return (
      <div>
        <h1>Marketplace</h1>
        <div className="grid grid-cols-3 gap-4">
          {trades?.map((trade: any) => (
            <TradeCard key={trade.id} trade={trade} />
          ))}
        </div>
      </div>
    );
}