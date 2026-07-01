---
title: Marko Virtual
---

# Marko Virtual

`@tanstack/marko-virtual` is the Marko 6 adapter for TanStack Virtual. It provides
row, column, and grid virtualisation via two auto-discovered Marko tags:

- **`<virtualizer>`** — element-based scrolling (rows, columns, grids)
- **`<window-virtualizer>`** — full-page/window scrolling

Tags are discovered automatically by the Marko compiler when the package is
installed. No imports are needed in your `.marko` files.

Each tag is used **self-closing** and exposes a **tag variable** (written `<virtualizer/v/>`).
You then own the markup, reading `v.virtualItems` and `v.totalSize` to render the visible rows.

## Installation

```sh
npm install @tanstack/marko-virtual
```

## Row virtualisation

```marko
<div/scrollEl
  style="height: 400px; width: 400px; overflow-y: auto; position: relative;"
>
  <virtualizer/v
    count=10000
    estimateSize=() => 35
    getScrollElement=() => scrollEl()
  />
  <div style=`height: ${v.totalSize}px; width: 100%; position: relative`>
    <for|item| of=v.virtualItems>
      <div
        style=`
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: ${item.size}px;
          transform: translateY(${item.start}px);
        `
      >
        Row ${item.index}
      </div>
    </for>
  </div>
</div>
```

## Column virtualisation

Same tag, `horizontal=true`:

```marko
<div/scrollEl
  style="width: 400px; height: 100px; overflow-x: auto; position: relative;"
>
  <virtualizer/v
    count=10000
    estimateSize=() => 100
    horizontal=true
    getScrollElement=() => scrollEl()
  />
  <div style=`width: ${v.totalSize}px; height: 100%; position: relative`>
    <for|item| of=v.virtualItems>
      <div
        style=`
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: ${item.size}px;
          transform: translateX(${item.start}px);
        `
      >
        Column ${item.index}
      </div>
    </for>
  </div>
</div>
```

## Grid virtualisation

Compose two `<virtualizer>` tags — one for rows, one for columns — sharing the
same scroll element. Each returns its own tag variable. Pass `getScrollElement` as an
arrow (`() => ref()`) so each virtualizer resolves its own element:

```marko
<div/scrollEl
  style="height: 500px; width: 500px; overflow: auto; position: relative;"
>
  <virtualizer/rowV
    count=10000
    estimateSize=() => 35
    getScrollElement=() => scrollEl()
  />
  <virtualizer/colV
    count=200
    estimateSize=() => 100
    horizontal=true
    getScrollElement=() => scrollEl()
  />
  <div style=`height: ${rowV.totalSize}px; width: ${colV.totalSize}px; position: relative`>
    <for|row| of=rowV.virtualItems>
      <for|col| of=colV.virtualItems>
        <div
          style=`
            position: absolute;
            top: 0;
            left: 0;
            width: ${col.size}px;
            height: ${row.size}px;
            transform: translateX(${col.start}px) translateY(${row.start}px);
          `
        >
          Cell ${row.index}, ${col.index}
        </div>
      </for>
    </for>
  </div>
</div>
```

## Window virtualisation

Use `<window-virtualizer>` when the entire page scrolls rather than a container:

```marko
<window-virtualizer/v
  count=10000
  estimateSize=() => 35
/>
<div style=`height: ${v.totalSize}px; position: relative`>
  <for|item| of=v.virtualItems>
    <div
      style=`
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: ${item.size}px;
        transform: translateY(${item.start}px);
      `
    >
      Row ${item.index}
    </div>
  </for>
</div>
```

## Dynamic / variable item sizes

For items with unknown heights, use `measureElement` as a `<script>`-driven ref
to measure each element after render:

```marko
<div/scrollEl style="height: 400px; overflow-y: auto">
  <virtualizer/v
    count=data.length
    estimateSize=() => 50
    getScrollElement=() => scrollEl()
  />
  <div style=`height: ${v.totalSize}px; position: relative`>
    <for|item| of=v.virtualItems>
      <div/el
        data-index=item.index
        style=`position: absolute; top: 0; width: 100%; transform: translateY(${item.start}px)`>
        <script() {
          // re-run when the item changes; measureElement reads the rendered
          // height and feeds it back to the virtualizer
          const _key = item.key
          if (el() && v.measureElement) v.measureElement(el())
        }/>
        ${data[item.index].text}
      </div>
    </for>
  </div>
</div>
```

## Tag variable reference

Both tags are self-closing and expose the same tag-variable shape. Capture it with
`<virtualizer/v/>` (or any name) and read its properties as `v.property`:

| Property | Type | Description |
|---|---|---|
| `virtualItems` | `VirtualItem[]` | The currently visible virtual items |
| `totalSize` | `number` | Total scrollable size in px — set as the inner container's `height` (or `width` for columns) |
| `measureElement` | `(el: Element \| null) => void` | Ref callback for dynamic item sizing |
| `scrollToIndex` | `(index: number, options?: ScrollToOptions) => void` | Imperatively scroll to an item by index |
| `scrollToOffset` | `(offset: number, options?: ScrollToOptions) => void` | Imperatively scroll to a pixel offset |

## `<virtualizer>` input reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | required | Number of items |
| `getScrollElement` | `() => Element \| null` | required | Returns the scroll container |
| `estimateSize` | `(index: number) => number` | `() => 50` | Estimated item size in px |
| `overscan` | `number` | `5` | Items to render beyond the visible area |
| `horizontal` | `boolean` | `false` | Virtualise horizontally (columns) |
| `paddingStart` | `number` | — | Padding before first item |
| `paddingEnd` | `number` | — | Padding after last item |
| `scrollPaddingStart` | `number` | — | Scroll padding for `scrollToIndex` |
| `scrollPaddingEnd` | `number` | — | Scroll padding for `scrollToIndex` |
| `gap` | `number` | — | Gap between items in px |
| `lanes` | `number` | `1` | Lanes for masonry layouts |
| `initialOffset` | `number \| (() => number)` | — | Initial scroll offset (px) |

## `<window-virtualizer>` input reference

Same as `<virtualizer>` except `getScrollElement`, `horizontal`, and `initialOffset`
are not accepted. The scroll element is always `window`, scrolling is always vertical,
and the initial offset is read from `window.scrollY` automatically.

## SSR

Both tags build their virtualizer on mount (client-side) and render on the server **without an
`<if=mounted>` guard**. On the server the container renders empty; on mount the client builds the
virtualizer, measures the scroll element, and fills in the visible rows.

```marko
<div/scrollEl style="height: 400px; overflow-y: auto; position: relative;">
  <virtualizer/v
    count=10000
    estimateSize=() => 35
    getScrollElement=() => scrollEl()
  />
  <div style=`height: ${v.totalSize}px; position: relative`>
    <for|item| of=v.virtualItems>
      <div style=`position: absolute; top: 0; width: 100%; height: ${item.size}px; transform: translateY(${item.start}px)`>
        Row ${item.index}
      </div>
    </for>
  </div>
</div>
```

Rendering an initial set of rows on the server (a server-rendered slice) is shown in the SSR
data-fetching example.
