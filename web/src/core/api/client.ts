import axios from 'axios'
import { env } from '@/core/config/env'
import { useAuthStore } from '@/core/auth/store'

const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState()
      authStore.logout()
      // Optionally redirect - handled by route guards
    }
    return Promise.reject(error)
  }
)

export default apiClient
