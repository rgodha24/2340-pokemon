import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { useUser } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { data: userData, isLoading } = useUser()

  const isAuthenticated = userData?.isAuthenticated

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to the Pokemon App</CardTitle>
            <CardDescription>Your adventure in the world of Pokemon begins here</CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : isAuthenticated ? (
              <div className="space-y-4">
                <p className="text-lg">
                  Welcome back, <span className="font-bold">{userData?.user?.username}</span>!
                </p>
                <p>
                  Your Pokemon journey continues. Explore and discover more Pokemon.
                  
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p>
                  To start your Pokemon journey, please log in or create a new account.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-4">
            {!isLoading && !isAuthenticated && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate({ to: '/login' })}
                >
                  Login
                </Button>
                <Button 
                  onClick={() => navigate({ to: '/signup' })}
                >
                  Sign Up
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
