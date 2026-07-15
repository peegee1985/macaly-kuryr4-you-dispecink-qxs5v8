import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const roleLabel: Record<string, string> = {
  dispatcher: 'Dispečer',
  driver: 'Řidič',
  customer: 'Zákazník',
}

// Render message text with clickable URLs
function renderMessageText(text: string) {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi
  const parts = text.split(urlRegex)
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const roleColor: Record<string, string> = {
  dispatcher: 'bg-amber-500/20 text-amber-400',
  driver: 'bg-blue-500/20 text-blue-400',
  customer: 'bg-green-500/20 text-green-400',
}

function timeShort(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

// ─── Conversation view ────────────────────────────────────────────────────────

function MessageBubbles({ msgs, myId }: { msgs: any[]; myId: Id<'users'> }) {
  const grouped = msgs.reduce<{ senderId: string; isMine: boolean; msgs: any[] }[]>((acc, msg) => {
    const isMine = msg.senderId === myId
    const last = acc[acc.length - 1]
    if (last && last.senderId === msg.senderId) {
      last.msgs.push(msg)
    } else {
      acc.push({ senderId: msg.senderId, isMine, msgs: [msg] })
    }
    return acc
  }, [])

  return (
    <>
      {grouped.map((group, gi) => (
        <div key={gi} className={`flex flex-col gap-0.5 ${group.isMine ? 'items-end' : 'items-start'}`}>
          {group.msgs.map((msg, mi) => {
            const isLast = mi === group.msgs.length - 1
            return (
              <div key={msg._id} className={`max-w-[78%] px-3.5 py-2 text-sm leading-snug break-words ${
                group.isMine
                  ? `bg-primary text-primary-foreground ${isLast ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'}`
                  : `bg-muted text-foreground ${isLast ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
              }`}>
                {renderMessageText(msg.text)}
                {isLast && (
                  <span className={`block text-[10px] mt-0.5 ${group.isMine ? 'text-primary-foreground/50 text-right' : 'text-muted-foreground'}`}>
                    {timeShort(msg._creationTime)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

function ConversationView({
  myId,
  partnerId,
  partnerName,
  partnerRole,
}: {
  myId: Id<'users'>
  partnerId: Id<'users'>
  partnerName: string
  partnerRole?: string
}) {
  const messages = useQuery(api.chat.getMessages, { partnerId })
  const archivedCount = useQuery(api.chat.getArchivedMessageCount, { partnerId })
  const [showArchive, setShowArchive] = useState(false)
  const archivedMessages = useQuery(
    api.chat.getArchivedMessages,
    showArchive ? { partnerId } : 'skip'
  )
  const sendMessage = useMutation(api.chat.sendMessage)
  const markRead = useMutation(api.chat.markConversationRead)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    markRead({ partnerId }).catch(console.error)
  }, [partnerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await sendMessage({ receiverId: partnerId, text: t })
      setText('')
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Partner info bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {partnerName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{partnerName}</p>
          {partnerRole && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColor[partnerRole] ?? 'bg-muted text-muted-foreground'}`}>
              {roleLabel[partnerRole] ?? partnerRole}
            </span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages === undefined ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Načítám…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Archive section */}
            {(archivedCount ?? 0) > 0 && (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <button
                  onClick={() => setShowArchive(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1 bg-muted/40 hover:bg-muted"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4M14 12v4" />
                  </svg>
                  {showArchive ? 'Skrýt archiv' : `Archiv zpráv (${archivedCount} starší 30 dnů)`}
                </button>
              </div>
            )}

            {/* Archived messages */}
            {showArchive && (
              <>
                {archivedMessages === undefined ? (
                  <div className="flex justify-center py-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : archivedMessages.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Archiv</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <MessageBubbles msgs={archivedMessages} myId={myId} />
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Posledních 30 dní</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </>
                ) : null}
              </>
            )}

            {/* Active messages */}
            {messages.length === 0 && !showArchive ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Začněte konverzaci</p>
                </div>
              </div>
            ) : (
              <MessageBubbles msgs={messages} myId={myId} />
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3 border-t border-border bg-card flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Napište zprávu… (Enter = odeslat)"
          className="flex-1 px-3.5 py-2.5 bg-input border border-border rounded-2xl text-sm resize-none focus:outline-none focus:border-primary transition-colors leading-snug"
          style={{ minHeight: '40px', maxHeight: '100px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:opacity-90 disabled:opacity-30 flex-shrink-0 transition-opacity"
          aria-label="Odeslat"
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Conversation list view ───────────────────────────────────────────────────

function ConversationList({
  conversations,
  chatUsers,
  onOpenConversation,
}: {
  conversations: any[] | undefined
  chatUsers: any[] | undefined
  onOpenConversation: (partner: { id: Id<'users'>; name: string; role?: string }) => void
}) {
  const [search, setSearch] = useState('')

  const filteredUsers = (chatUsers ?? []).filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredConvs = (conversations ?? []).filter(c =>
    c.partnerName.toLowerCase().includes(search.toLowerCase())
  )

  // IDs that already have a conversation
  const existingIds = new Set((conversations ?? []).map(c => c.partnerId))
  // Users without conversation (for "new chat")
  const newUsers = filteredUsers.filter(u => !existingIds.has(u._id))

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="px-3 py-2.5 border-b border-border flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hledat osobu…"
            className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Existing conversations */}
        {filteredConvs.length > 0 && (
          <div>
            {search === '' && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Konverzace</p>
            )}
            {filteredConvs.map(conv => (
              <button
                key={conv.partnerId}
                onClick={() => onOpenConversation({ id: conv.partnerId, name: conv.partnerName, role: conv.partnerRole })}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {conv.partnerName.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {conv.partnerName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeShort(conv.lastAt)}</span>
                  </div>
                  <p className={`text-xs truncate ${conv.unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* New chat — users without existing conversation */}
        {newUsers.length > 0 && (
          <div>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {search ? 'Výsledky' : 'Nová konverzace'}
            </p>
            {newUsers.map(u => (
              <button
                key={u._id}
                onClick={() => onOpenConversation({ id: u._id, name: u.name, role: u.role })}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-muted-foreground flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{u.name}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor[u.role] ?? 'bg-muted text-muted-foreground'}`}>
                  {roleLabel[u.role] ?? u.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredConvs.length === 0 && newUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            {search ? (
              <p className="text-sm text-muted-foreground">Žádné výsledky pro „{search}"</p>
            ) : (
              <>
                <p className="text-sm text-foreground font-medium mb-1">Žádné konverzace</p>
                <p className="text-xs text-muted-foreground">Vyhledejte osobu nahoře a začněte psát</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ChatPanel export ────────────────────────────────────────────────────

export function ChatPanel() {
  const me = useQuery(api.users.getMe)
  const conversations = useQuery(api.chat.getMyConversations)
  const chatUsers = useQuery(api.chat.getChatUsers)
  const unreadCount = useQuery(api.chat.getUnreadChatCount)

  // Customers are not allowed to use chat
  if (me && me.role === 'customer') return null

  const [open, setOpen] = useState(false)
  const [activePartner, setActivePartner] = useState<{ id: Id<'users'>; name: string; role?: string } | null>(null)

  const totalUnread = unreadCount ?? 0

  // Note: we intentionally do NOT set overflow:hidden on body when chat opens.
  // On iOS Safari, body overflow:hidden prevents the virtual keyboard from
  // appearing when tapping a textarea inside a fixed overlay — breaking text input
  // for drivers on mobile. The fixed inset-0 overlay already prevents background
  // scrolling without needing to lock the body.

  // Listen for open-chat event from quick action tiles
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-chat', handler)
    return () => window.removeEventListener('open-chat', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  function handleClose() {
    setOpen(false)
    // small delay so we don't flash the list before closing
    setTimeout(() => setActivePartner(null), 200)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Chat"
        aria-label="Chat"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Chat overlay — rendered via portal at document.body to escape any parent
          stacking context (e.g. sticky header with z-40 in DriverShell that would
          otherwise paint below the bottom nav at z-50, blocking the textarea). */}
      {open && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop for desktop click-outside close */}
          <div
            className="hidden md:block fixed inset-0 z-[59]"
            onClick={handleClose}
          />

          {/* Mobile: full-screen overlay, Desktop: floating panel bottom-right */}
          <div
            className="fixed z-[60] bg-card border border-border shadow-2xl flex flex-col overflow-hidden inset-0 rounded-none md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[540px] md:rounded-2xl"
            style={{ height: 'var(--chat-mobile-h, 100dvh)' } as React.CSSProperties}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
              {activePartner ? (
                <button
                  onClick={() => setActivePartner(null)}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Zpět na konverzace
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-semibold text-sm">Chat</span>
                  {totalUnread > 0 && (
                    <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Zavřít chat"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0">
              {activePartner && me ? (
                <ConversationView
                  myId={me._id as Id<'users'>}
                  partnerId={activePartner.id}
                  partnerName={activePartner.name}
                  partnerRole={activePartner.role}
                />
              ) : (
                <ConversationList
                  conversations={conversations}
                  chatUsers={chatUsers}
                  onOpenConversation={setActivePartner}
                />
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
