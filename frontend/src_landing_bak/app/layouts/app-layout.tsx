import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/store'

export function AppLayout() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="font-bold text-lg">HelixCareAI</div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.fullName} ({user.role})
              </span>
            )}
            <button
              onClick={logout}
              className="text-sm hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
    </div>
  )
}
