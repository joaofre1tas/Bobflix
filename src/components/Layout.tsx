import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <main className="flex flex-col min-h-screen bg-bg text-text-primary selection:bg-bobflix-100 selection:text-bobflix-700">
      <Outlet />
    </main>
  )
}
