import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

const typeLabel: Record<string, string> = {
  ride_status: 'Zákazka',
  ride_assigned: 'Přiřazení',
  invoice: 'Faktura',
  approval: 'Schválení',
  system: 'Systém',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'právě teď'
  if (mins < 60) return `před ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `před ${hours} h`
  const days = Math.floor(hours / 24)
  return `před ${days} d`
}

interface NotificationPanelProps {
  compact?: boolean
}

export function NotificationPanel({ compact = false }: NotificationPanelProps) {
  const notifications = useQuery(api.notifications.getMyNotifications)
  const markAsRead = useMutation(api.notifications.markAsRead)
  const markAllAsRead = useMutation(api.notifications.markAllAsRead)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Computed dropdown position (fixed, always in-viewport)
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({})

  const unread = notifications?.filter(n => !n.read).length ?? 0

  // Recompute position whenever dropdown opens
  useEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const PANEL_W = 320
    const MARGIN = 8

    // Top: right below the button
    const top = rect.bottom + 6

    // Right-align to button, but clamp so panel stays within viewport
    let right = window.innerWidth - rect.right
    const leftEdge = window.innerWidth - right - PANEL_W
    if (leftEdge < MARGIN) {
      right = window.innerWidth - PANEL_W - MARGIN
    }
    if (right < MARGIN) right = MARGIN

    setDropStyle({ position: 'fixed', top, right, width: Math.min(PANEL_W, window.innerWidth - MARGIN * 2) })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleNotificationClick(n: { _id: Id<'notifications'>; read: boolean; rideId?: Id<'rides'> }) {
    if (!n.read) await markAsRead({ notificationId: n._id })
    if (n.rideId) {
      setOpen(false)
      navigate({ to: '/dispatcer/zasilky' })
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        title="Notifikace"
        aria-label="Notifikace"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={dropStyle}
          className="bg-card border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifikace</span>
            {unread > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-primary hover:underline"
              >
                Označit vše jako přečtené
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[min(24rem,60vh)] overflow-y-auto divide-y divide-border">
            {!notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                Žádné notifikace
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    {n.read && <span className="mt-1.5 w-2 h-2 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight truncate ${!n.read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {typeLabel[n.type] ?? n.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n._creationTime)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
