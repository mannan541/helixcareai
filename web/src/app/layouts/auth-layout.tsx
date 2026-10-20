import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">HelixCareAI</h1>
          <p className="text-muted-foreground mt-2">Therapy Management Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
