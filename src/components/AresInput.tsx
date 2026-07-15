import { useState } from 'react'

type AresData = {
  companyName: string
  companyAddress: string
  companyDic: string
}

type Props = {
  ico: string
  onIcoChange: (ico: string) => void
  onFilled: (data: AresData) => void
  className?: string
}

type AresResponse = {
  ico?: string
  obchodniJmeno?: string
  dic?: string
  sidlo?: {
    textovaAdresa?: string
    nazevObce?: string
    nazevUlice?: string
    cisloDomovni?: number
    cisloOrientacni?: number
    psc?: number
  }
}

function formatAddress(sidlo: AresResponse['sidlo']): string {
  if (!sidlo) return ''
  if (sidlo.textovaAdresa) return sidlo.textovaAdresa
  const parts: string[] = []
  if (sidlo.nazevUlice) {
    let street = sidlo.nazevUlice
    if (sidlo.cisloDomovni) street += ` ${sidlo.cisloDomovni}`
    if (sidlo.cisloOrientacni) street += `/${sidlo.cisloOrientacni}`
    parts.push(street)
  }
  if (sidlo.nazevObce) parts.push(sidlo.nazevObce)
  if (sidlo.psc) parts.push(String(sidlo.psc))
  return parts.join(', ')
}

export function AresInput({ ico, onIcoChange, onFilled, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleLookup = async () => {
    const cleaned = ico.replace(/\s/g, '')
    if (cleaned.length < 6) {
      setStatus('error')
      setMessage('IČO musí mít alespoň 6 číslic')
      return
    }
    setLoading(true)
    setStatus('idle')
    setMessage('')
    try {
      const res = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${cleaned}`,
        { headers: { Accept: 'application/json' } }
      )
      if (res.status === 404) {
        setStatus('error')
        setMessage('IČO nenalezeno v registru ARES')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(`ARES chyba: ${res.status}`)
      const data: AresResponse = await res.json()

      const filled: AresData = {
        companyName: data.obchodniJmeno ?? '',
        companyAddress: formatAddress(data.sidlo),
        companyDic: data.dic ?? '',
      }
      onFilled(filled)
      setStatus('ok')
      setMessage(`Nalezeno: ${filled.companyName}`)
      console.log('ARES lookup OK:', filled)
    } catch (err: any) {
      console.error('ARES lookup error:', err)
      setStatus('error')
      setMessage(err.message ?? 'Chyba při ověřování v ARES')
    } finally {
      setLoading(false)
    }
  }

  const baseCls = className ?? 'flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary'

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={ico}
          onChange={e => {
            onIcoChange(e.target.value)
            setStatus('idle')
            setMessage('')
          }}
          placeholder="12345678"
          maxLength={12}
          className={baseCls}
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={loading || ico.replace(/\s/g, '').length < 6}
          className="px-3 py-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 disabled:opacity-40 whitespace-nowrap transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
          ) : (
            <span>🔍</span>
          )}
          {loading ? 'Ověřuji…' : 'Ověřit ARES'}
        </button>
      </div>
      {message && (
        <p className={`text-xs px-2 py-1 rounded-md ${
          status === 'ok'
            ? 'text-green-400 bg-green-900/20'
            : 'text-destructive bg-destructive/10'
        }`}>
          {status === 'ok' ? '✓ ' : '✕ '}{message}
        </p>
      )}
    </div>
  )
}
