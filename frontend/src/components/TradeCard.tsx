import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/TradeCard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/TradeCard"!</div>
}
interface Trade {
    pokemon: {
      name: string;
      imageUrl?: string;
    };
    creator: {
      username: string;
      id?: string;
    };
    type: 'money' | 'barter';
    amount?: number;
    description?: string;
    id?: string;
  }
  
  export default function TradeCard({ trade }: { trade: Trade }) {
    return (
      <div className="border p-4 rounded-lg">
        <h3 className="font-bold">{trade.pokemon.name}</h3>
        <p>Seller: {trade.creator.username}</p>
        {trade.type === 'money' ? (
          <p>Price: ${trade.amount}</p>
        ) : (
          <p>Trade for: {trade.description}</p>
        )}
        <button className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
          View Details
        </button>
      </div>
    );
  }