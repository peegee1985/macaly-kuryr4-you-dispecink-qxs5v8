import { customerNav } from './zakaznik'
import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, LoadingScreen, PageHeader, StatusBadge } from '@/components/AppShell'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

type ReceiptData = {
  _id: Id<'receipts'>
  receiptNumber: string
  rideNumber: string
  issuedAt: number
  amount: number
  currency: string
  paymentMethod: 'hotovost' | 'prevod' | 'faktura' | 'karta'
  isPaid: boolean
  pickupAddress: string
  deliveryAddress: string
  cargoDescription: string
  customerName?: string
  driverName?: string
}

async function downloadReceiptPDF(receipt: ReceiptData) {
  const { jsPDF } = await import('jspdf')

  // Compact receipt format: 80mm wide, variable height
  const pageW = 80
  const margin = 6
  const contentW = pageW - margin * 2
  const doc = new jsPDF({ unit: 'mm', format: [pageW, 200], orientation: 'portrait' })

  const issuedDate = new Date(receipt.issuedAt).toLocaleDateString('cs-CZ', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  })

  const paymentLabels: Record<string, string> = {
    hotovost: 'Hotovost', prevod: 'Bankovní převod', faktura: 'Faktura', karta: 'Platební karta',
  }

  let y = 8

  const line = (text: string, size = 8, bold = false, center = false) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const x = center ? pageW / 2 : margin
    const align = center ? 'center' : 'left'
    const lines = doc.splitTextToSize(text, contentW) as string[]
    lines.forEach((l) => {
      doc.text(l, x, y, { align })
      y += size * 0.45
    })
  }

  const separator = () => {
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, y, pageW - margin, y)
    y += 3
  }

  // Header
  line('ÚČTENKA', 11, true, true)
  y += 1
  separator()

  // Supplier
  line('DODAVATEL', 7, true)
  line('Gotty s.r.o.', 8, false)
  line('IČO: 21930431', 7)
  line('Podhajská pole 758/15, Praha 8, 181 00', 6.5)
  line('www.kuryr4you.cz  ·  +420 724 297 804', 6.5)
  y += 2
  separator()

  // Meta
  line(`Číslo účtenky: ${receipt.receiptNumber}`, 7)
  y += 0.5
  line(`Číslo zakázky: ${receipt.rideNumber}`, 7)
  y += 0.5
  line(`Datum vydání:  ${issuedDate}`, 7)
  y += 1
  separator()

  // Service
  line('POPIS SLUŽBY', 7, true)
  line('Kurýrní přeprava zásilky', 7)
  y += 1
  line(`Z: ${receipt.pickupAddress}`, 6.5)
  y += 0.5
  line(`Do: ${receipt.deliveryAddress}`, 6.5)
  if (receipt.cargoDescription) {
    y += 0.5
    line(`Obsah: ${receipt.cargoDescription}`, 6.5)
  }
  y += 1
  separator()

  // Payment
  const amountStr = receipt.amount > 0
    ? `${receipt.amount.toLocaleString('cs-CZ')} ${receipt.currency}`
    : 'Dle dohody'
  line('PLATBA', 7, true)
  y += 0.5
  line(`Způsob platby: ${paymentLabels[receipt.paymentMethod] ?? receipt.paymentMethod}`, 7)
  y += 0.5
  line(`Stav platby:   ${receipt.isPaid ? 'ZAPLACENO' : 'CEKA NA UHRADU'}`, 7, false)
  y += 1

  // Total — large
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Celkem:', margin, y)
  doc.text(amountStr, pageW - margin, y, { align: 'right' })
  y += 7
  separator()

  // Footer
  line('Gotty s.r.o.  ·  IČO: 21930431', 6, false, true)
  line('www.kuryr4you.cz', 6, false, true)
  y += 2

  // Resize page to fit content
  const totalH = y + 4
  const doc2 = new jsPDF({ unit: 'mm', format: [pageW, totalH], orientation: 'portrait' })
  // Re-render into properly sized doc
  let y2 = 8
  const line2 = (text: string, size = 8, bold = false, center = false) => {
    doc2.setFontSize(size)
    doc2.setFont('helvetica', bold ? 'bold' : 'normal')
    const x = center ? pageW / 2 : margin
    const align = center ? 'center' : 'left'
    const lines2 = doc2.splitTextToSize(text, contentW) as string[]
    lines2.forEach((l) => {
      doc2.text(l, x, y2, { align })
      y2 += size * 0.45
    })
  }
  const sep2 = () => {
    doc2.setDrawColor(180, 180, 180)
    doc2.line(margin, y2, pageW - margin, y2)
    y2 += 3
  }
  line2('ÚČTENKA', 11, true, true); y2 += 1; sep2()
  line2('DODAVATEL', 7, true)
  line2('Gotty s.r.o.', 8)
  line2('IČO: 21930431', 7)
  line2('Podhajská pole 758/15, Praha 8, 181 00', 6.5)
  line2('www.kuryr4you.cz  ·  +420 724 297 804', 6.5)
  y2 += 2; sep2()
  line2(`Číslo účtenky: ${receipt.receiptNumber}`, 7); y2 += 0.5
  line2(`Číslo zakázky: ${receipt.rideNumber}`, 7); y2 += 0.5
  line2(`Datum vydání:  ${issuedDate}`, 7); y2 += 1; sep2()
  line2('POPIS SLUŽBY', 7, true)
  line2('Kurýrní přeprava zásilky', 7); y2 += 1
  line2(`Z: ${receipt.pickupAddress}`, 6.5); y2 += 0.5
  line2(`Do: ${receipt.deliveryAddress}`, 6.5)
  if (receipt.cargoDescription) { y2 += 0.5; line2(`Obsah: ${receipt.cargoDescription}`, 6.5) }
  y2 += 1; sep2()
  line2('PLATBA', 7, true); y2 += 0.5
  line2(`Způsob platby: ${paymentLabels[receipt.paymentMethod] ?? receipt.paymentMethod}`, 7); y2 += 0.5
  line2(`Stav platby:   ${receipt.isPaid ? 'ZAPLACENO' : 'CEKA NA UHRADU'}`, 7); y2 += 1
  doc2.setFontSize(11); doc2.setFont('helvetica', 'bold')
  doc2.text('Celkem:', margin, y2)
  doc2.text(amountStr, pageW - margin, y2, { align: 'right' })
  y2 += 7; sep2()
  line2('Gotty s.r.o.  ·  IČO: 21930431', 6, false, true)
  line2('www.kuryr4you.cz', 6, false, true)

  doc2.save(`uctenka-${receipt.receiptNumber}.pdf`)
}

export const Route = createFileRoute('/zakaznik/uctenky')({
  component: CustomerReceiptsPage,
})

const paymentLabels: Record<string, string> = {
  hotovost: 'Hotovost',
  prevod: 'Bankovní převod',
  faktura: 'Faktura',
  karta: 'Karta',
}

const paymentIcons: Record<string, string> = {
  hotovost: '💵',
  prevod: '🏦',
  faktura: '📄',
  karta: '💳',
}

function ReceiptDetail({ receipt, onClose }: {
  receipt: ReceiptData
  onClose: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const issuedDate = new Date(receipt.issuedAt).toLocaleDateString('cs-CZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      await downloadReceiptPDF(receipt)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-heading font-bold text-lg">Účtenka {receipt.receiptNumber}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 font-medium">
              {downloading ? '⏳ Generuji...' : '⬇ Stáhnout PDF'}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 print:p-0 space-y-5" id="receipt-print">
          {/* Supplier block */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="font-heading font-bold text-primary text-sm mb-0.5">DODAVATEL</p>
            <p className="font-heading font-bold text-base">Gotty s.r.o.</p>
            <p className="text-sm text-muted-foreground">IČO: 21930431</p>
            <p className="text-sm text-muted-foreground">Podhajská pole 758/15, Praha 8 Bohnice, 181 00</p>
            <p className="text-sm text-muted-foreground">www.kuryr4you.cz · tel.: +420 724 297 804</p>
          </div>

          {/* Receipt meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Číslo účtenky</p>
              <p className="font-heading font-semibold text-sm">{receipt.receiptNumber}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Číslo zakázky</p>
              <p className="font-heading font-semibold text-sm">{receipt.rideNumber}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Datum vydání</p>
              <p className="font-semibold text-sm">{issuedDate}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Stav platby</p>
              <p className={`font-semibold text-sm ${receipt.isPaid ? 'text-green-400' : 'text-amber-400'}`}>
                {receipt.isPaid ? '✓ Zaplaceno' : '⌛ Čeká na úhradu'}
              </p>
            </div>
          </div>

          {/* Service description */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Popis služby</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Kurýrní přeprava zásilky</p>
                <p className="text-sm">{receipt.cargoDescription}</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium mt-0.5">Z</span>
                  <p className="text-sm">{receipt.pickupAddress}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded font-medium mt-0.5">DO</span>
                  <p className="text-sm">{receipt.deliveryAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount & payment */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-4 py-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platba</p>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Způsob platby</p>
                <p className="text-sm font-medium">
                  {paymentIcons[receipt.paymentMethod]} {paymentLabels[receipt.paymentMethod]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Celková částka</p>
                <p className="font-heading font-bold text-2xl text-primary">
                  {receipt.amount > 0
                    ? `${receipt.amount.toLocaleString('cs-CZ')} ${receipt.currency}`
                    : 'Dle dohody'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground text-center">
            Gotty s.r.o. · IČO: 21930431 · www.kuryr4you.cz
          </p>
        </div>
      </div>
    </div>
  )
}

function CustomerReceiptsPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const receipts = useQuery(api.receipts.getMyReceipts)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

  if (!isAuthenticated || me === undefined || receipts === undefined) return <LoadingScreen />
  if (!me) return null

  const totalUnpaid = receipts.filter(r => !r.isPaid && r.amount > 0).reduce((s, r) => s + r.amount, 0)

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <PageHeader title="Účtenky" subtitle="Doklady za kurýrní přepravy" />

        {totalUnpaid > 0 && (
          <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-300">Nesplacené platby</p>
              <p className="text-sm text-amber-400/80">
                Celkem {totalUnpaid.toLocaleString('cs-CZ')} CZK čeká na úhradu
              </p>
            </div>
          </div>
        )}

        {receipts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="font-heading font-semibold mb-1">Žádné účtenky</p>
            <p className="text-muted-foreground text-sm">
              Účtenky se generují automaticky po doručení a zaplacení zásilky.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((r) => (
              <button
                key={r._id}
                onClick={() => setSelectedReceipt(r)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm group-hover:text-primary transition-colors">
                      🧾 {r.receiptNumber}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.isPaid
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {r.isPaid ? 'Zaplaceno' : 'Čeká na úhradu'}
                    </span>
                  </div>
                  <span className="font-heading font-bold text-primary">
                    {r.amount > 0 ? `${r.amount.toLocaleString('cs-CZ')} ${r.currency}` : 'Dle dohody'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="mb-0.5">Zakázka</p>
                    <p className="text-foreground">{r.rideNumber}</p>
                  </div>
                  <div>
                    <p className="mb-0.5">Datum</p>
                    <p className="text-foreground">{new Date(r.issuedAt).toLocaleDateString('cs-CZ')}</p>
                  </div>
                  <div>
                    <p className="mb-0.5">Platba</p>
                    <p className="text-foreground">{paymentIcons[r.paymentMethod]} {paymentLabels[r.paymentMethod]}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  {r.pickupAddress} → {r.deliveryAddress}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedReceipt && (
        <ReceiptDetail
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </AppShell>
  )
}
