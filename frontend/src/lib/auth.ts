import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export interface User {
  id: number
  username: string
  email?: string
  is_staff: boolean
}

export interface UserResponse {
  isAuthenticated: boolean
  user?: User
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SignupCredentials {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
}

export function useUser() {
  return useQuery<UserResponse>({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/user/')
      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }
      return response.json()
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user?.username}!`)
      queryClient.invalidateQueries({ queryKey: ['user'] })
      navigate({ to: '/' })
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid credentials')
    },
  })
}

export function useSignup() {
  const navigate = useNavigate()

  return useMutation<AuthResponse, Error, SignupCredentials>({
    mutationFn: async (userData) => {
      const response = await fetch('/api/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Signup failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Account created successfully!')
      navigate({ to: '/login' })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create account')
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation<AuthResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch('/api/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Logged out successfully')
      queryClient.invalidateQueries({ queryKey: ['user'] })
      window.location.href = '/'
    },
    onError: (error) => {
      toast.error('Failed to log out')
    },
  })
}
