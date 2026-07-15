import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'
import { AppShell, PageHeader } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/ai-pristup')({
  component: AiAccessPage,
})

const CONVEX_SITE = 'https://amicable-dogfish-440.eu-west-1.convex.site'
const OPENAPI_URL = '/openapi.json'

const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/dispatch/summary', popis: 'Souhrnná statistika dispečinku' },
  { method: 'GET', path: '/api/v1/dispatch/orders', popis: 'Seznam zásilek (?status=&limit=&offset=)' },
  { method: 'GET', path: '/api/v1/dispatch/drivers', popis: 'Řidiči + aktuální GPS poloha' },
  { method: 'GET', path: '/api/v1/dispatch/crm', popis: 'CRM kontakty (?status=&limit=&offset=)' },
]

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts))
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'právě teď'
  if (min < 60) return `před ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `před ${h} h`
  return formatDate(ts)
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 text-xs rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
    >
      {copied ? '✓ Zkopírováno' : 'Kopírovat'}
    </button>
  )
}

function ApiKeyRow({
  keyData,
  onRevoke,
}: {
  keyData: { _id: Id<'apiKeys'>; name: string; keyPrefix: string; active: boolean; lastUsedAt?: number; _creationTime: number }
  onRevoke: (id: Id<'apiKeys'>) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-background/40 rounded-lg border border-primary/10">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate">{keyData.name}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {keyData.keyPrefix}
          <span className="ml-2 text-primary/40">•••</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground text-right shrink-0">
        <div>Vytvořen {formatDate(keyData._creationTime)}</div>
        {keyData.lastUsedAt ? (
          <div>Naposledy použit: {timeAgo(keyData.lastUsedAt)}</div>
        ) : (
          <div className="text-primary/40">Zatím nepoužit</div>
        )}
      </div>
      <div className="shrink-0">
        {keyData.active ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Aktivní
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
            Zrušen
          </span>
        )}
      </div>
      {keyData.active && (
        <div className="shrink-0">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Opravdu zrušit?</span>
              <button
                onClick={() => { onRevoke(keyData._id); setConfirming(false) }}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Zrušit klíč
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-2 py-1 text-xs bg-primary/10 text-muted-foreground rounded hover:bg-primary/20 transition-colors"
              >
                Ne
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="px-2 py-1 text-xs bg-primary/10 text-muted-foreground rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              Zrušit
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function NewKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const createKey = useAction(api.aiAccess.createAiKey)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    const n = name.trim()
    if (!n) { setError('Zadejte název klíče'); return }
    setLoading(true)
    setError('')
    try {
      const result = await createKey({ name: n })
      onCreated(result.plainKey)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chyba při vytváření klíče')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-primary/20 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Vytvořit nový AI klíč</h3>
        <div className="mb-4">
          <label className="block text-sm text-muted-foreground mb-1">Název klíče</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="např. ChatGPT asistent, Claude analýza..."
            className="w-full bg-background/60 border border-primary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Vytvářím...' : 'Vytvořit klíč'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShowKeyModal({ plainKey, onClose }: { plainKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(plainKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-primary/20 rounded-xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Klíč vytvořen</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Toto je <strong className="text-foreground">jediný okamžik</strong>, kdy uvidíte celý klíč. Uložte ho na bezpečné místo.
            </p>
          </div>
        </div>

        <div className="bg-background/80 border border-primary/20 rounded-lg p-3 mb-4 font-mono text-sm text-primary break-all select-all">
          {plainKey}
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2 mb-4 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition-colors font-medium"
        >
          {copied ? '✓ Zkopírováno!' : 'Zkopírovat klíč'}
        </button>

        <p className="text-xs text-muted-foreground mb-4">
          Klíč začíná prefixem <code className="text-primary">k4ai_</code>. Použijte ho jako Bearer token v HTTP hlavičce.
        </p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Hotovo — klíč jsem uložil
          </button>
        </div>
      </div>
    </div>
  )
}

function AiAccessPage() {
  const keys = useQuery(api.aiAccess.listAiKeys)
  const revokeKey = useMutation(api.aiAccess.revokeAiKey)

  const [showNew, setShowNew] = useState(false)
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null)
  const [tab, setTab] = useState<'keys' | 'docs' | 'chatgpt' | 'claude'>('keys')

  const handleRevoke = async (keyId: Id<'apiKeys'>) => {
    try {
      await revokeKey({ keyId })
      console.log('[ai-pristup] revoked key', keyId)
    } catch (e) {
      console.error('[ai-pristup] revoke error', e)
    }
  }

  const activeKeys = keys?.filter(k => k.active) ?? []

  return (
    <AppShell navItems={dispatcherNav} title="Kurýr4You — Dispečink">
      <PageHeader
        title="AI přístup"
        subtitle="Správa API klíčů pro ChatGPT, Claude a další AI nástroje"
        action={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nový AI klíč
          </button>
        }
      />

      {/* Info banner */}
      <div className="mx-4 mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3">
        <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-muted-foreground">
          AI klíče umožňují ChatGPT, Claude nebo jiným nástrojům <strong className="text-foreground">číst</strong> data dispečinku —
          zásilky, řidiče, GPS polohy a CRM. Přístup je <strong className="text-foreground">pouze pro čtení</strong>. Žádná data nelze přepsat.
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-4 flex gap-1 p-1 bg-background/40 rounded-lg border border-primary/10 w-fit">
        {[
          { key: 'keys', label: 'API klíče' },
          { key: 'docs', label: 'Endpointy' },
          { key: 'chatgpt', label: 'ChatGPT' },
          { key: 'claude', label: 'Claude' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.key
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-4 space-y-4">
        {/* ── API klíče ── */}
        {tab === 'keys' && (
          <div className="bg-card border border-primary/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Aktivní klíče ({activeKeys.length})</h3>
            </div>

            {keys === undefined ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Načítám...</div>
            ) : activeKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Zatím žádné AI klíče. Klikněte na „Nový AI klíč".
              </div>
            ) : (
              <div className="space-y-2">
                {activeKeys.map(k => (
                  <ApiKeyRow key={k._id} keyData={k} onRevoke={handleRevoke} />
                ))}
              </div>
            )}

            {/* Revoked keys */}
            {keys && keys.filter(k => !k.active).length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Zobrazit zrušené klíče ({keys.filter(k => !k.active).length})
                </summary>
                <div className="mt-2 space-y-2 opacity-50">
                  {keys.filter(k => !k.active).map(k => (
                    <ApiKeyRow key={k._id} keyData={k} onRevoke={handleRevoke} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── Endpointy ── */}
        {tab === 'docs' && (
          <div className="bg-card border border-primary/10 rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-1">REST API endpointy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Základní URL: <code className="text-primary">{CONVEX_SITE}</code>
              <CopyBtn text={CONVEX_SITE} />
            </p>

            <p className="text-sm text-muted-foreground mb-3">
              Autentizace: HTTP hlavička{' '}
              <code className="text-primary bg-primary/10 px-1 rounded">Authorization: Bearer k4ai_...</code>
            </p>

            <div className="space-y-3">
              {ENDPOINTS.map(ep => (
                <div key={ep.path} className="p-3 bg-background/40 rounded-lg border border-primary/10">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 px-1.5 py-0.5 text-xs font-mono font-bold text-green-400 bg-green-400/10 rounded">
                      {ep.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <code className="text-sm text-primary">{CONVEX_SITE}{ep.path}</code>
                      <CopyBtn text={`${CONVEX_SITE}${ep.path}`} />
                      <p className="text-xs text-muted-foreground mt-0.5">{ep.popis}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-primary/10">
              <p className="text-sm text-muted-foreground mb-2">OpenAPI specifikace (pro import do ChatGPT / Claude):</p>
              <a
                href={OPENAPI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Stáhnout openapi.json
              </a>
            </div>
          </div>
        )}

        {/* ── ChatGPT ── */}
        {tab === 'chatgpt' && (
          <div className="bg-card border border-primary/10 rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-4">Nastavení v ChatGPT (Custom GPT)</h3>

            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span>Otevřete <strong className="text-foreground">chat.openai.com</strong> → klikněte na své jméno → <em>My GPTs</em> → <em>Create a GPT</em>.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <span>Přejděte na záložku <em>Configure</em>. Dole klikněte na <strong className="text-foreground">Create new action</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <span>
                  Klikněte <em>Import from URL</em> a vložte:
                  <br />
                  <code className="text-primary bg-primary/10 px-1 rounded mt-1 inline-block">
                    {window.location.origin}/openapi.json
                  </code>
                  <CopyBtn text={`${window.location.origin}/openapi.json`} />
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
                <span>
                  V sekci <em>Authentication</em> zvolte <strong className="text-foreground">API Key</strong>, typ{' '}
                  <strong className="text-foreground">Bearer</strong> a vložte váš AI klíč{' '}
                  <code className="text-primary">k4ai_...</code> (ze záložky <em>API klíče</em>).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">5</span>
                <span>Uložte GPT. Nyní můžete psát dotazy jako: <em>„Kolik zásilek čeká na přiřazení?"</em> nebo <em>„Kteří řidiči jsou teď aktivní?"</em></span>
              </li>
            </ol>

            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
              💡 <strong className="text-foreground">Tip:</strong> Do pole <em>Instructions</em> v GPT přidejte text:{' '}
              <em>„Jsi dispečerský asistent kurýrní společnosti Kurýr4You. Odpovídej česky."</em>
            </div>
          </div>
        )}

        {/* ── Claude ── */}
        {tab === 'claude' && (
          <div className="bg-card border border-primary/10 rounded-xl p-4">
            <h3 className="font-semibold text-foreground mb-4">Nastavení v Claude (Projects / Connectors)</h3>

            <ol className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <span>Otevřete <strong className="text-foreground">claude.ai</strong> → vlevo <em>Projects</em> → <em>New Project</em> (nebo otevřete existující).</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <span>
                  V nastavení projektu klikněte <strong className="text-foreground">Add integration</strong> (nebo <em>Connect tools</em>).
                  Zvolte <em>Custom API / OpenAPI</em>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <span>
                  Zadejte URL specifikace:
                  <br />
                  <code className="text-primary bg-primary/10 px-1 rounded mt-1 inline-block">
                    {window.location.origin}/openapi.json
                  </code>
                  <CopyBtn text={`${window.location.origin}/openapi.json`} />
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
                <span>
                  Vyplňte autentizaci: typ <strong className="text-foreground">Bearer token</strong>, hodnota = váš AI klíč{' '}
                  <code className="text-primary">k4ai_...</code>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">5</span>
                <span>Uložte projekt. V chatu pak pište: <em>„Zobraz mi zásilky, které jsou dnes ve stavu transit."</em></span>
              </li>
            </ol>

            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
              💡 <strong className="text-foreground">Alternativa:</strong> API endpointy lze volat přímo z Claude.ai přes nástroj{' '}
              <em>Make an API call</em> — jednoduše vložte URL a klíč do zprávy.
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showNew && (
        <NewKeyModal
          onClose={() => setShowNew(false)}
          onCreated={key => { setShowNew(false); setNewPlainKey(key) }}
        />
      )}
      {newPlainKey && (
        <ShowKeyModal
          plainKey={newPlainKey}
          onClose={() => setNewPlainKey(null)}
        />
      )}
    </AppShell>
  )
}
