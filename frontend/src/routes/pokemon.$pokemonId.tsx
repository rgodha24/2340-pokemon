import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useUser } from "@/lib/auth"
import type { Pokemon, PokemonDetailResponse } from "@/lib/types"

export const Route = createFileRoute("/pokemon/$pokemonId")({
  loader: async ({ params }) => {
    const res = await fetch(`/api/pokemon/${params.pokemonId}/`, { credentials: "include" })
    if (!res.ok) throw new Error("Failed to fetch Pokémon")
    return res.json() as Promise<PokemonDetailResponse>
  },
  component: () => {
    const pokemon = Route.useLoaderData()
    return (
      <div className="p-6">
        <PokemonDetailComponent
          pokemon={pokemon.pokemon}
          isOwner={pokemon.is_owner}
        />
      </div>
    )
  },
})

function PokemonDetailComponent({
  pokemon,
  isOwner,
}: {
  pokemon: Pokemon
  isOwner: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold">{pokemon.name}</h1>
        <img src={pokemon.image_url} alt={pokemon.name} className="w-48 h-48 object-contain my-4" />
        <p><strong>Types:</strong> {pokemon.types.join(", ")}</p>
        <p><strong>Rarity:</strong> {pokemon.rarity}</p>
      </div>

      <TradesList pokemon={pokemon} isOwner={isOwner} />
    </div>
  )
}

function TradesList({
  pokemon,
  isOwner,
}: {
  pokemon: Pokemon
  isOwner: boolean
}) {
  const { data: userData } = useUser()
  const isAuthenticated = !!userData?.user
  const queryClient = useQueryClient()
  const [selectedPokemonId, setSelectedPokemonId] = useState("")

  const { data: myPokemons } = useQuery({
    queryKey: ["myPokemons"],
    queryFn: async () => {
      const res = await fetch("/api/my-pokemon/", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch your Pokémon")
      return res.json()
    },
    enabled: isAuthenticated && !isOwner,
  })

  const { data: incomingOffers } = useQuery({
    queryKey: ["incomingOffers", pokemon.id],
    queryFn: async () => {
      const res = await fetch(`/api/incoming-trades/${pokemon.id}/`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch incoming offers")
      return res.json()
    },
    enabled: isOwner,
  })

  const sendTradeRequest = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/send-trade/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: pokemon.owner?.id,
          receiver_pokemon_id: pokemon.id,
          sender_pokemon_id: Number(selectedPokemonId),
        }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to send trade request")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Trade request sent!")
      setSelectedPokemonId("")
      queryClient.invalidateQueries({ queryKey: ["incomingTrades"] })
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send trade request")
    },
  })

  const respondTrade = useMutation({
    mutationFn: async ({ tradeId, action }: { tradeId: number; action: "accept" | "decline" }) => {
      const res = await fetch(`/api/respond-trade/${tradeId}/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error("Failed to respond to trade")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Trade updated!")
      queryClient.invalidateQueries({ queryKey: ["incomingOffers", pokemon.id] })
    },
    onError: () => {
      toast.error("Failed to respond to trade")
    },
  })

  const cancelTrade = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cancel-trade/${pokemon.id}/`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to cancel trade")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Trade cancelled!")
      queryClient.invalidateQueries({ queryKey: ["pokemonDetail", pokemon.id] })
    },
    onError: () => {
      toast.error("Failed to cancel trade")
    },
  })

  const buyPokemon = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/pokemon/${pokemon.id}/buy/`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to buy Pokémon")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Pokémon bought successfully!")
      queryClient.invalidateQueries({ queryKey: ["pokemonDetail", pokemon.id] })
    },
    onError: () => {
      toast.error("Failed to buy Pokémon")
    },
  })

  return (
    <div className="space-y-4">
      {pokemon.money_trade && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Money Trade</CardTitle>
            <CardDescription>This Pokémon is for sale</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 space-y-4">
            <p>Price: <strong>${pokemon.money_trade.amount_asked}</strong></p>

            {!isOwner && (
              <Button onClick={() => buyPokemon.mutate()} disabled={buyPokemon.isPending}>
                {buyPokemon.isPending ? "Buying..." : "Buy"}
              </Button>
            )}
            {isOwner && (
              <Button variant="destructive" onClick={() => cancelTrade.mutate()} disabled={cancelTrade.isPending}>
                {cancelTrade.isPending ? "Deleting..." : "Delete Trade"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {pokemon.barter_trade && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Barter Trade</CardTitle>
            <CardDescription>This Pokémon is available for trade</CardDescription>
          </CardHeader>
          <CardContent className="pb-2 space-y-4">
            {isOwner && (
              <>
                <h3 className="font-semibold">Incoming Trade Offers</h3>
                {incomingOffers?.trades.length > 0 ? (
                  incomingOffers.trades.map((trade: any) => (
                    <div key={trade.id} className="border p-2 rounded space-y-1">
                      <p><strong>From:</strong> {trade.sender_username}</p>
                      <p><strong>Offering:</strong> {trade.sender_pokemon_name}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => respondTrade.mutate({ tradeId: trade.id, action: "accept" })}
                          disabled={respondTrade.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => respondTrade.mutate({ tradeId: trade.id, action: "decline" })}
                          disabled={respondTrade.isPending}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No offers yet.</p>
                )}
              </>
            )}

            {!isOwner && isAuthenticated && (
              <div className="space-y-2">
                <h3 className="font-semibold">Offer your Pokémon:</h3>
                {myPokemons ? (
                  <>
                    <select
                      value={selectedPokemonId}
                      onChange={(e) => setSelectedPokemonId(e.target.value)}
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select your Pokémon</option>
                      {myPokemons?.pokemon.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <Button
                      disabled={!selectedPokemonId || sendTradeRequest.isPending}
                      onClick={() => sendTradeRequest.mutate()}
                      className="w-full"
                    >
                      {sendTradeRequest.isPending ? "Sending..." : "Send Trade Offer"}
                    </Button>
                  </>
                ) : (
                  <p>Loading your Pokémon...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* If owner and NOT listed yet, show create trade form */}
      {isOwner && !pokemon.money_trade && !pokemon.barter_trade && (
        <div className="space-y-4 mt-4">
          <h3 className="font-semibold">Create Trade Listing</h3>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const amount = formData.get("amount")
              fetch(`/api/pokemon/${pokemon.id}/trade/money/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount_asked: Number(amount) }),
              })
                .then((res) => {
                  if (!res.ok) throw new Error()
                  toast.success("Money trade created!")
                  queryClient.invalidateQueries({ queryKey: ["pokemonDetail", pokemon.id] })
                })
                .catch(() => toast.error("Failed to create money trade"))
            }}
          >
            <div className="flex items-center gap-2">
              <Input name="amount" placeholder="Enter sale price" className="w-48" />
              <Button type="submit">Create Money Trade</Button>
            </div>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const preferences = formData.get("preferences")
              fetch(`/api/pokemon/${pokemon.id}/trade/barter/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trade_preferences: preferences }),
              })
                .then((res) => {
                  if (!res.ok) throw new Error()
                  toast.success("Barter trade created!")
                  queryClient.invalidateQueries({ queryKey: ["pokemonDetail", pokemon.id] })
                })
                .catch(() => toast.error("Failed to create barter trade"))
            }}
          >
            <div className="flex items-center gap-2">
              <Input name="preferences" placeholder="Enter trade preferences" className="w-48" />
              <Button type="submit">Create Barter Trade</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}