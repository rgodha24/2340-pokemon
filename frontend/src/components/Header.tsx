import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useUser, useLogout } from '../lib/auth'
import NotificationBell from './notifications'

export default function Header() {
  const navigate = useNavigate()
  const { data: userData } = useUser()
  const logoutMutation = useLogout()

  const [search, setSearch] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      navigate({ to: '/search', search: { q: search } })
      setSearch('')
    }
  }

  return (
    <header className="p-4 flex flex-wrap items-center justify-between bg-white text-black shadow-sm gap-4">
      <nav className="flex flex-row items-center">
        <div className="px-2 font-bold text-lg">
          <Link to="/">Pokemon App</Link>
        </div>
      </nav>

      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 flex-grow max-w-md"
      >
        <Input
          type="text"
          placeholder="Search Pokémon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex items-center gap-4">
        <NotificationBell />
        {userData?.user?.username ? (
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link
                to="/user/$username"
                params={{ username: userData.user.username }}
              >
                Your Profile
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/login' })}
            >
              Login
            </Button>
            <Button onClick={() => navigate({ to: '/signup' })}>Sign Up</Button>
          </div>
        )}
      </div>
    </header>
  )
}
