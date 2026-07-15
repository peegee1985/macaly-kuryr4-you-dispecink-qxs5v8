import { customerNav } from './zakaznik'
import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { AppShell, LoadingScreen, PageHeader, StatusBadge } from '@/components/AppShell'

export const Route = createFileRoute('/zakaznik/faktury')({
  component: CustomerInvoicesPage,
})

function CustomerInvoicesPage() {
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.getMe)
  const invoices = useQuery(api.invoices.getMyInvoices)
  const documents = useQuery(api.documents.getMyDocuments)

  if (!isAuthenticated || me === undefined || invoices === undefined || documents === undefined) return <LoadingScreen />
  if (!me) return null

  const totalUnpaid = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0)

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
        <PageHeader title="Faktury & Dokumenty" subtitle="Firemní faktury a dokumenty od dispečera" />

        {/* Uploaded documents from dispatcher */}
        <section>
          <h2 className="font-heading font-semibold text-base mb-3 flex items-center gap-2">
            <span className="text-primary">📁</span> Dokumenty od dispečera
          </h2>
          {documents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="text-3xl mb-2">📂</div>
              <p className="text-muted-foreground text-sm">Zatím žádné dokumenty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
                      📄
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.filename}</p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Stáhnout
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Corporate invoices */}
        {me.corporateStatus !== 'approved' ? (
          <section>
            <h2 className="font-heading font-semibold text-base mb-3 flex items-center gap-2">
              <span className="text-primary">🏢</span> Firemní faktury
            </h2>
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="font-heading text-lg font-semibold mb-2">Firemní účet vyžadován</h3>
              <p className="text-muted-foreground text-sm">
                {me.corporateStatus === 'pending'
                  ? 'Vaše žádost o firemní účet je zpracovávána. Faktury budou dostupné po schválení.'
                  : 'Pro přístup k fakturám musíte mít schválený firemní účet.'}
              </p>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="font-heading font-semibold text-base mb-3 flex items-center gap-2">
              <span className="text-primary">🏢</span> Firemní faktury
            </h2>

            {totalUnpaid > 0 && (
              <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-4 mb-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-amber-300">Nesplacené faktury</p>
                  <p className="text-sm text-amber-400/80">Celkem {totalUnpaid.toLocaleString('cs-CZ')} CZK k úhradě</p>
                </div>
              </div>
            )}

            {invoices.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-muted-foreground">Zatím žádné faktury</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv._id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm">#{inv.invoiceNumber}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <span className="font-heading text-lg font-bold text-primary">
                        {inv.totalAmount.toLocaleString('cs-CZ')} {inv.currency}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
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
                      {inv.notes && (
                        <div>
                          <p className="mb-0.5">Poznámka</p>
                          <p className="text-foreground text-sm">{inv.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
