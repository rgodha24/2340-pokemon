import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trade/$tradeId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/trade/$tradeId"!</div>
}
