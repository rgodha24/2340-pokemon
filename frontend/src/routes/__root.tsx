import { Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '../components/Header'
import TanstackQueryLayout from '../integrations/tanstack-query/layout'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '../components/ui/sonner'
import Chatbot from "@/components/Chatbot";

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => {
    const location = useLocation();
    const hideChatbot = location.pathname.startsWith("/signup") || location.pathname.startsWith("/login");
    return (
    <>
      <Header />
      <Toaster />

      <Outlet />
      {!hideChatbot && <Chatbot />}  {/* Chatbot conditionally rendered */}
      <TanStackRouterDevtools />
      <TanstackQueryLayout />
    </>
  );
  }
})
