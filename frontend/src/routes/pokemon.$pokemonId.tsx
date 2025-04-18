import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useUser } from '@/lib/auth'
import type { Pokemon, User } from '@/lib/types'
import { toast } from 'sonner'

export const Route = createFileRoute('/pokemon/$pokemonId')({
  component: PokemonDetailComponent,
  loader: async ({ params }) => {
    const res = await fetch(`/api/pokemon/${params.pokemonId}/`)
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to load Pokemon details')
    }

    return data.pokemon as Pokemon & {
      is_owner: boolean
      owner: { id: string; username: string }
      types: string[]
      money_trade: { id: string; amount_asked: number; status: string } | null
      barter_trade: {
        id: string
        trade_preferences: string
        status: string
      } | null
    }
  },
})

interface PokemonDetailProps {
  pokemon: Pokemon
  isOwner: boolean
}

function TradesList({ pokemon, isOwner }: PokemonDetailProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: userData } = useUser()
  const user = userData?.user as User | undefined
  const isAuthenticated = !!userData?.isAuthenticated
  
  const cancelTrade = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pokemon/${pokemon.id}/trade/cancel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel trade')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Trade canceled successfully!')
      queryClient.invalidateQueries({ queryKey: ['pokemonDetail', pokemon.id.toString()] })
      navigate({ to: `/pokemon/${pokemon.id}` })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel trade')
    },
  })

  const buyPokemon = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pokemon/${pokemon.id}/buy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to buy Pokemon')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pokemon purchased successfully!')
      queryClient.invalidateQueries({ queryKey: ['pokemonDetail', pokemon.id.toString()] })
      queryClient.invalidateQueries({ queryKey: ['userData'] })
      navigate({ to: `/pokemon/${pokemon.id}` })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to buy Pokemon')
    },
  })

  const handleCancelTrade = () => {
    if (confirm('Are you sure you want to cancel this trade?')) {
      cancelTrade.mutate()
    }
  }
  
  const handleBuyPokemon = () => {
    if (confirm(`Are you sure you want to buy ${pokemon.name} for $${pokemon.money_trade?.amount_asked}?`)) {
      buyPokemon.mutate()
    }
  }

  // Check if user can afford the Pokemon
  const canAfford = user && pokemon.money_trade 
    ? user.money >= pokemon.money_trade.amount_asked
    : false

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Current Trade Status</h2>
      {pokemon.money_trade && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Money Trade</CardTitle>
            <CardDescription>This Pokemon is listed for sale</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold">
                  Price: ${pokemon.money_trade.amount_asked}
                </p>
                {isAuthenticated && !isOwner && user && (
                  <p className={`text-sm mt-1 ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                    Your balance: ${user.money}
                  </p>
                )}
              </div>
              {isOwner ? (
                <Button 
                  variant="destructive" 
                  onClick={handleCancelTrade}
                  disabled={cancelTrade.isPending}
                  size="sm"
                >
                  {cancelTrade.isPending ? "Deleting..." : "Delete Trade"}
                </Button>
              ) : (
                isAuthenticated && (
                  <Button
                    variant="default"
                    onClick={handleBuyPokemon}
                    disabled={buyPokemon.isPending || !canAfford}
                    size="sm"
                  >
                    {buyPokemon.isPending 
                      ? "Processing..." 
                      : canAfford 
                        ? "Buy Pokemon" 
                        : "Insufficient Funds"}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pokemon.barter_trade && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Barter Trade</CardTitle>
            <CardDescription>
              This Pokemon is available for trade
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">Trade Preferences:</h3>
                <p className="mt-2">
                  {pokemon.barter_trade.trade_preferences ||
                    'No specific preferences'}
                </p>
              </div>
              {isOwner && (
                <Button 
                  variant="destructive" 
                  onClick={handleCancelTrade}
                  disabled={cancelTrade.isPending}
                  size="sm"
                  className="ml-4 self-start"
                >
                  {cancelTrade.isPending ? "Deleting..." : "Delete Trade"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!pokemon.money_trade && !pokemon.barter_trade && (
        <p className="text-gray-500">
          This Pokemon is not currently listed for trade.
        </p>
      )}
    </div>
  )
}

function TradeDialogs({ pokemon }: { pokemon: Pokemon }) {
  const [moneyAmount, setMoneyAmount] = useState('')
  const [tradePreferences, setTradePreferences] = useState('')
  const [moneyDialogOpen, setMoneyDialogOpen] = useState(false)
  const [barterDialogOpen, setBarterDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const createMoneyTrade = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pokemon/${pokemon.id}/trade/money/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount_asked: parseInt(moneyAmount) }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create trade')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Money trade created successfully!')
      setMoneyDialogOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['pokemonDetail', pokemon.id.toString()],
      })
      navigate({ to: `/pokemon/${pokemon.id}` })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create trade')
    },
  })

  const createBarterTrade = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pokemon/${pokemon.id}/trade/barter/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trade_preferences: tradePreferences }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create trade')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Barter trade created successfully!')
      setBarterDialogOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['pokemonDetail', pokemon.id.toString()],
      })
      navigate({ to: `/pokemon/${pokemon.id}` })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create trade')
    },
  })

  const handleMoneyTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!moneyAmount || parseInt(moneyAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    createMoneyTrade.mutate()
  }

  const handleBarterTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createBarterTrade.mutate()
  }

  return (
    <div className="mt-6 flex space-x-4">
      <Dialog open={moneyDialogOpen} onOpenChange={setMoneyDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default">Sell for Money</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell {pokemon.name} for Money</DialogTitle>
            <DialogDescription>
              Set a price for your Pokemon. Other users will be able to purchase
              it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoneyTradeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Price
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value)}
                  min="1"
                  className="col-span-3"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMoneyTrade.isPending}>
                {createMoneyTrade.isPending ? 'Creating...' : 'Create Trade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={barterDialogOpen} onOpenChange={setBarterDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Offer for Trade</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trade {pokemon.name}</DialogTitle>
            <DialogDescription>
              Describe what you'd like to receive in return for your Pokemon.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBarterTradeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="preferences" className="text-right">
                  Trade Preferences
                </Label>
                <Textarea
                  id="preferences"
                  value={tradePreferences}
                  onChange={(e) => setTradePreferences(e.target.value)}
                  className="col-span-3"
                  placeholder="Describe what you'd like in return"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createBarterTrade.isPending}>
                {createBarterTrade.isPending ? 'Creating...' : 'Create Trade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PokemonDetailComponent() {
  const pokemon = Route.useLoaderData()
  const { data: userData } = useUser()
  const isAuthenticated = userData?.isAuthenticated

  // Display rarity as stars
  const rarityStars = '★'.repeat(pokemon.rarity)

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-6">
            {pokemon.image_url ? (
              <img
                src={pokemon.image_url}
                alt={pokemon.name}
                className="w-full max-w-[250px] h-auto"
              />
            ) : (
              <div className="w-[250px] h-[250px] bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No Image</span>
              </div>
            )}
          </div>

          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold capitalize">
                  {pokemon.name}
                </h1>
                <p className="text-yellow-500 text-xl">{rarityStars}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Owned by</p>
                <p className="font-medium">{pokemon.owner.username}</p>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-semibold mb-2">Types</h2>
              <div className="flex flex-wrap gap-2">
                {pokemon.types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            <TradesList pokemon={pokemon} isOwner={pokemon.is_owner} />

            {isAuthenticated &&
              pokemon.is_owner &&
              !pokemon.money_trade &&
              !pokemon.barter_trade && <TradeDialogs pokemon={pokemon} />}
          </div>
        </div>
      </Card>
    </div>
  )
}

