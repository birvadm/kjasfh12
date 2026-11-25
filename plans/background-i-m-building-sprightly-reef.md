# Fix sidebar independent scrolling

## Context
The left menu `<aside>` in `src/components/AppShell.tsx` is `sticky top-0 h-screen flex-col`, but the nav list container (`AppShell.tsx:125`, `flex flex-col gap-0.5 px-3 py-5`) has no scroll region. When the menu is tall (Finance expanded, or long content), it overflows the fixed-height aside and the **whole page scrolls** instead of just the panel. The client wants the sidebar panel itself to scroll, with the rest fixed.

## Approach (only `src/components/AppShell.tsx`)
Make the nav list the flex-growing, independently-scrollable region; keep the search box (top) and the Access/Dark mini-buttons (bottom) pinned.

- On the nav list container at `AppShell.tsx:125`, add `flex-1 min-h-0 overflow-y-auto` (keep existing `flex flex-col gap-0.5 px-3 py-5`). `min-h-0` is required so the flex child can shrink below its content height and actually scroll.
- The bottom section (`mt-auto flex flex-col gap-0.5 px-3 pb-5`) stays pinned via `mt-auto`.
- Optional: `shrink-0` on the search block wrapper (`AppShell.tsx:108`) so it never compresses.

## Verification
- Expand Finance / filter the menu so the list is taller than the viewport → only the nav list scrolls; the search box and Access/Dark buttons stay fixed, and the page body does not move.
- Collapsed sidebar and the search-filter behavior still work.
