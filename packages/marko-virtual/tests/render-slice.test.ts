import { describe, expect, it } from 'vitest'
import { renderSlice as renderSliceElement } from '../src/tags/virtualizer/options'
import { renderSlice as renderSliceWindow } from '../src/tags/window-virtualizer/options'

// renderSlice is the render-time (server / pre-mount) seed: it builds a transient virtual-core
// instance, reads the initial window as plain data, and discards it. These tests pin its two
// contracts — the opt-in gate (no initialRect => trivial window, so non-SSR examples are
// unaffected) and the slice it produces when a viewport hint is given.

describe('renderSlice — element virtualizer', () => {
  const base = {
    count: 1000,
    estimateSize: () => 48,
    getScrollElement: () => null,
  }

  it('without initialRect returns the trivial window (client-only build parity)', () => {
    const { items, size } = renderSliceElement(base)
    expect(items).toEqual([])
    expect(size).toBe(0)
  })

  it('with initialRect paints a contiguous slice from index 0 and the full total size', () => {
    const { items, size } = renderSliceElement({
      ...base,
      initialRect: { width: 800, height: 400 },
    })
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]?.index).toBe(0)
    expect(items[items.length - 1]?.index).toBe(items.length - 1)
    expect(size).toBe(1000 * 48)
  })

  it('initialOffset shifts the slice away from the top', () => {
    const rect = { width: 800, height: 400 }
    const top = renderSliceElement({ ...base, initialRect: rect })
    const scrolled = renderSliceElement({
      ...base,
      initialRect: rect,
      initialOffset: 4800,
    })
    expect(top.items[0]?.index).toBe(0)
    expect(scrolled.items[0]?.index).toBeGreaterThan(0)
    expect(scrolled.size).toBe(top.size)
  })
})

describe('renderSlice — window virtualizer', () => {
  const base = {
    count: 1000,
    estimateSize: () => 48,
  }

  it('without initialRect returns the trivial window', () => {
    const { items, size } = renderSliceWindow(base)
    expect(items).toEqual([])
    expect(size).toBe(0)
  })

  it('with initialRect paints a contiguous slice from index 0 and the full total size', () => {
    const { items, size } = renderSliceWindow({
      ...base,
      initialRect: { width: 1280, height: 800 },
    })
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]?.index).toBe(0)
    expect(items[items.length - 1]?.index).toBe(items.length - 1)
    expect(size).toBe(1000 * 48)
  })
})
