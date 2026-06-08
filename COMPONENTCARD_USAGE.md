# ComponentCard usage

`ComponentCard` (`src/components/common/ComponentCard.tsx`) is a **TailAdmin starter
demo wrapper** — not the card primitive to reach for in GoGoCash feature screens. This
note records what it actually is so nobody wires it into a real page by mistake.

## What it actually is

- A **client component** (`"use client"`), memoized with `React.memo`.
- Props: `title: string`, `desc?: string`, `className?: string`, `children?: React.ReactNode`.
- Renders the card shell (`rounded-2xl border …`) with a header (`title` + optional
  `desc` + a search box) and a body, then `children`.

```tsx
import ComponentCard from "@/components/common/ComponentCard";

<ComponentCard title="Some demo" desc="Optional subtitle">
  <SomeContent />
</ComponentCard>;
```

> ⚠️ **Known issue — demo only.** The body renders a **hardcoded demo users table**
> (`BasicTableOne` + `tableData`) _above_ `children`, and the header search box is a
> no-op. So every `<ComponentCard>` shows a stray sample table regardless of its content.
> It is currently used only by the TailAdmin showcase routes — UI elements
> (`alerts`, `avatars`, `buttons`, `images`), form elements, charts, `basic-tables`,
> `users-admin`, the modal examples, and `VideosExample`. **Do not use it for product UI.**
> (Fixing it to drop the hardcoded table is tracked separately.)

## What to use for real cards

For GoGoCash feature cards, use the **card shell** documented in
[`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) §5:

```
rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
```

Inner padding is usually `px-4 py-4 sm:px-6 sm:py-5`. See `docs/DESIGN_SYSTEM.md` for the
component inventory, typography roles, and tokens.

For a table search input, use `SearchTable` (`src/components/common/SearchTable.tsx`) or
the design-system `SearchBar` (`src/components/ui/button/SearchBar.tsx`).

> **There is no `SearchableComponentCard` in this repo.** Earlier versions of this guide
> described one (and `showSearch` / `onSearchChange` props on `ComponentCard`); none of
> that exists in the current codebase, so it has been removed.
