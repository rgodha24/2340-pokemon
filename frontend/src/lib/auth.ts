import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ApiService } from './api'

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
      return ApiService.getInstance().getUser()
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<AuthResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      return ApiService.getInstance().login(credentials)
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
      return ApiService.getInstance().signup(userData)
    },
    onSuccess: () => {
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
      return ApiService.getInstance().logout()
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
