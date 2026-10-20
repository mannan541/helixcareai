import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { authApi } from '../api/auth.api'

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['therapist', 'parent']),
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'parent' },
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const response = await authApi.register(data)
      setSuccess(response.message || 'Registration successful. Awaiting admin approval.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
          <input {...register('fullName')} id="fullName" className="w-full mt-1 px-3 py-2 border rounded-md" />
          {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input {...register('email')} type="email" id="email" className="w-full mt-1 px-3 py-2 border rounded-md" placeholder="you@example.com" />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input {...register('password')} type="password" id="password" className="w-full mt-1 px-3 py-2 border rounded-md" />
          {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label htmlFor="role" className="text-sm font-medium">Role</label>
          <select {...register('role')} id="role" className="w-full mt-1 px-3 py-2 border rounded-md">
            <option value="parent">Parent</option>
            <option value="therapist">Therapist</option>
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:opacity-90 disabled:opacity-50">
          {loading ? 'Registering...' : 'Register'}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
