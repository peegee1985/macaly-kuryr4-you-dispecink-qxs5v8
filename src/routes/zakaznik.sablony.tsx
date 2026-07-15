import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { AppShell, PageHeader } from '@/components/AppShell'
import { customerNav } from './zakaznik'

export const Route = createFileRoute('/zakaznik/sablony')({
  component: TemplatesPage,
})

const CARGO_LABELS: Record<string, string> = {
  envelope: 'Obálka', parcel: 'Balík', box: 'Krabice', pallet: 'Paleta', other: 'Jiné',
}

function TemplatesPage() {
  const templates = useQuery(api.templates.listMyTemplates)
  const deleteTemplate = useMutation(api.templates.deleteTemplate)
  const toggleTemplate = useMutation(api.templates.toggleTemplate)

  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: Id<'recurringRides'>) => {
    if (!confirm('Opravdu smazat šablonu?')) return
    setDeleting(id)
    try {
      await deleteTemplate({ templateId: id })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AppShell navItems={customerNav} title="Zákazník" subtitle="Zákaznický portál" primaryCount={5}>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <PageHeader
          title="Šablony zásilek"
          subtitle="Uložené trasy pro opakované objednávky"
          action={
            <Link to="/zakaznik/nova-zasilka"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 text-sm">
              + Nová zásilka
            </Link>
          }
        />

        {templates === undefined && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {templates?.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-heading font-bold text-lg mb-2">Zatím žádné šablony</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Při zadávání zásilky zaškrtněte „Uložit jako šablonu" a příště objednáte jedním kliknutím.
            </p>
            <Link to="/zakaznik/nova-zasilka"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 text-sm">
              Zadat první zásilku →
            </Link>
          </div>
        )}

        {templates && templates.length > 0 && (
          <div className="grid gap-4">
            {templates.map(t => (
              <div key={t._id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-bold truncate">{t.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        t.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-muted text-muted-foreground'
                      }`}>
                        {t.active ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {CARGO_LABELS[t.rideTemplate.cargoType] ?? t.rideTemplate.cargoType} · {t.rideTemplate.quantity}× 
                      {t.rideTemplate.weight ? ` · ${t.rideTemplate.weight} kg` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleTemplate({ templateId: t._id, active: !t.active })}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      {t.active ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                    <button
                      onClick={() => handleDelete(t._id as Id<'recurringRides'>)}
                      disabled={deleting === t._id}
                      className="px-3 py-1.5 bg-red-950/30 text-red-400 text-xs font-medium rounded-lg hover:bg-red-950/50 border border-red-900/30 disabled:opacity-40 transition-colors"
                    >
                      {deleting === t._id ? '…' : 'Smazat'}
                    </button>
                  </div>
                </div>

                {/* Route info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary border-2 border-primary" />
                    <div className="w-0.5 h-6 bg-border" />
                    <div className="w-2 h-2 rounded-full bg-green-500 border-2 border-green-500" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Vyzvednutí</p>
                      <p className="truncate">{t.rideTemplate.pickupAddress}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Doručení</p>
                      <p className="truncate">{t.rideTemplate.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Use template button */}
                <Link
                  to="/zakaznik/nova-zasilka"
                  search={{ template: t._id }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  📦 Objednat znovu
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
