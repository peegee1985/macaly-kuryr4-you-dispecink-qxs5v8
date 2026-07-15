import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useEffect } from 'react'
import { LoadingScreen } from '@/components/AppShell'

export const Route = createFileRoute('/vending-portal')({
  component: VendingPortalLayout,
})

function VendingPortalLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: '/prihlaseni' })
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (me && me.role !== 'vending_supervisor' && me.role !== 'dispatcher') {
      navigate({ to: '/' })
    }
  }, [me, navigate])

  if (isLoading || me === undefined) return <LoadingScreen />
  if (!me) return null

  return <Outlet />
}
