import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/ochrana-soukromi')({
  head: () => ({
    meta: [
      { title: 'Zásady ochrany osobních údajů – Kurýr4You' },
      {
        name: 'description',
        content:
          'Zásady ochrany osobních údajů platformy Kurýr4You a mobilní aplikace Kuryr4You Řidič. Jaké údaje zpracováváme, proč a jaká máte práva.',
      },
    ],
  }),
  component: PrivacyPolicyPage,
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Zpět na hlavní stránku
        </Link>
        <h1 className="text-3xl font-bold mt-6 mb-2">Zásady ochrany osobních údajů</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Platí pro web kuryr4you.cz a mobilní aplikace Kuryr4You Řidič a Kuryr4You Dispečink.
          Poslední aktualizace: 18. 7. 2026
        </p>

        <Section title="1. Správce osobních údajů">
          <p>
            Správcem osobních údajů je provozovatel platformy Kurýr4You. V záležitostech ochrany
            osobních údajů nás můžete kontaktovat na e-mailu{' '}
            <a href="mailto:info@kuryr4you.cz" className="text-primary hover:underline">
              info@kuryr4you.cz
            </a>
            .
          </p>
        </Section>

        <Section title="2. Jaké údaje zpracováváme">
          <p>
            <strong className="text-foreground">Účet a profil:</strong> e-mailová adresa, jméno,
            telefonní číslo, role (zákazník / řidič / dispečer) a u řidičů údaje o vozidle (typ,
            SPZ).
          </p>
          <p>
            <strong className="text-foreground">Zakázky a doručení:</strong> adresy vyzvednutí a
            doručení, kontaktní údaje příjemce, poznámky k zásilce, fotografie a podpis jako doklad
            o doručení (POD).
          </p>
          <p>
            <strong className="text-foreground">Poloha řidiče:</strong> mobilní aplikace Kuryr4You
            Řidič odesílá GPS polohu pouze během aktivní směny a otevřené aplikace, a to za účelem
            dispečinku, navigace a sledování zásilky zákazníkem. Polohu na pozadí aplikace
            nesleduje.
          </p>
          <p>
            <strong className="text-foreground">Platby:</strong> platby zpracovává společnost
            Stripe; čísla platebních karet se na naše servery nikdy neukládají.
          </p>
        </Section>

        <Section title="3. Účely a právní základ zpracování">
          <p>
            Údaje zpracováváme pro plnění smlouvy (zprostředkování a realizace přepravy zásilek),
            pro splnění právních povinností (účetnictví, fakturace) a na základě oprávněného zájmu
            (zabezpečení platformy, řešení sporů a reklamací).
          </p>
        </Section>

        <Section title="4. Komu údaje předáváme">
          <p>
            Data jsou uložena u poskytovatele cloudové databáze Convex (Convex, Inc.). Platební
            údaje zpracovává Stripe, Inc. Údaje o doručení (jméno, adresa, telefon příjemce) jsou
            zpřístupněny řidiči, který zakázku realizuje. Údaje neprodáváme ani nepředáváme třetím
            stranám pro marketingové účely.
          </p>
        </Section>

        <Section title="5. Doba uchování">
          <p>
            Údaje o zakázkách a doklady o doručení uchováváme po dobu nezbytnou pro plnění smlouvy
            a zákonných povinností (zpravidla 5 let dle účetních předpisů). Účet a profil
            uchováváme po dobu existence účtu; po jeho zrušení údaje smažeme nebo anonymizujeme.
          </p>
        </Section>

        <Section title="6. Vaše práva">
          <p>
            Podle nařízení GDPR máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení
            zpracování, přenositelnost a právo vznést námitku. Máte také právo podat stížnost u
            Úřadu pro ochranu osobních údajů (uoou.gov.cz). Žádosti vyřizujeme na e-mailu{' '}
            <a href="mailto:info@kuryr4you.cz" className="text-primary hover:underline">
              info@kuryr4you.cz
            </a>
            .
          </p>
        </Section>

        <Section title="7. Smazání účtu a dat">
          <p>
            O smazání účtu a souvisejících osobních údajů můžete požádat přímo v aplikaci v sekci
            Profil, nebo e-mailem na{' '}
            <a href="mailto:info@kuryr4you.cz" className="text-primary hover:underline">
              info@kuryr4you.cz
            </a>
            . Žádost vyřídíme nejpozději do 30 dnů.
          </p>
        </Section>

        <Section title="8. Zabezpečení">
          <p>
            Veškerá komunikace mezi aplikacemi a servery probíhá šifrovaně (HTTPS/TLS).
            Přihlašovací údaje jsou v mobilní aplikaci uloženy v zabezpečeném úložišti systému
            Android (SecureStore). Přístup k datům mají pouze oprávněné role (dispečer, přiřazený
            řidič).
          </p>
        </Section>
      </div>
    </div>
  )
}
