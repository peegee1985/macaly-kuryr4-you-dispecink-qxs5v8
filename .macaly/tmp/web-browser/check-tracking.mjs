export default async function ({ page, appUrl, screenshot }) {
  // First login as dispatcher to get a real tracking token
  await page.goto(new URL('/prihlaseni', appUrl).toString(), { waitUntil: 'networkidle' })
  const loginUrl = page.url()
  
  // Try going to dispatcer zasilky to find a real ride
  await page.goto(new URL('/dispatcer/zasilky', appUrl).toString(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const dispUrl = page.url()
  const title = await page.title()
  
  // Check if there are tracking links visible
  const trackingLinks = await page.locator('a[href*="sledovani"]').all()
  const trackingHrefs = await Promise.all(trackingLinks.map(l => l.getAttribute('href')))
  
  const sc1 = await screenshot({ filename: 'zasilky.jpg' })
  
  // If we got a tracking token, test the tracking page
  let trackingResult = null
  if (trackingHrefs.length > 0) {
    const firstToken = trackingHrefs[0]
    await page.goto(new URL(firstToken, appUrl).toString(), { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    
    const heading = await page.locator('h1, h2').first().textContent().catch(() => null)
    const errorMsg = await page.locator('text=nenalezena, text=nenalezen').first().textContent().catch(() => null)
    const sc2 = await screenshot({ filename: 'tracking-page.jpg' })
    
    trackingResult = { url: page.url(), heading, errorMsg, screenshot: sc2 }
  }
  
  return {
    loginUrl,
    dispUrl,
    title,
    trackingHrefs,
    trackingResult,
    screenshot: sc1
  }
}
