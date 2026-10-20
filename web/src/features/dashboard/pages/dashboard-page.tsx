import { useAuthStore } from '@/core/auth/store'

export function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-muted-foreground">
          Your role: <span className="font-medium">{user?.role}</span>
        </p>
      </div>
    </div>
  )
}
