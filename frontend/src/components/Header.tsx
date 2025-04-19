import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from './ui/button'
import { useUser, useLogout } from '../lib/auth'
import NotificationBell from './notifications'

export default function Header() {
  const navigate = useNavigate()
  const { data: userData } = useUser()
  const logoutMutation = useLogout()

  return (
    <header className="p-4 flex gap-2 bg-white text-black justify-between shadow-sm">
      <nav className="flex flex-row items-center">
        <div className="px-2 font-bold text-lg">
          <Link to="/">Pokemon App</Link>
        </div>
      </nav>

      <div className="flex items-center gap-4">
        <NotificationBell />
        {userData?.user?.username ? (
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link
                to="/user/$username"
                params={{ username: userData.user!.username }}
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
