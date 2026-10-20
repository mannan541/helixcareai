export type UserRole = 'admin' | 'therapist' | 'parent'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  title?: string
  mobileNumber?: string
  showMobileToParents?: boolean
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Child {
  id: string
  first_name: string
  last_name: string
  fullName?: string
  date_of_birth?: string | null
  diagnosis?: string | null
  notes?: string | null
  [key: string]: any
}

export interface Session {
  id: string
  child_id: string
  session_date: string
  duration_minutes?: number | null
  notes_text?: string | null
  structured_metrics?: Record<string, any>
  therapist_id?: string | null
  created_by?: string
  [key: string]: any
}

export interface PaginatedResponse<T> {
  data?: T[]
  rows?: T[]
  total: number
  limit?: number
  offset?: number
  [key: string]: any
}

export interface ApiError {
  error?: string
  message?: string
}
