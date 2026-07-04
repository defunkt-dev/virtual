# Option gates (throwaway test harness — not a shipped example)

Real-Chromium behavioral proofs for the full-parity option batch added in
session 5 (scrollMargin, enabled, isRtl, isScrollingResetDelay, useScrollendEvent,
useAnimationFrameWithResizeObserver, laneAssignmentMode, useCachedMeasurements,
debug, custom measureElement, and the window tag's horizontal + initialOffset),
plus the fixed window example verbatim. One deliberately artificial page per
option under src/routes/, one Playwright spec (e2e/option-gates.spec.ts) that
asserts each option observably changes behavior. Port 4199 (examples use 4173).

Location: packages/marko-virtual/e2e/option-gates. Relative paths assume exactly
this depth (marko.json -> ../../marko.json, vite alias ->
../../../virtual-core/src/index.ts).

Install: covered by the repo-level `pnpm install` once the workspace glob
`packages/marko-virtual/e2e/*` is present in pnpm-workspace.yaml (included in
this bundle). First browser run may need `npx playwright install chromium`.

Run: `npm run test:e2e` from this folder (the config starts the dev server
itself), or start `npm run dev -- --port 4199` manually and rerun to reuse it.

Publishing: not affected — the package's `files` field publishes only dist,
src/tags, marko.json, and README.md, so nothing under e2e/ reaches npm.

Known-bug note: the enabled gate carries a documented 250ms settle wait for an
upstream core bug (end-of-scroll debounce timer surviving observeOffset
unsubscription and firing a stale offset into the live instance). Remove the wait
if/when the cancellable-debounce core fix lands; the spec comment marks the spot.
