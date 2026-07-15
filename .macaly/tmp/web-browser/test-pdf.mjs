export default async function ({ page, appUrl, screenshot }) {
  const logs = []
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }))
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }))

  // Navigate to app root
  await page.goto(new URL('/', appUrl).toString(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Inject a quick jsPDF + autoTable test
  const result = await page.evaluate(async () => {
    try {
      const { jsPDF } = await import('/node_modules/.vite/deps/jspdf.js').catch(() => ({ jsPDF: null }))
      if (!jsPDF) return { error: 'Cannot import jsPDF directly' }
      
      // Fetch font
      const res = await fetch('/fonts/Roboto-Regular.ttf')
      if (!res.ok) return { error: `Font fetch failed: ${res.status}` }
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const CHUNK = 8192
      const chunks = []
      for (let i = 0; i < bytes.length; i += CHUNK) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
      }
      const b64 = btoa(chunks.join(''))
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      doc.addFileToVFS('Roboto-Regular.ttf', b64)
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
      doc.setFont('Roboto', 'normal')
      doc.text('Test Czech: áčěíšžřůý', 20, 20)
      
      return { success: true, fontList: Object.keys(doc.getFontList()) }
    } catch (e) {
      return { error: e.message, stack: e.stack?.substring(0, 500) }
    }
  })

  return { result, logs: logs.slice(0, 30) }
}
