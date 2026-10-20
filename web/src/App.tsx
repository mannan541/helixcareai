import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { QueryProvider } from '@/app/providers/query-provider'

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}

export default App
