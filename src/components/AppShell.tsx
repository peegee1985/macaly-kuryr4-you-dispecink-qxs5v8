import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Link, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { NotificationPanel } from './NotificationPanel'
import { ChatPanel } from './ChatPanel'
import { useTheme } from '@/hooks/useTheme'
import { CommandPalette } from './CommandPalette'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

interface AppShellProps {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  subtitle?: string
  /** How many nav items to show in the bottom bar (rest go in "Více" sheet). Default: 4 */
  primaryCount?: number
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function GridIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children, navItems, title, subtitle, primaryCount = 4 }: AppShellProps) {
  const { signOut } = useAuthActions()
  const me = useQuery(api.users.getMe)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { theme, toggleTheme } = useTheme()

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false) }, [currentPath])

  // ⌘K / Ctrl+K global shortcut (dispatcher only)
  useEffect(() => {
    if (me?.role !== 'dispatcher') return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [me?.role])

  // Prevent body scroll when sheet or cmd open
  useEffect(() => {
    if (sheetOpen || cmdOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sheetOpen, cmdOpen])

  const isActive = (to: string) =>
    to.endsWith('/') || to === currentPath
      ? currentPath === to
      : currentPath === to || currentPath.startsWith(to + '/')

  const primaryItems = navItems.slice(0, primaryCount)
  const secondaryItems = navItems.slice(primaryCount)

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-card border-r border-border min-h-screen sticky top-0 h-screen">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4.5 h-4.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
              </svg>
            </div>
            <div>
              <p className="font-heading font-bold text-sm leading-none">Kuryr4You</p>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Search button (dispatcher only) */}
          {me?.role === 'dispatcher' && (
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors mb-1"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <span className="font-medium flex-1 text-left">Hledat…</span>
              <kbd className="text-[10px] border border-border rounded px-1 py-0.5 leading-none">⌘K</kbd>
            </button>
          )}
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {me?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{me?.name || me?.email}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <NotificationPanel />
            <ChatPanel />
          </div>
          <button onClick={toggleTheme}
            title={theme === 'dark' ? 'Přepnout na světlé téma' : 'Přepnout na tmavé téma'}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors mb-0.5">
            {theme === 'dark' ? <><SunIcon /> Světlé téma</> : <><MoonIcon /> Tmavé téma</>}
          </button>
          <button onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <SignOutIcon />
            Odhlásit se
          </button>
        </div>
      </aside>

      {/* ── Mobile header ────────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
            </svg>
          </div>
          <div>
            <span className="font-heading font-bold text-sm leading-none">Kuryr4You</span>
            <span className="text-xs text-muted-foreground ml-1.5">{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {me?.role === 'dispatcher' && (
            <button
              onClick={() => setCmdOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              title="Vyhledat (⌘K)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          )}
          <NotificationPanel />
          <ChatPanel />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto pb-24 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {primaryItems.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-semibold uppercase tracking-wide leading-none truncate max-w-full px-0.5 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
                {active && <span className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full" />}
              </Link>
            )
          })}

          {/* "Více" button */}
          {secondaryItems.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                sheetOpen || secondaryItems.some(i => isActive(i.to)) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <GridIcon />
              <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">Více</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Slide-up "Více" sheet ────────────────────────────────────────────── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border shadow-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            {/* User row */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border mb-1">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {me?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{me?.name || me?.email}</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            {/* Secondary nav items */}
            <div className="px-3 py-2 grid grid-cols-2 gap-1">
              {secondaryItems.map((item) => {
                const active = isActive(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Bottom actions */}
            <div className="px-3 pb-3 pt-1 border-t border-border mt-1 flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {theme === 'dark' ? <><SunIcon /><span>Světlé</span></> : <><MoonIcon /><span>Tmavé</span></>}
              </button>
              <button
                onClick={() => signOut()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-950/60 text-sm transition-colors"
              >
                <SignOutIcon />
                <span>Odhlásit</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ⌘K Command Palette (dispatcher only) ────────────────────────────── */}
      {me?.role === 'dispatcher' && (
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      )}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-xl sm:text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Čeká',          cls: 'status-pending' },
    approved:  { label: 'Schváleno',     cls: 'status-approved' },
    assigned:  { label: 'Přiřazeno',     cls: 'status-assigned' },
    pickup:    { label: 'Vyzvedávám',    cls: 'status-pickup' },
    transit:   { label: 'Na cestě',      cls: 'status-transit' },
    delivered: { label: 'Doručeno',      cls: 'status-delivered' },
    cancelled: { label: 'Zrušeno',       cls: 'status-cancelled' },
    failed:    { label: 'Selhalo',       cls: 'status-cancelled' },
    active:    { label: 'Aktivní',       cls: 'status-delivered' },
    inactive:  { label: 'Neaktivní',     cls: 'status-cancelled' },
    draft:     { label: 'Koncept',       cls: 'status-pending' },
    sent:      { label: 'Odesláno',      cls: 'status-assigned' },
    paid:      { label: 'Zaplaceno',     cls: 'status-delivered' },
    overdue:   { label: 'Po splatnosti', cls: 'status-cancelled' },
    none:      { label: 'Standardní',    cls: 'status-pending' },
  }
  const s = map[status] ?? { label: status, cls: 'status-pending' }
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Načítám...</p>
      </div>
    </div>
  )
}
