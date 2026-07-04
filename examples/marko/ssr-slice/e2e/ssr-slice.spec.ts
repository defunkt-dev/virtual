import { expect, test } from '@playwright/test'

// Browser gate for the ssr-slice example (Mode C): fetch on server + initialRect, so
// the server PAINTS the initial visible rows into the HTML. The client resumes,
// measures the real element, and takes over.
//
// Raw-HTML rules: emails are whole-string interpolations and survive contiguously;
// 'personN@' is prefix-safe (the @ terminates the id). Rect 800x400 at 48px rows +
// overscan 5 paints roughly ids 1..14 — assert well inside and well outside that.

const consoleErrors: string[] = []

test.beforeEach(({ page }) => {
  consoleErrors.length = 0
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.includes('WebSocket') || text.includes('[vite]')) return
    if (message.location().url.endsWith('/favicon.ico')) return
    consoleErrors.push(text)
  })
  page.on('pageerror', (error) => {
    consoleErrors.push(String(error))
  })
})

test.afterEach(() => {
  expect(consoleErrors).toEqual([])
})

test('server HTML contains the painted slice: first rows present, deep rows absent, real total size', async ({
  request,
}) => {
  const res = await request.get('/')
  expect(res.ok()).toBe(true)
  const html = await res.text()
  // The slice is IN the server HTML (rows exist pre-JS)...
  expect(html).toContain('item-even')
  expect(html).toContain('person1@example.com')
  expect(html).toContain('person5@example.com')
  // ...it is a SLICE, not the whole list, in the painted rows. (Unpainted people
  // live only in the serialized resume payload — Marko does not duplicate painted
  // rows there — so absence is asserted on ROW markup: an email inside a rendered
  // .email span.) Positive control first, so the pattern is proven to match real
  // painted rows and the absence check cannot pass vacuously.
  expect(html).toMatch(/class="?email"?[^<]*>[^<]*person1@example\.com/)
  expect(html).not.toMatch(/class="?email"?[^<]*>[^<]*person500@example\.com/)
  // ...and the wrapper carries the REAL total (1000 x 48), not the trivial 0.
  expect(html).toContain('height: 48000px')
})

test('with JavaScript disabled the painted rows exist in the DOM (streaming swap is JS-dependent)', async ({
  browser,
}) => {
  // The example uses <try>/<await> with a placeholder, so Marko streams the awaited
  // content OUT-OF-ORDER inside a hidden wrapper and swaps it into place with a tiny
  // inline script. With JS disabled that swap never runs — and the streamed markup
  // has ALSO already hidden the placeholder — so the page renders visibly BLANK
  // while the server-painted rows sit complete in the DOM (the view-source test
  // proves they are in the HTML). This characterizes the platform contract:
  // out-of-order <await> pages are not no-JS pages; fully script-less VISIBLE rows
  // would require in-order rendering (no placeholder).
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  expect(
    await page.locator('.email', { hasText: 'person1@example.com' }).count(),
  ).toBe(1)
  expect(await page.locator('.item').count()).toBeGreaterThan(5)
  // Placeholder hidden too — nothing is visible without JS.
  await expect(page.getByText('Loading people')).toBeHidden()
  await context.close()
})

test('client resumes over the server slice and the list is live (scroll re-windows, no re-fetch flash)', async ({
  page,
}) => {
  await page.goto('/')
  // The server rows are (still) there post-resume.
  await expect(page.locator('.email', { hasText: 'person1@example.com' })).toBeVisible()

  // Liveness: scroll deep; the window advances.
  await page.locator('.scroll-container').evaluate((el) => {
    el.scrollTop = 700 * 48
  })
  await expect(page.locator('.email', { hasText: 'person701@example.com' })).toBeVisible()
  await expect(page.locator('.email', { hasText: 'person1@example.com' })).toHaveCount(0)

  // And back to the top: the original slice re-renders (round trip).
  await page.locator('.scroll-container').evaluate((el) => {
    el.scrollTop = 0
  })
  await expect(page.locator('.email', { hasText: 'person1@example.com' })).toBeVisible()
})
