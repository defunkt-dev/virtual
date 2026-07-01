import {
  observeWindowOffset,
  observeWindowRect,
  windowScroll,
} from '@tanstack/virtual-core'
import type { VirtualizerOptions } from '@tanstack/virtual-core'

// The subset of tag input that maps onto virtual-core options. Kept here
// (rather than imported from index.marko) so this helper has no dependency
// on the Marko template's generated types.
export interface WindowVirtualizerInput {
  count: number
  estimateSize?: (index: number) => number
  overscan?: number
  paddingStart?: number
  paddingEnd?: number
  scrollPaddingStart?: number
  scrollPaddingEnd?: number
  gap?: number
  lanes?: number
  // Window viewport size for the render-time (server / pre-mount) slice. When omitted,
  // virtual-core's default 0x0 rect yields an empty window (totalSize is still correct).
  // The window scroll position (initialOffset) is read from window.scrollY on the client
  // and defaults to 0 (top) on the server.
  initialRect?: { width: number; height: number }
}

// Single source of truth for the input -> virtual-core option mapping,
// shared by the render-time seed, onMount (construction) and onUpdate (setOptions).
export function buildOptions(
  input: WindowVirtualizerInput,
  notify: () => void,
): VirtualizerOptions<Window, Element> {
  return {
    count: input.count,
    estimateSize: input.estimateSize ?? (() => 50),
    getScrollElement: () => (typeof document !== 'undefined' ? window : null),
    overscan: input.overscan ?? 5,
    paddingStart: input.paddingStart,
    paddingEnd: input.paddingEnd,
    scrollPaddingStart: input.scrollPaddingStart,
    scrollPaddingEnd: input.scrollPaddingEnd,
    gap: input.gap,
    lanes: input.lanes,
    initialOffset: () => (typeof document !== 'undefined' ? window.scrollY : 0),
    initialRect: input.initialRect,
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
    onChange: notify,
  }
}
