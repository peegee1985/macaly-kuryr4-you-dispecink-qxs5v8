export default async function ({ page, appUrl, screenshot }) {
  await page.goto(new URL("/dispatcer/mapa", appUrl).toString(), { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(2000)
  const s1 = await screenshot({ fullPage: false })
  
  // Check CSS of map wrapper
  const mapWrapper = await page.locator('.leaflet-container').first()
  let wrapperStyle = null
  let popupPaneStyle = null
  try {
    wrapperStyle = await mapWrapper.evaluate(el => {
      const s = window.getComputedStyle(el)
      return { overflow: s.overflow, zIndex: s.zIndex, position: s.position }
    })
    popupPaneStyle = await page.locator('.leaflet-popup-pane').first().evaluate(el => {
      const s = window.getComputedStyle(el)
      return { overflow: s.overflow, zIndex: s.zIndex, position: s.position }
    }).catch(() => 'not found')
  } catch(e) {}
  
  return { wrapperStyle, popupPaneStyle, screenshot: s1.path }
}
