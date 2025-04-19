import { useQuery } from '@tanstack/react-query'
import { BellIcon } from 'lucide-react'

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/')
      return res.json()
    },
  })

  const unread = data?.notifications?.filter((n: any) => !n.read) || []

  return (
    <div className="relative">
      <BellIcon className="w-6 h-6" />
      {unread.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {unread.length}
        </span>
      )}
    </div>
  )
}
