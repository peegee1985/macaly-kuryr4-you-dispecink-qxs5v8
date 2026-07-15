// Kuryr4You Push Notification Service Worker
self.addEventListener('push', function(event) {
  let data = { title: 'Kuryr4You', body: 'Nová notifikace', url: '/', tag: 'default' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  console.log('[SW] Push received:', data)

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

self.addEventListener('install', function() {
  console.log('[SW] Service worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  console.log('[SW] Service worker activated')
  event.waitUntil(clients.claim())
})
