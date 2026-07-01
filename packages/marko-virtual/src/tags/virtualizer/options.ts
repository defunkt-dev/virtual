import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/virtual-core'
import type { VirtualItem, VirtualizerOptions } from '@tanstack/virtual-core'

// The subset of tag input that maps onto virtual-core options. Kept here
// (rather than imported from index.marko) so this helper has no dependency
// on the Marko template's generated types.
export interface VirtualizerInput {
  count: number
  estimateSize?: (index: number) => number
  getScrollElement: () => Element | null
  overscan?: number
  horizontal?: boolean
  paddingStart?: number
  paddingEnd?: number
  scrollPaddingStart?: number
  scrollPaddingEnd?: number
  gap?: number
  lanes?: number
  initialOffset?: number | (() => number)
  // Viewport size used for the render-time (server / pre-mount) slice. When omitted,
  // virtual-core's default 0x0 rect yields an empty window (totalSize is still correct).
  initialRect?: { width: number; height: number }
}

// Single source of truth for the input -> virtual-core option mapping,
// shared by the render-time seed, onMount (construction) and onUpdate (setOptions).
export function buildOptions(
  input: VirtualizerInput,
  notify: () => void,
): VirtualizerOptions<Element, Element> {
  return {
    count: input.count,
    estimateSize: input.estimateSize ?? (() => 50),
    getScrollElement: input.getScrollElement,
    overscan: input.overscan ?? 5,
    horizontal: input.horizontal ?? false,
    paddingStart: input.paddingStart,
    paddingEnd: input.paddingEnd,
    scrollPaddingStart: input.scrollPaddingStart,
    scrollPaddingEnd: input.scrollPaddingEnd,
    gap: input.gap,
    lanes: input.lanes,
    initialOffset: input.initialOffset,
    initialRect: input.initialRect,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: notify,
  }
}

// Render-time (server / pre-mount) slice. Constructs a transient virtual-core instance,
// reads the initial window as PLAIN DATA, and discards it — nothing live is retained, so
// nothing live is serialized, and the values recompute identically on resume. With
// `initialRect` this is a real slice of rows; without it the window is empty but the
// totalSize (count x estimateSize) is still correct. The constructor and
// getVirtualItems()/getTotalSize() are SSR-safe (no DOM access); getScrollElement is forced
// to null so the probe never touches the scroll element, which does not exist on the server.
export function renderSlice(
  input: VirtualizerInput,
): { items: VirtualItem[]; size: number } {
  // Opt-in: without an explicit viewport hint there is no server slice. Returning the
  // trivial window keeps every example that does not pass `initialRect` byte-for-byte
  // identical to a client-only build (empty container, filled on mount).
  if (!input.initialRect) {
    return { items: [], size: 0 }
  }
  const probe = new Virtualizer<Element, Element>(
    buildOptions({ ...input, getScrollElement: () => null }, () => {}),
  )
  return { items: probe.getVirtualItems(), size: probe.getTotalSize() }
}
