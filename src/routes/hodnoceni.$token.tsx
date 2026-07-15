import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

export const Route = createFileRoute('/hodnoceni/$token')({
  head: () => ({
    meta: [
      { title: 'Ohodnoťte doručení – Kuryr4You' },
      { name: 'description', content: 'Ohodnoťte vaše doručení a pomozte nám zlepšit služby.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: RatingPage,
})

const STAR_LABELS = ['', 'Velmi špatné', 'Špatné', 'Průměrné', 'Dobré', 'Výborné']

function StarIcon({ filled, hovered }: { filled: boolean; hovered: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-10 h-10 transition-all duration-150" fill={filled || hovered ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  )
}

function RatingPage() {
  const { token } = Route.useParams()
  const ride = useQuery(api.rides.getRideByRatingToken, { ratingToken: token })
  const submitRating = useMutation(api.rides.rateRide)

  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedStar, setSelectedStar] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (ride === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Načítám...</p>
        </div>
      </div>
    )
  }

  if (ride === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="font-heading text-xl font-bold mb-2">Zásilka nenalezena</h1>
          <p className="text-muted-foreground text-sm">Odkaz pro hodnocení je neplatný nebo vypršel.</p>
        </div>
      </div>
    )
  }

  if (submitted || ride.rating !== undefined) {
    const finalRating = ride.rating ?? selectedStar
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Success animation */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">Děkujeme za hodnocení!</h1>
          <p className="text-muted-foreground mb-6">
            Vaše zpětná vazba nám pomáhá neustále zlepšovat naše služby.
          </p>
          {/* Show stars */}
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} className={i <= finalRating ? 'text-amber-400' : 'text-muted'}>
                <StarIcon filled={i <= finalRating} hovered={false} />
              </span>
            ))}
          </div>
          {finalRating > 0 && (
            <p className="text-sm font-medium text-primary mb-6">{STAR_LABELS[finalRating]}</p>
          )}
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    )
  }

  if (ride.status !== 'delivered') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="font-heading text-xl font-bold mb-2">Zásilka ještě nedorazila</h1>
          <p className="text-muted-foreground text-sm">
            Hodnocení bude dostupné po doručení zásilky <strong>#{ride.rideNumber}</strong>.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (selectedStar === 0) { setError('Vyberte prosím hodnocení.'); return }
    setLoading(true)
    setError('')
    try {
      await submitRating({ ratingToken: token, rating: selectedStar, ratingComment: comment || undefined })
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message ?? 'Chyba při odesílání hodnocení.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="font-heading font-bold text-lg">Kuryr4You</span>
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">Jak se nám dařilo?</h1>
          <p className="text-muted-foreground text-sm">
            Vaše zásilka <strong className="text-foreground">#{ride.rideNumber}</strong> byla doručena.
            Ohodnoťte prosím kvalitu doručení.
          </p>
        </div>

        {/* Route summary */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary" />
              <div className="w-0.5 h-8 bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-green-500" />
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Vyzvednutí</p>
                <p className="text-foreground truncate">{ride.pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Doručení</p>
                <p className="text-foreground truncate">{ride.deliveryAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stars */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4">
          <p className="text-center text-sm text-muted-foreground mb-4">Klikněte na hvězdičku pro hodnocení</p>
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onMouseEnter={() => setHoveredStar(i)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setSelectedStar(i)}
                className={`transition-all duration-150 ${
                  i <= (hoveredStar || selectedStar) ? 'text-amber-400 scale-110' : 'text-muted-foreground'
                }`}
                aria-label={`${i} hvězd`}
              >
                <StarIcon filled={i <= selectedStar} hovered={i <= hoveredStar && hoveredStar > 0} />
              </button>
            ))}
          </div>
          {(hoveredStar || selectedStar) > 0 && (
            <p className="text-center text-sm font-medium text-primary transition-all">
              {STAR_LABELS[hoveredStar || selectedStar]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-4">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Volitelný komentář (pochvala, připomínka, návrh...)"
            rows={3}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || selectedStar === 0}
          className="w-full py-3 px-6 bg-primary text-primary-foreground font-heading font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
        >
          {loading ? 'Odesílám...' : 'Odeslat hodnocení'}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vaše hodnocení je anonymní a pomáhá nám zlepšovat služby.
        </p>
      </div>
    </div>
  )
}
