import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect } from 'react'
import { LoadingScreen } from '@/components/AppShell'
import { GPSProvider } from '@/components/GPSContext'

export const Route = createFileRoute('/ridic')({
  component: DriverLayout,
})

// Keep exporting driverNav for backward compat (used nowhere now but safe to keep)
export const driverNav = [] as any[]

function DriverLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: '/prihlaseni' })
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (me && me.role !== 'driver' && me.role !== 'service_driver') navigate({ to: '/' })
  }, [me, navigate])

  if (isLoading || me === undefined) return <LoadingScreen />
  if (!me) return null

  return <GPSProvider><Outlet /></GPSProvider>
}
