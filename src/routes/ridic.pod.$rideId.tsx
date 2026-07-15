import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { LoadingScreen } from '@/components/AppShell'
import { DriverShell } from '@/components/DriverShell'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/ridic/pod/$rideId')({
  component: PODPage,
})

function PODPage() {
  const { rideId } = Route.useParams()
  const { isAuthenticated } = useConvexAuth()
  const ride = useQuery(api.rides.getRide, { rideId: rideId as Id<'rides'> })
  const submitPOD = useMutation(api.rides.submitPOD)
  const generateUploadUrl = useMutation(api.rides.generateUploadUrl)
  const navigate = useNavigate()

  const sigRef = useRef<SignatureCanvas>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [recipientName, setRecipientName] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'done'>('form')

  if (!isAuthenticated || ride === undefined) return <LoadingScreen />
  if (!ride) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Zákazka nenalezena</p>
    </div>
  )

  const clearSig = () => sigRef.current?.clear()

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const newPhotos = [...photos, ...files].slice(0, 4) // max 4 photos
    setPhotos(newPhotos)
    const previews = newPhotos.map(f => URL.createObjectURL(f))
    setPhotoPreviews(previews)
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviews(newPhotos.map(f => URL.createObjectURL(f)))
  }

  const uploadFile = async (file: File): Promise<Id<'_storage'>> => {
    const uploadUrl = await generateUploadUrl()
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    const { storageId } = await res.json()
    return storageId
  }

  const handleSubmit = async () => {
    if (!recipientName.trim()) {
      setError('Zadejte jméno příjemce.')
      return
    }
    if (sigRef.current?.isEmpty()) {
      setError('Podpis je povinný.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Upload signature
      const sigDataUrl = sigRef.current!.toDataURL('image/png')
      const sigBlob = await (await fetch(sigDataUrl)).blob()
      const sigFile = new File([sigBlob], 'signature.png', { type: 'image/png' })
      const signatureId = await uploadFile(sigFile)

      // Upload photos
      const photoIds: Id<'_storage'>[] = []
      for (const photo of photos) {
        const photoId = await uploadFile(photo)
        photoIds.push(photoId)
      }

      await submitPOD({
        rideId: rideId as Id<'rides'>,
        recipientName: recipientName.trim(),
        signatureId,
        photoIds,
      })

      setStep('done')
      setTimeout(() => navigate({ to: '/ridic/zakazky' }), 2500)
    } catch (e: any) {
      setError(e.message || 'Nepodařilo se odeslat doklad.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <DriverShell>
        <div className="px-4 flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="font-heading text-2xl font-bold mb-2">Doručení potvrzeno!</h2>
            <p className="text-muted-foreground text-sm">Zákazka #{ride.rideNumber} je uzavřena.</p>
            <p className="text-xs text-muted-foreground mt-2">Přesměrování za chvíli…</p>
          </div>
        </div>
      </DriverShell>
    )
  }

  return (
    <DriverShell>
      <div className="px-4 pt-5 max-w-lg mx-auto pb-8">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold mb-1">Doklad o doručení</h1>
          <p className="text-muted-foreground text-sm">Zákazka #{ride.rideNumber}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <p className="text-xs text-muted-foreground mb-1">Doručovací adresa</p>
          <p className="font-medium">{ride.deliveryAddress}</p>
          <p className="text-sm text-muted-foreground">{ride.deliveryContactName}</p>
        </div>

        <div className="space-y-6">
          {/* Recipient name */}
          <div>
            <label className="block text-sm font-medium mb-2">Jméno příjemce *</label>
            <input
              type="text"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              className="w-full px-3 py-3 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Kdo zásilku převzal"
              autoComplete="off"
            />
          </div>

          {/* Photo capture */}
          <div>
            <label className="block text-sm font-medium mb-2">Fotografie zásilky</label>
            <p className="text-xs text-muted-foreground mb-3">Nepovinné — max. 4 fotky (doporučeno)</p>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                    <img src={preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/90">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 4 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2">
                  📷 {photos.length === 0 ? 'Vyfotit zásilku' : 'Přidat další foto'}
                </button>
              </>
            )}
          </div>

          {/* Signature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Podpis příjemce *</label>
              <button onClick={clearSig} type="button"
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted">
                Vymazat
              </button>
            </div>
            <div className="border-2 border-border rounded-xl overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigRef}
                penColor="#1a1a1a"
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: 'w-full',
                  style: { touchAction: 'none' }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Podepisujte prstem nebo myší</p>
          </div>

          {error && (
            <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-green-600 text-white font-heading font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Nahrávám…
              </span>
            ) : '✅ Potvrdit doručení'}
          </button>
        </div>
      </div>
    </DriverShell>
  )
}
