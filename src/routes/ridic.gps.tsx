import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { LoadingScreen, PageHeader } from '@/components/AppShell'
import { DriverShell } from '@/components/DriverShell'
import { AvailableRidesSection } from '@/components/DriverAvailableRides'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/ridic/gps')({
  component: DriverVolnePage,
})

function DriverVolnePage() {
  const { isAuthenticated } = useConvexAuth()
  const availableRides = useQuery(api.rides.getAvailableRides)

  if (!isAuthenticated) return <LoadingScreen />

  return (
    <DriverShell>
      <div className="px-4 pt-5 pb-24 max-w-2xl mx-auto">
        <PageHeader
          title="Volné zákazky"
          subtitle={
            availableRides === undefined
              ? 'Načítám...'
              : availableRides.length === 0
                ? 'Žádné volné zákazky'
                : `${availableRides.length} ${availableRides.length === 1 ? 'zákazka' : availableRides.length < 5 ? 'zákazky' : 'zákazek'} k převzetí`
          }
        />
        <AvailableRidesSection />
      </div>
    </DriverShell>
  )
}
