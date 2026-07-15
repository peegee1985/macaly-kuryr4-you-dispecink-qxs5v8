import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { MacalyBridge } from '@macaly/bridge'
import { ConvexClientProvider } from '@/components/convex-client-provider'

import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kuryr4You Dispečink' },
      { name: 'description', content: 'Dispečerský systém kurýrní přepravy' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'K4Y Dispečink' },
      { name: 'theme-color', content: '#0d0d0d' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous' as const,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

const ANTI_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('k4y-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Anti-flash: apply theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <MacalyBridge>
        <body>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
          <Scripts />
        </body>
      </MacalyBridge>
    </html>
  )
}
