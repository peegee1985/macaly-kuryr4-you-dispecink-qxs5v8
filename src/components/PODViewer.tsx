import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'
import { createPortal } from 'react-dom'

interface PODViewerProps {
  rideId: Id<'rides'>
  rideNumber: string
  onClose: () => void
}

export function PODModal({ rideId, rideNumber, onClose }: PODViewerProps) {
  const pod = useQuery(api.rides.getPODData, { rideId })
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const content = (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full md:max-w-2xl bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-heading font-bold text-base">Doklad o doručení</h2>
            <p className="text-xs text-muted-foreground">Zákazka #{rideNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Zavřít"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {pod === undefined ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !pod ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Doklad nebyl nalezen</p>
          ) : (
            <>
              {/* Info */}
              <div className="bg-green-950/20 border border-green-700/30 rounded-xl p-4 flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-green-400 font-semibold text-sm">Zásilka doručena</p>
                  {pod.podRecipientName && (
                    <p className="text-sm text-foreground mt-0.5">Převzal: <span className="font-medium">{pod.podRecipientName}</span></p>
                  )}
                  {pod.podDeliveredAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(pod.podDeliveredAt).toLocaleString('cs-CZ', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Adresa: {pod.deliveryAddress}</p>
                </div>
              </div>

              {/* Photos */}
              {pod.photoUrls.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>📷</span> Fotografie zásilky
                    <span className="text-xs text-muted-foreground font-normal">({pod.photoUrls.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {pod.photoUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxSrc(url)}
                        className="relative aspect-video rounded-xl overflow-hidden bg-muted group hover:ring-2 hover:ring-primary transition-all"
                      >
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pod.photoUrls.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground bg-muted/40 rounded-xl">
                  Žádné fotografie nebyly pořízeny
                </div>
              )}

              {/* Signature */}
              {pod.signatureUrl && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>✍️</span> Podpis příjemce
                  </h3>
                  <div className="bg-white rounded-xl p-3 border border-border">
                    <img
                      src={pod.signatureUrl}
                      alt="Podpis příjemce"
                      className="w-full max-h-32 object-contain"
                    />
                  </div>
                </div>
              )}

              {!pod.signatureUrl && (
                <div className="text-center py-4 text-xs text-muted-foreground bg-muted/40 rounded-xl">
                  Podpis nebyl pořízen
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox for full-screen photo */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[90] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Foto" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
