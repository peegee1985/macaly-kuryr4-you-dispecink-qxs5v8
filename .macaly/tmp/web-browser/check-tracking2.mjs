export default async function ({ page, appUrl, screenshot }) {
  // Test tracking page with fake token first
  await page.goto(new URL('/sledovani/testtoken123', appUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(4000)
  const bodyText = await page.locator('body').textContent().catch(() => '')
  const sc = await screenshot({ filename: 'tracking-fake.jpg' })

  return {
    url: page.url(),
    bodyText: bodyText.slice(0, 500),
    screenshot: sc
  }
}
