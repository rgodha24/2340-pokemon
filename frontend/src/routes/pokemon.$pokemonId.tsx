import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportDialog } from '@/components/ReportDialog'
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
import type { User, PokemonDetailResponse } from '@/lib/types'
import { toast } from 'sonner'
import { ApiService } from '@/lib/api'

export const Route = createFileRoute('/pokemon/$pokemonId')({
  component: PokemonDetailComponent,
  loader: async ({ params }) => {
    return ApiService.getInstance().getPokemonDetail(params.pokemonId)
  },
})

interface PokemonDetailProps {
  pokemon: PokemonDetailResponse
  isOwner: boolean
}

function TradesList({ pokemon, isOwner }: PokemonDetailProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: userData } = useUser()
  const user = userData?.user as User | undefined
  const isAuthenticated = !!userData?.isAuthenticated
  const [selectedPokemonId, setSelectedPokemonId] = useState('')

  const { data: myPokemons, isLoading: isLoadingMyPokemons } = useQuery({
    queryKey: ['myPokemons'],
    queryFn: async () => {
      return (await ApiService.getInstance().getMyPokemon()).pokemon
    },
    enabled: isAuthenticated && !isOwner && !!pokemon.barter_trade,
  })

  const { data: incomingOffers, isLoading: isLoadingIncomingOffers } = useQuery(
    {
      queryKey: ['incomingOffers', pokemon.id],
      queryFn: async () => {
        return ApiService.getInstance().getIncomingOffersForPokemon(pokemon.id)
      },
      enabled: isOwner && !!pokemon.barter_trade,
    },
  )

  const cancelTrade = useMutation({
    mutationFn: async () => {
      return ApiService.getInstance().cancelTradeListing(pokemon.id)
    },
    onSuccess: () => {
      toast.success('Trade listing canceled successfully!')
      router.invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel trade listing')
    },
  })

  const buyPokemon = useMutation({
    mutationFn: async () => {
      return ApiService.getInstance().buyPokemon(pokemon.id)
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pokemon purchased successfully!')
      router.invalidate()
      queryClient.invalidateQueries({ queryKey: ['userData'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to buy Pokemon')
    },
  })

  const sendTradeRequest = useMutation({
    mutationFn: async () => {
      if (!selectedPokemonId) throw new Error('No Pokémon selected to offer')
      if (!pokemon.owner)
        throw new Error('Pokemon owner information is missing')

      return ApiService.getInstance().sendTradeRequest({
        receiver_id: pokemon.owner.id,
        receiver_pokemon_id: pokemon.id,
        sender_pokemon_id: Number(selectedPokemonId),
      })
    },
    onSuccess: () => {
      toast.success('Trade request sent!')
      setSelectedPokemonId('')
      queryClient.invalidateQueries({
        queryKey: ['incomingOffers', pokemon.id],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send trade request')
    },
  })

  const respondTrade = useMutation({
    mutationFn: async ({
      tradeId,
      action,
    }: {
      tradeId: number
      action: 'accept' | 'decline'
    }) => {
      return ApiService.getInstance().respondTradeRequest(tradeId, action)
    },
    onSuccess: (_, variables) => {
      toast.success(`Trade ${variables.action}ed!`)
      queryClient.invalidateQueries({
        queryKey: ['incomingOffers', pokemon.id],
      })
      if (variables.action === 'accept') {
        router.invalidate()
        queryClient.invalidateQueries({ queryKey: ['userData'] })
        queryClient.invalidateQueries({ queryKey: ['myPokemons'] })
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to respond to trade')
    },
  })

  const handleCancelTrade = () => {
    if (confirm('Are you sure you want to cancel this trade listing?')) {
      cancelTrade.mutate()
    }
  }

  const handleBuyPokemon = () => {
    if (!pokemon.money_trade) return
    if (
      confirm(
        `Are you sure you want to buy ${pokemon.name} for $${pokemon.money_trade.amount_asked}?`,
      )
    ) {
      buyPokemon.mutate()
    }
  }

  const handleSendTradeOffer = () => {
    if (!selectedPokemonId) {
      toast.error('Please select a Pokémon to offer.')
      return
    }
    sendTradeRequest.mutate()
  }

  const canAfford =
    user && pokemon.money_trade
      ? user.money >= pokemon.money_trade.amount_asked
      : false

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">Current Trade Status</h2>

      {pokemon.money_trade && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Money Trade</CardTitle>
                <CardDescription>This Pokemon is listed for sale</CardDescription>
              </div>
              {pokemon.money_trade?.is_flagged && (
                <div 
                  className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                  title={pokemon.money_trade.flag_reason || "This trade has been flagged for review"}
                >
                  Flagged
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold">
                    Price: ${pokemon.money_trade.amount_asked}
                  </p>
                  {isAuthenticated && !isOwner && user && (
                    <p
                      className={`text-sm mt-1 ${canAfford ? 'text-green-600' : 'text-red-600'}`}
                    >
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
                    {cancelTrade.isPending ? 'Deleting...' : 'Delete Listing'}
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
                        ? 'Processing...'
                        : canAfford
                          ? 'Buy Pokemon'
                          : 'Insufficient Funds'}
                    </Button>
                  )
                )}
              </div>
              
              {pokemon.money_trade?.is_flagged && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-700 mt-2">
                  <p className="font-medium">This trade has been flagged for review</p>
                  {pokemon.money_trade.flag_reason && (
                    <p className="mt-1">Reason: {pokemon.money_trade.flag_reason}</p>
                  )}
                </div>
              )}
              
              {isAuthenticated && !isOwner && !pokemon.money_trade?.is_flagged && (
                <div className="flex justify-end">
                  <ReportDialog 
                    tradeId={pokemon.money_trade.id} 
                    trigger={<Button variant="outline" size="sm">Report Trade</Button>}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pokemon.barter_trade && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Barter Trade</CardTitle>
                <CardDescription>
                  This Pokemon is available for trade offers
                </CardDescription>
              </div>
              {pokemon.barter_trade?.is_flagged && (
                <div 
                  className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                  title={pokemon.barter_trade.flag_reason || "This trade has been flagged for review"}
                >
                  Flagged
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-2 space-y-4">
            <div>
              <h3 className="font-medium">Owner's Preferences:</h3>
              <p className="mt-1 text-sm text-gray-700">
                {pokemon.barter_trade.trade_preferences ||
                  'No specific preferences listed.'}
              </p>
            </div>

            {isOwner && (
              <>
                <hr />
                <div>
                  <h3 className="font-medium mb-2">Incoming Offers:</h3>
                  {isLoadingIncomingOffers ? (
                    <p>Loading offers...</p>
                  ) : incomingOffers && incomingOffers.trades.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {incomingOffers.trades.map((offer) => (
                        <div
                          key={offer.id}
                          className="border p-3 rounded bg-gray-50"
                        >
                          <p className="text-sm">
                            <strong>From:</strong> {offer.sender_username}
                          </p>
                          <p className="text-sm">
                            <strong>Offering:</strong>{' '}
                            {offer.sender_pokemon_name}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                respondTrade.mutate({
                                  tradeId: offer.id,
                                  action: 'accept',
                                })
                              }
                              disabled={respondTrade.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                respondTrade.mutate({
                                  tradeId: offer.id,
                                  action: 'decline',
                                })
                              }
                              disabled={respondTrade.isPending}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No offers yet.</p>
                  )}
                </div>
                <hr />
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleCancelTrade}
                    disabled={cancelTrade.isPending}
                    size="sm"
                  >
                    {cancelTrade.isPending ? 'Deleting...' : 'Delete Listing'}
                  </Button>
                </div>
              </>
            )}

            {!isOwner && isAuthenticated && (
              <>
                <hr />
                <div>
                  <h3 className="font-medium mb-2">Make an Offer:</h3>
                  {isLoadingMyPokemons ? (
                    <p>Loading your Pokémon...</p>
                  ) : myPokemons && myPokemons.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPokemonId}
                        onChange={(e) => setSelectedPokemonId(e.target.value)}
                        className="border p-2 rounded flex-grow text-sm"
                        aria-label="Select your Pokémon to offer"
                      >
                        <option value="">Select your Pokémon to offer</option>
                        {myPokemons.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={
                          !selectedPokemonId || sendTradeRequest.isPending
                        }
                        onClick={handleSendTradeOffer}
                      >
                        {sendTradeRequest.isPending
                          ? 'Sending...'
                          : 'Send Offer'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      You don't have any Pokémon to offer for trade.
                    </p>
                  )}
                </div>
                {pokemon.barter_trade?.is_flagged ? (
                  <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-700 mt-3">
                    <p className="font-medium">This trade has been flagged for review</p>
                    {pokemon.barter_trade.flag_reason && (
                      <p className="mt-1">Reason: {pokemon.barter_trade.flag_reason}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-end mt-3">
                    <ReportDialog 
                      tradeId={pokemon.barter_trade.id} 
                      trigger={<Button variant="outline" size="sm">Report Trade</Button>}
                    />
                  </div>
                )}
              </>
            )}
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

function TradeDialogs({ pokemon }: { pokemon: PokemonDetailResponse }) {
  const [moneyAmount, setMoneyAmount] = useState('')
  const [tradePreferences, setTradePreferences] = useState('')
  const [moneyDialogOpen, setMoneyDialogOpen] = useState(false)
  const [barterDialogOpen, setBarterDialogOpen] = useState(false)
  const router = useRouter()

  const createMoneyTrade = useMutation({
    mutationFn: async () => {
      return ApiService.getInstance().createMoneyTrade({
        pokemonId: pokemon.id,
        amount_asked: parseInt(moneyAmount),
      })
    },
    onSuccess: () => {
      toast.success('Money trade created successfully!')
      setMoneyDialogOpen(false)
      setMoneyAmount('')
      router.invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create money trade')
    },
  })

  const createBarterTrade = useMutation({
    mutationFn: async () => {
      return ApiService.getInstance().createBarterTrade({
        pokemonId: pokemon.id,
        trade_preferences: tradePreferences,
      })
    },
    onSuccess: () => {
      toast.success('Barter trade created successfully!')
      setBarterDialogOpen(false)
      setTradePreferences('')
      router.invalidate()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create barter trade')
    },
  })

  const handleMoneyTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!moneyAmount || parseInt(moneyAmount) <= 0) {
      toast.error('Please enter a valid positive amount')
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
                  Price ($)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value)}
                  min="1"
                  className="col-span-3"
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMoneyTrade.isPending}>
                {createMoneyTrade.isPending ? 'Creating...' : 'Create Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={barterDialogOpen} onOpenChange={setBarterDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Offer for Barter</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offer {pokemon.name} for Barter</DialogTitle>
            <DialogDescription>
              Optionally, describe what you'd like in return. Users can then
              offer their Pokémon.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBarterTradeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="preferences" className="text-right pt-2">
                  Preferences (Optional)
                </Label>
                <Textarea
                  id="preferences"
                  value={tradePreferences}
                  onChange={(e) => setTradePreferences(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Looking for rare water types, specific Pokémon..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createBarterTrade.isPending}>
                {createBarterTrade.isPending ? 'Creating...' : 'Create Listing'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PokemonDetailComponent() {
  const { pokemon } = Route.useLoaderData()
  const { data: userData } = useUser()
  const isAuthenticated = userData?.isAuthenticated
  const owner = pokemon.owner
  const rarityStars = '★'.repeat(pokemon.rarity)
  const isOwner = owner?.id === userData?.user?.id

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-6">
            {pokemon.image_url ? (
              <img
                src={pokemon.image_url}
                alt={pokemon.name}
                className="w-full max-w-[250px] h-auto object-contain"
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
                <p
                  className="text-yellow-500 text-xl"
                  title={`${pokemon.rarity} Rarity`}
                >
                  {rarityStars}
                </p>
              </div>
              {owner && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Owned by</p>
                  <p className="font-medium">{owner.username}</p>
                </div>
              )}
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
            <TradesList pokemon={pokemon} isOwner={isOwner} />
            {isAuthenticated &&
              isOwner &&
              !pokemon.money_trade &&
              !pokemon.barter_trade && <TradeDialogs pokemon={pokemon} />}
          </div>
        </div>
      </Card>
    </div>
  )
}
