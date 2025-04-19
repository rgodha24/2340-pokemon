import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Notification {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationBell() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/')
      if (!res.ok) {
        throw new Error('Network response was not ok')
      }
      return res.json()
    },
  })

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        throw new Error('Failed to mark notifications as read')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error) => {
      console.error('Error marking notifications as read:', error)
    },
  })

  const notifications: Notification[] = data?.notifications || []
  const unread = notifications.filter((n) => !n.is_read)

  const handleOpenChange = (open: boolean) => {
    // Mark as read only when opening and there are unread notifications
    if (open && unread.length > 0) {
      markReadMutation.mutate()
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
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
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg ${
                  notification.is_read ? 'bg-background' : 'bg-muted'
                }`}
              >
                <p className="text-sm">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
