import { Link, useRouterState } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { NotificationPanel } from './NotificationPanel'
import { ChatPanel } from './ChatPanel'
import { useGPS } from './GPSContext'
import { useTheme } from '@/hooks/useTheme'

interface DriverShellProps {
  children: React.ReactNode
}

const driverTabs = [
  {
    to: '/ridic',
    label: 'Přehled',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active
          ? <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        }
      </svg>
    ),
  },
  {
    to: '/ridic/zakazky',
    label: 'Zákazky',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active
          ? <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        }
      </svg>
    ),
  },
  {
    to: '/ridic/gps',
    label: 'Volné',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active
          ? <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
          : <><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></>
        }
      </svg>
    ),
  },
  {
    to: '/ridic/profil',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary' : 'text-muted-foreground'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 2}>
        {active
          ? <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        }
      </svg>
    ),
  },
]

export function DriverShell({ children }: DriverShellProps) {
  const { signOut } = useAuthActions()
  const me = useQuery(api.users.getMe)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { isTracking, startTracking, stopTracking } = useGPS()
  const { theme, toggleTheme } = useTheme()

  const isTabActive = (to: string) =>
    to === '/ridic' ? currentPath === '/ridic' : currentPath.startsWith(to)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <div>
            <p className="font-heading font-bold text-sm leading-none">Kuryr4You</p>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">{me?.name?.split(' ')[0] ?? 'Řidič'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online / Offline toggle */}
          <button
            onClick={() => isTracking ? stopTracking() : startTracking()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-sm transition-all active:scale-95 select-none ${
              isTracking
                ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]'
                : 'bg-red-700/80 text-white shadow-none'
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isTracking ? 'bg-white animate-pulse' : 'bg-red-300'}`} />
            {isTracking ? 'Online' : 'Offline'}
          </button>

          <ChatPanel />
          <NotificationPanel compact />
        </div>
      </header>

      <main className="flex-1 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-stretch">
          {driverTabs.map((tab) => {
            const active = isTabActive(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors min-h-[64px] ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon(active)}
                <span className={`text-[10px] font-semibold uppercase tracking-wide leading-none ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
