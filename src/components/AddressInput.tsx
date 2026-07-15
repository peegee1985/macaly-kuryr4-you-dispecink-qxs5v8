import { useState, useEffect, useRef, useCallback } from 'react'

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    city?: string
    town?: string
    village?: string
    postcode?: string
    country?: string
  }
}

type Props = {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
  name?: string
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export function AddressInput({ value, onChange, placeholder, required, className, id, name }: Props) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keep query in sync if parent resets value
  useEffect(() => {
    setQuery(value)
  }, [value])

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 3) {
        setSuggestions([])
        setOpen(false)
        return
      }
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', q)
        url.searchParams.set('format', 'json')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('limit', '7')
        url.searchParams.set('countrycodes', 'cz,sk')
        url.searchParams.set('accept-language', 'cs')

        const res = await fetch(url.toString(), {
          signal: abortRef.current.signal,
          headers: { 'Accept-Language': 'cs' },
        })
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
        setActiveIdx(-1)
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('Nominatim error', e)
      } finally {
        setLoading(false)
      }
    }, 350),
    []
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    search(v)
  }

  const pick = (item: NominatimResult) => {
    setQuery(item.display_name)
    onChange(item.display_name, parseFloat(item.lat), parseFloat(item.lon))
    setSuggestions([])
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const baseCls = className ?? 'w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          required={required}
          placeholder={placeholder ?? 'Začněte psát adresu…'}
          className={baseCls + ' pr-8'}
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        )}
        {!loading && query.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setQuery(''); onChange(''); setSuggestions([]); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <li key={item.place_id}>
              <button
                type="button"
                onMouseDown={() => pick(item)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  idx === activeIdx ? 'bg-primary/20 text-foreground' : 'hover:bg-muted/60 text-foreground'
                }`}
              >
                <span className="line-clamp-2 leading-snug">{item.display_name}</span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 border-t border-border">
            <span className="text-xs text-muted-foreground/60">© OpenStreetMap přispěvatelé</span>
          </li>
        </ul>
      )}
    </div>
  )
}
