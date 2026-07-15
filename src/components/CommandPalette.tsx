import { useState, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Link, useNavigate } from '@tanstack/react-router'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká', approved: 'Schváleno', assigned: 'Přiřazeno',
  pickup: 'Vyzvedávám', transit: 'Na cestě', delivered: 'Doručeno',
  cancelled: 'Zrušeno', failed: 'Nedoručeno',
}

const QUICK_LINKS = [
  { label: 'Zásilky', icon: '📦', to: '/dispatcer/zasilky', hint: 'Správa zásilek' },
  { label: 'Živá mapa', icon: '🗺️', to: '/dispatcer/mapa', hint: 'GPS tracking' },
  { label: 'Statistiky', icon: '📊', to: '/dispatcer/statistiky', hint: 'Přehledy a grafy' },
  { label: 'Zaměstnanci', icon: '👥', to: '/dispatcer/zamestnanci', hint: 'HR a mzdy' },
  { label: 'Fakturace', icon: '🧾', to: '/dispatcer/fakturace', hint: 'Vystavení faktur' },
  { label: 'Kalendář', icon: '📅', to: '/dispatcer/kalendar', hint: 'Dostupnost řidičů' },
  { label: 'Uživatelé', icon: '🙍', to: '/dispatcer/uzivatele', hint: 'Správa účtů' },
  { label: 'Nastavení', icon: '⚙️', to: '/dispatcer/nastaveni', hint: 'Konfigurace systému' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const results = useQuery(
    api.rides.globalSearch,
    open && query.length >= 2 ? { q: query } : 'skip'
  )

  const filteredLinks = query.length >= 1
    ? QUICK_LINKS.filter(l =>
        l.label.toLowerCase().includes(query.toLowerCase()) ||
        l.hint.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_LINKS

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset query when opened
  useEffect(() => { if (open) setQuery('') }, [open])

  if (!open) return null

  const goTo = (path: string) => {
    navigate({ to: path as any })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Hledat zásilky, zákazníky, sekce…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {/* Ride search results */}
          {results && results.rides.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Zásilky</p>
              {results.rides.map(ride => (
                <button
                  key={ride._id}
                  onClick={() => goTo('/dispatcer/zasilky')}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
                >
                  <span className="text-lg mt-0.5">📦</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-sm">#{ride.rideNumber}</span>
                      <span className="text-xs text-muted-foreground">{STATUS_LABELS[ride.status] ?? ride.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ride.pickupAddress} → {ride.deliveryAddress}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Customer search results */}
          {results && results.customers.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Zákazníci</p>
              {results.customers.map(c => (
                <button
                  key={c._id}
                  onClick={() => goTo('/dispatcer/uzivatele')}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
                >
                  <span className="text-lg mt-0.5">🙍</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name ?? c.email}</p>
                    {c.companyName && <p className="text-xs text-muted-foreground">{c.companyName}</p>}
                    {c.email && c.name && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick links */}
          {filteredLinks.length > 0 && (
            <div className="p-2">
              {query.length < 2 && <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Rychlý přístup</p>}
              {filteredLinks.map(link => (
                <button
                  key={link.to}
                  onClick={() => goTo(link.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
                >
                  <span className="text-lg">{link.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && results && results.rides.length === 0 && results.customers.length === 0 && filteredLinks.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">Žádné výsledky pro „{query}"</p>
            </div>
          )}

          {query.length >= 2 && results === undefined && (
            <div className="p-4 text-center">
              <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>↵ Otevřít</span>
          <span>ESC Zavřít</span>
          <span className="ml-auto">⌘K pro rychlý přístup</span>
        </div>
      </div>
    </div>
  )
}
