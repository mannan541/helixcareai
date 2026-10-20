import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { AppLayout } from '@/app/layouts/app-layout'
import { AuthGuard } from '@/app/guards/auth-guard'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { LandingPage } from '@/features/marketing/pages/landing-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: '/app',
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: '',
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
])
