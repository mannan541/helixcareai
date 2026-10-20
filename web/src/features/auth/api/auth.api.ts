import apiClient from '@/core/api/client'
import type { AuthResponse, User } from '@/core/types'

export const authApi = {
  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', data)
    return response.data
  },
  register: async (data: { email: string; password: string; fullName: string; role: string }) => {
    const response = await apiClient.post('/api/auth/register', data)
    return response.data
  },
  me: async () => {
    const response = await apiClient.get<{ user: User }>('/api/auth/me')
    return response.data
  },
  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.patch('/api/auth/profile', data)
    return response.data
  },
  getTherapists: async () => {
    const response = await apiClient.get('/api/auth/therapists')
    return response.data
  },
}
