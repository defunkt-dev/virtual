// Unit tests for the input -> virtual-core option mapping (buildOptions).
// Verifies the SSR knobs (initialRect, initialOffset) are plumbed through. Combined with
// the Node-level proof that virtual-core turns initialRect/initialOffset into a correct
// pre-mount slice, this covers the render-time seed's inputs without needing a DOM.
import { describe, expect, test } from 'vitest'
import { buildOptions } from '../src/tags/virtualizer/options'

describe('buildOptions — input to virtual-core option mapping', () => {
  const noop = () => {}

  test('maps initialRect through (the SSR slice knob)', () => {
    const opts = buildOptions(
      {
        count: 1000,
        estimateSize: () => 40,
        getScrollElement: () => null,
        initialRect: { width: 800, height: 400 },
      },
      noop,
    )
    expect(opts.initialRect).toEqual({ width: 800, height: 400 })
    expect(opts.count).toBe(1000)
    expect(opts.onChange).toBe(noop)
  })

  test('maps initialOffset through (the SSR start-position knob)', () => {
    const opts = buildOptions(
      { count: 10, getScrollElement: () => null, initialOffset: 1200 },
      noop,
    )
    expect(opts.initialOffset).toBe(1200)
  })

  test('initialRect is undefined when omitted (core applies its 0x0 default)', () => {
    const opts = buildOptions({ count: 10, getScrollElement: () => null }, noop)
    expect(opts.initialRect).toBeUndefined()
  })

  test('defaults: estimateSize 50, overscan 5, horizontal false', () => {
    const opts = buildOptions({ count: 10, getScrollElement: () => null }, noop)
    expect(opts.estimateSize(0)).toBe(50)
    expect(opts.overscan).toBe(5)
    expect(opts.horizontal).toBe(false)
  })
})
