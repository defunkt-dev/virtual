// Unit tests for the input -> virtual-core option mapping (buildOptions).
// Verifies the SSR knobs (initialRect, initialOffset) are plumbed through. Combined with
// the Node-level proof that virtual-core turns initialRect/initialOffset into a correct
// pre-mount slice, this covers the render-time seed's inputs without needing a DOM.
import { describe, expect, test } from 'vitest'
import { observeWindowRect, windowScroll } from '@tanstack/virtual-core'
import { buildOptions } from '../src/tags/virtualizer/options'
import { buildOptions as buildWindowOptions } from '../src/tags/window-virtualizer/options'

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

  test('maps every optional prop through when provided', () => {
    const getItemKey = (i: number) => `k${i}`
    const rangeExtractor = () => [0]
    const cache = [
      { index: 0, start: 0, size: 32, end: 32, key: 0, lane: 0 },
    ]
    const opts = buildOptions(
      {
        count: 500,
        estimateSize: () => 32,
        getScrollElement: () => null,
        overscan: 10,
        horizontal: true,
        paddingStart: 8,
        paddingEnd: 16,
        scrollPaddingStart: 4,
        scrollPaddingEnd: 12,
        gap: 6,
        lanes: 3,
        initialOffset: 1200,
        initialRect: { width: 640, height: 480 },
        getItemKey,
        rangeExtractor,
        indexAttribute: 'data-row-index',
        initialMeasurementsCache: cache,
        anchorTo: 'end',
        followOnAppend: 'smooth',
        scrollEndThreshold: 24,
      },
      noop,
    )
    expect(opts.estimateSize(0)).toBe(32)
    expect(opts.overscan).toBe(10)
    expect(opts.horizontal).toBe(true)
    expect(opts.paddingStart).toBe(8)
    expect(opts.paddingEnd).toBe(16)
    expect(opts.scrollPaddingStart).toBe(4)
    expect(opts.scrollPaddingEnd).toBe(12)
    expect(opts.gap).toBe(6)
    expect(opts.lanes).toBe(3)
    expect(opts.initialOffset).toBe(1200)
    expect(opts.initialRect).toEqual({ width: 640, height: 480 })
    expect(opts.getItemKey).toBe(getItemKey)
    expect(opts.rangeExtractor).toBe(rangeExtractor)
    expect(opts.indexAttribute).toBe('data-row-index')
    expect(opts.initialMeasurementsCache).toBe(cache)
    expect(opts.anchorTo).toBe('end')
    expect(opts.followOnAppend).toBe('smooth')
    expect(opts.scrollEndThreshold).toBe(24)
  })

  test('new optional props stay undefined when omitted (core applies its defaults)', () => {
    const opts = buildOptions({ count: 10, getScrollElement: () => null }, noop)
    expect(opts.getItemKey).toBeUndefined()
    expect(opts.rangeExtractor).toBeUndefined()
    expect(opts.indexAttribute).toBeUndefined()
    expect(opts.initialMeasurementsCache).toBeUndefined()
    expect(opts.anchorTo).toBeUndefined()
    expect(opts.followOnAppend).toBeUndefined()
    expect(opts.scrollEndThreshold).toBeUndefined()
  })
})

describe('buildOptions (window) — input to virtual-core option mapping', () => {
  const noop = () => {}

  test('wires the window observers and scroll fn', () => {
    const opts = buildWindowOptions({ count: 10 }, noop)
    expect(opts.observeElementRect).toBe(observeWindowRect)
    expect(opts.scrollToFn).toBe(windowScroll)
    // window offset is derived internally (window.scrollY / 0), so it is a function, not a number
    expect(typeof opts.initialOffset).toBe('function')
  })

  test('maps every optional prop through when provided (no horizontal/initialOffset)', () => {
    const getItemKey = (i: number) => `k${i}`
    const rangeExtractor = () => [0]
    const cache = [
      { index: 0, start: 0, size: 32, end: 32, key: 0, lane: 0 },
    ]
    const opts = buildWindowOptions(
      {
        count: 500,
        estimateSize: () => 32,
        overscan: 10,
        paddingStart: 8,
        paddingEnd: 16,
        scrollPaddingStart: 4,
        scrollPaddingEnd: 12,
        gap: 6,
        lanes: 3,
        initialRect: { width: 1280, height: 800 },
        getItemKey,
        rangeExtractor,
        indexAttribute: 'data-col-index',
        initialMeasurementsCache: cache,
        anchorTo: 'end',
        followOnAppend: true,
        scrollEndThreshold: 24,
      },
      noop,
    )
    expect(opts.estimateSize(0)).toBe(32)
    expect(opts.overscan).toBe(10)
    expect(opts.paddingStart).toBe(8)
    expect(opts.paddingEnd).toBe(16)
    expect(opts.scrollPaddingStart).toBe(4)
    expect(opts.scrollPaddingEnd).toBe(12)
    expect(opts.gap).toBe(6)
    expect(opts.lanes).toBe(3)
    expect(opts.initialRect).toEqual({ width: 1280, height: 800 })
    expect(opts.getItemKey).toBe(getItemKey)
    expect(opts.rangeExtractor).toBe(rangeExtractor)
    expect(opts.indexAttribute).toBe('data-col-index')
    expect(opts.initialMeasurementsCache).toBe(cache)
    expect(opts.anchorTo).toBe('end')
    expect(opts.followOnAppend).toBe(true)
    expect(opts.scrollEndThreshold).toBe(24)
  })
})
