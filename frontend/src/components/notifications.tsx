import { useQuery } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Notification {
  id: string
  message: string
  read: boolean
  createdAt: string
}

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/')
      return res.json()
    },
  })

  const notifications = data?.notifications || []
  const unread = notifications.filter((n: Notification) => !n.read)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative">
          <BellIcon className="w-6 h-6" />
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No notifications
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg ${
                  notification.read ? 'bg-background' : 'bg-muted'
                }`}
              >
                <p className="text-sm">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
