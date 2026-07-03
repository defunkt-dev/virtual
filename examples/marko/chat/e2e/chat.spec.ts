import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Browser gate for the chat example — the first consumer of the expanded tag surface.
// Verifies the scroll-behavior cluster that jsdom cannot: initial pin (scrollToEnd via the
// v.range-guarded script), followOnAppend, isAtEnd/scrollEndThreshold (status line),
// prepend anchoring under getItemKey, and the Latest affordance.

const AT_END_PX = 80

const consoleErrors: string[] = []

test.beforeEach(({ page }) => {
  consoleErrors.length = 0
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // Vite dev-server websocket noise only; everything else counts.
    if (text.includes('WebSocket') || text.includes('[vite]')) return
    // Chromium requests /favicon.ico unconditionally; the example (like its
    // siblings) ships none. Not an application resource — excluded.
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

async function distanceFromEnd(page: Page): Promise<number> {
  return page
    .locator('.messages')
    .evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)
}

async function waitForPin(page: Page) {
  await expect
    .poll(() => distanceFromEnd(page), { timeout: 5000 })
    .toBeLessThanOrEqual(AT_END_PX)
}

test('loads pinned to the newest message with status At latest', async ({ page }) => {
  await page.goto('/')
  await waitForPin(page)
  await expect(page.locator('[data-key="message-44"]')).toBeVisible()
  await expect(page.locator('[data-testid="status"]')).toHaveText('At latest')
  // the top of history is NOT rendered (virtualized away)
  await expect(page.locator('[data-key="message-0"]')).toHaveCount(0)
})

test('followOnAppend keeps the view pinned when a message is added at the end', async ({
  page,
}) => {
  await page.goto('/')
  await waitForPin(page)
  await page.locator('[data-testid="add-message"]').click()
  await expect(page.locator('[data-key="message-45"]')).toBeVisible()
  await waitForPin(page)
  await expect(page.locator('[data-testid="status"]')).toHaveText('At latest')
})

test('does NOT follow appends while reading history', async ({ page }) => {
  await page.goto('/')
  await waitForPin(page)
  // scroll to the middle of the thread
  await page.locator('.messages').evaluate((el) => {
    el.scrollTop = Math.floor(el.scrollHeight / 2)
  })
  await expect(page.locator('[data-testid="status"]')).toHaveText('Reading history')
  const before = await page.locator('.messages').evaluate((el) => el.scrollTop)
  await page.locator('[data-testid="add-message"]').click()
  // give any (incorrect) follow a chance to happen, then assert it did not
  await page.waitForTimeout(400)
  const after = await page.locator('.messages').evaluate((el) => el.scrollTop)
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1)
  await expect(page.locator('[data-key="message-45"]')).toHaveCount(0)
})

test('prepending history keeps the visible message anchored in place', async ({
  page,
}) => {
  await page.goto('/')
  await waitForPin(page)
  // move well away from the bottom so we are "reading history"
  await page.locator('.messages').evaluate((el) => {
    el.scrollTop = 300
  })
  await expect(page.locator('[data-testid="status"]')).toHaveText('Reading history')

  // pick a currently visible message and record its viewport position
  const anchor = page.locator('[data-key="message-6"]')
  await expect(anchor).toBeVisible()
  const beforeBox = await anchor.boundingBox()

  await page.locator('[data-testid="load-older"]').click()
  await expect(page.locator('[data-testid="status"]')).toHaveText('Loading history')
  // history rows (negative indexes) exist after the prepend lands
  await expect(page.locator('[data-key="message--1"]')).toBeAttached({ timeout: 3000 })

  const afterBox = await anchor.boundingBox()
  expect(afterBox).not.toBeNull()
  expect(Math.abs(afterBox!.y - beforeBox!.y)).toBeLessThanOrEqual(2)
})

test('scrolling near the top auto-loads older history', async ({ page }) => {
  await page.goto('/')
  await waitForPin(page)
  // wait past the 250ms arming delay
  await page.waitForTimeout(400)
  await page.locator('.messages').evaluate((el) => {
    el.scrollTop = 60
  })
  await expect(page.locator('[data-key="message--1"]')).toBeAttached({ timeout: 3000 })
})

test('Latest returns to the bottom and status flips back to At latest', async ({
  page,
}) => {
  await page.goto('/')
  await waitForPin(page)
  await page.locator('.messages').evaluate((el) => {
    el.scrollTop = 0
  })
  await expect(page.locator('[data-testid="status"]')).toHaveText(/Reading history|Loading history/)
  await page.locator('[data-testid="latest"]').click()
  await waitForPin(page)
  await expect(page.locator('[data-testid="status"]')).toHaveText('At latest')
  await expect(page.locator('[data-key^="message-4"]').last()).toBeVisible()
})

test('a reply streamed from the server grows progressively and stays pinned', async ({
  page,
}) => {
  await page.goto('/')
  await waitForPin(page)
  const replyResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/reply') && response.status() === 200,
  )
  await page.locator('[data-testid="stream-reply"]').click()
  await replyResponse // the reply really comes over the network
  const streamed = page.locator('[data-key^="stream-"]')
  await expect(streamed).toBeVisible()
  // progressive: the first chunk is rendered while later chunks have not arrived yet
  await expect(streamed).toContainText('Thinking through the failure mode.')
  const early = (await streamed.textContent()) ?? ''
  expect(early).not.toContain('drifting off the bottom')
  // ... and the rest arrives afterwards, growing the same row
  await expect(streamed).toContainText('drifting off the bottom', { timeout: 5000 })
  await waitForPin(page)
  await expect(page.locator('[data-testid="status"]')).toHaveText('At latest')
})
