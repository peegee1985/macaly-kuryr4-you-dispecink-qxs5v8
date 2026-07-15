import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, LoadingScreen, PageHeader, StatusBadge } from '@/components/AppShell'
import { dispatcherNav } from './dispatcer'

export const Route = createFileRoute('/dispatcer/fakturace')({
  component: DispatcherInvoicingPage,
})

function DispatcherInvoicingPage() {
  const { isAuthenticated } = useConvexAuth()
  const allInvoices = useQuery(api.invoices.getAllInvoices)
  const allCustomers = useQuery(api.users.listUsersByRole, { role: 'customer' })
  const generateInvoice = useMutation(api.invoices.generateInvoiceForPeriod)
  const updateInvoiceStatus = useMutation(api.invoices.updateInvoiceStatus)
  const [generating, setGenerating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null)

  if (!isAuthenticated || allInvoices === undefined) return <LoadingScreen />

  const corporateCustomers = (allCustomers ?? []).filter(c => c.corporateStatus === 'approved')

  const handleGenerate = async () => {
    if (!selectedCustomer) return
    setGenerating(true)
    setGeneratedMsg(null)
    try {
      const now = Date.now()
      const periodStart = now - 14 * 24 * 60 * 60 * 1000
      const invoiceId = await generateInvoice({
        customerId: selectedCustomer as Id<'users'>,
        periodStart,
        periodEnd: now,
      })
      if (invoiceId) {
        setGeneratedMsg('Faktura byla úspěšně vygenerována.')
      } else {
        setGeneratedMsg('Žádné nezafakturované zásilky za toto období.')
      }
    } catch (e: any) {
      setGeneratedMsg(`Chyba: ${e.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (invoiceId: string, status: string) => {
    await updateInvoiceStatus({ invoiceId: invoiceId as Id<'invoices'>, status: status as any })
  }

  const unpaid = allInvoices.filter(i => i.status !== 'paid')
  const totalUnpaid = unpaid.reduce((sum, i) => sum + i.totalAmount, 0)

  return (
    <AppShell navItems={dispatcherNav} title="Dispečer" primaryCount={4} subtitle="Řídicí centrum">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <PageHeader title="Fakturace" subtitle="14denní fakturace pro firemní zákazníky" />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Celkem faktur', value: allInvoices.length },
            { label: 'Nezaplaceno', value: unpaid.length, color: 'text-amber-400' },
            { label: 'Nezaplacená částka', value: `${totalUnpaid.toLocaleString('cs-CZ')} CZK`, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`font-heading text-xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Generate invoice */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="font-heading font-semibold mb-3">Vygenerovat fakturu</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vygeneruje fakturu za posledních 14 dní pro vybraného firemního zákazníka.
          </p>
          <div className="flex gap-3 flex-wrap">
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Vybrat zákazníka...</option>
              {corporateCustomers.map(c => (
                <option key={c._id} value={c._id}>
                  {c.companyName || c.name || c.email}
                </option>
              ))}
            </select>
            <button onClick={handleGenerate} disabled={generating || !selectedCustomer}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">
              {generating ? 'Generuji...' : 'Generovat fakturu'}
            </button>
          </div>
          {generatedMsg && (
            <p className="mt-3 text-sm text-green-400 bg-green-950/20 border border-green-700/30 rounded-lg px-3 py-2">
              {generatedMsg}
            </p>
          )}
        </div>

        {/* Invoice list */}
        <div>
          <h3 className="font-heading font-semibold mb-3">Všechny faktury</h3>
          {allInvoices.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Zatím žádné faktury</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allInvoices.map((inv) => (
                <div key={inv._id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm">#{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <span className="font-heading text-lg font-bold text-primary">
                      {inv.totalAmount.toLocaleString('cs-CZ')} {inv.currency}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                    <div>
                      <p className="mb-0.5">Období</p>
                      <p className="text-foreground text-sm">
                        {new Date(inv.periodStart).toLocaleDateString('cs-CZ')} – {new Date(inv.periodEnd).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <div>
                      <p className="mb-0.5">Splatnost</p>
                      <p className={`text-sm ${inv.status === 'overdue' ? 'text-destructive' : 'text-foreground'}`}>
                        {new Date(inv.dueDate).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inv.status === 'draft' && (
                      <button onClick={() => handleStatusChange(inv._id, 'sent')}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90">
                        Označit jako odesláno
                      </button>
                    )}
                    {inv.status === 'sent' && (
                      <button onClick={() => handleStatusChange(inv._id, 'paid')}
                        className="px-3 py-1.5 bg-green-700 text-white text-xs font-medium rounded-lg hover:bg-green-800">
                        ✓ Zaplaceno
                      </button>
                    )}
                    {inv.status === 'sent' && new Date(inv.dueDate) < new Date() && (
                      <button onClick={() => handleStatusChange(inv._id, 'overdue')}
                        className="px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-medium rounded-lg hover:bg-destructive/30 border border-destructive/30">
                        Po splatnosti
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
