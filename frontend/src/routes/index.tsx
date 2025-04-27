import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import type { FeaturedPokemonResponse } from '@/lib/types'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { data: userData, isLoading: userLoading } = useUser()

  // Fetch featured Pokémon from the API
  const { data: featuredData, isLoading: featuredLoading } =
    useQuery<FeaturedPokemonResponse>({
      queryKey: ['featuredPokemon'],
      queryFn: async () => {
        const response = await fetch('/api/featured-pokemon/')
        if (!response.ok) {
          throw new Error('Failed to fetch featured Pokémon')
        }
        return response.json()
      },
    })

  const isAuthenticated = userData?.isAuthenticated
  const isLoading = userLoading

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png')] bg-no-repeat bg-right-bottom bg-contain"></div>
        <div className="container mx-auto py-16 px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to the Pokémon Trading Platform
            </h1>
            <p className="text-xl mb-8">
              Collect, trade, and discover your favorite Pokémon in one place
            </p>

            {!isLoading && !isAuthenticated && (
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate({ to: '/signup' })}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                >
                  Start Your Journey
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate({ to: '/login' })}
                  className="border-white text-black hover:bg-white hover:text-blue-600"
                >
                  Login
                </Button>
              </div>
            )}

            {!isLoading && isAuthenticated && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-white text-black hover:bg-white hover:text-blue-600"
                >
                  <Link
                    to="/user/$username"
                    params={{ username: userData.user!.username }}
                  >
                    My Collection
                  </Link>
                </Button>
                <Button variant="default" size="lg" asChild>
                  <Link to="/search">Explore Pokemon</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-12 px-4">
        {/* Welcome Card for Authenticated Users */}
        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-pulse w-full max-w-3xl h-40 bg-gray-200 rounded-lg"></div>
          </div>
        ) : isAuthenticated ? (
          <Card className="shadow-lg mb-12 border-2 border-blue-200">
            <CardHeader className="">
              <CardTitle className="text-2xl">Welcome back!</CardTitle>
              <CardDescription className="text-base">
                Your Pokémon journey continues. What would you like to do today?
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link
                    to="/user/$username"
                    params={{ username: userData.user!.username }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m7-4h.01"
                      />
                    </svg>
                    <span className="text-lg font-medium">My Collection</span>
                    <span className="text-sm text-gray-500">
                      View your owned Pokémon
                    </span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => navigate({ to: '/incoming-trades' })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <span className="text-lg font-medium">Trades</span>
                  <span className="text-sm text-gray-500">
                    Manage your trade offers
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                  onClick={() => navigate({ to: '/search' })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="text-lg font-medium">Search</span>
                  <span className="text-sm text-gray-500">
                    Find specific Pokémon
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Featured Pokémon Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Featured Pokémon
          </h2>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="bg-gray-100 p-6 flex justify-center">
                    <div className="h-48 w-48 animate-pulse bg-gray-200 rounded-lg"></div>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-24 animate-pulse bg-gray-200 rounded"></div>
                      <div className="h-6 w-16 animate-pulse bg-gray-200 rounded-full"></div>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <div className="h-10 w-full animate-pulse bg-gray-200 rounded"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : featuredData?.featured_pokemon &&
            featuredData.featured_pokemon.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredData.featured_pokemon.map((pokemon) => (
                <Card
                  key={pokemon.id}
                  className="overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => navigate({ to: `/pokemon/${pokemon.id}` })}
                >
                  <div className="bg-gray-100 p-6 flex justify-center">
                    <img
                      src={pokemon.image_url}
                      alt={pokemon.name}
                      className="h-48 object-contain hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>{pokemon.name}</CardTitle>
                      <div className="flex gap-1">
                        {pokemon.types.map((type, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-blue-50 capitalize"
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {pokemon.money_trade && (
                      <div className="mt-2 text-sm text-green-600 font-medium">
                        Price: ${pokemon.money_trade.amount_asked}
                      </div>
                    )}
                    {pokemon.barter_trade && (
                      <div className="mt-2 text-sm text-blue-600 font-medium">
                        Available for trade
                      </div>
                    )}
                  </CardHeader>
                  <CardFooter className="pt-0">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate({ to: `/pokemon/${pokemon.id}` })
                      }}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No featured Pokémon available at the moment.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate({ to: '/search' })}
              >
                Browse Pokemon
              </Button>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-10 text-center">
            Why Choose Our Platform?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-100 text-blue-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Trading</h3>
              <p className="text-gray-600">
                Trade Pokémon with trainers from around the world in real-time
                with our secure trading system.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100 text-green-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Collection</h3>
              <p className="text-gray-600">
                Your Pokémon collection is securely stored and backed up,
                ensuring you never lose your valuable creatures.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-purple-100 text-purple-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Active Community</h3>
              <p className="text-gray-600">
                Join a thriving community of Pokémon enthusiasts who share tips,
                strategies, and rare finds.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Counter */}
        <div className="mb-16 py-10 bg-gray-50 rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                10,000+
              </div>
              <div className="text-gray-600">Active Trainers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                150,000+
              </div>
              <div className="text-gray-600">Pokémon Traded</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">898</div>
              <div className="text-gray-600">Unique Pokémon</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Trading Available</div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-8 text-white text-center mb-16">
          <h2 className="text-2xl font-bold mb-4">
            Ready to start your Pokémon journey?
          </h2>
          <p className="mb-6 max-w-2xl mx-auto">
            Join thousands of trainers who are collecting, trading, and battling
            with their favorite Pokémon.
          </p>
          {!isLoading && !isAuthenticated && (
            <Button
              size="lg"
              onClick={() => navigate({ to: '/signup' })}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Sign Up Now
            </Button>
          )}
          {isAuthenticated && (
            <Button
              size="lg"
              onClick={() => navigate({ to: '/search' })}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Explore Pokémon
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
