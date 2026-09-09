# Table View, Filtering, Sorting, Search — Technical Design (Plan 3)

Technical design for Plan 3 of the MVP roadmap set out in
`docs/superpowers/plans/2026-09-06-core-skeleton.md`: table view, column
selection, filtering, sorting, and search — the last piece of the original
MVP scope. Covers `specs.md` §2, §13–18. Builds on the existing app as
shipped by Plan 1 (`docs/superpowers/plans/2026-09-06-core-skeleton.md`)
and Plan 2 (`docs/superpowers/plans/2026-09-09-scraping-ingestion.md`); no
Prisma schema changes are needed — every capability here operates on
`Apartment` fields that already exist.

## 1. State location

All of search, filters, sort, and view mode are **client-side, in-memory**
state — chosen over URL-search-params/server-driven filtering because this
is a personal tool with a modest apartment count, and instant, no-round-trip
filtering matters more here than shareable/bookmarkable filtered URLs.
`app/page.tsx` keeps its existing shape (a Server Component fetching the
full list once via `listApartments()`) and passes that list to a new client
component that owns all of Plan 3's interactivity. Search/filter/sort state
resets on page reload (acceptable — it's quick to rebuild); view mode and
table column selection are the two exceptions, persisted via
`localStorage` since they're app-configuration-level preferences, not
one-off queries (view mode already needed persistence per the UX goal of
not surprising the user on every reload; column selection persistence is
an explicit spec requirement, §15).

## 2. Data fetching change

`lib/db/apartments.ts`'s `listApartments()` currently:

```ts
export async function listApartments() {
  return prisma.apartment.findMany({
    include: { images: { orderBy: { order: 'asc' } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}
```

Add `documents: true` to the `include` — the only server-side data change
this plan needs, required because search must cover document filenames
(spec §18). No `orderBy` needed on the documents relation (filenames are
just read, not displayed in order-sensitive UI here). This changes the
return type to also carry `documents: Document[]` per apartment; this is
additive and does not break `ApartmentCard`'s existing prop type
(`Apartment & { images: ApartmentImage[] }` — TypeScript structurally
accepts the wider actual value where a narrower type is expected for a
non-literal argument).

## 3. Field catalog

One canonical registry describes every field Plan 3 can filter, sort, or
show as a table column — avoids duplicating field metadata across three
different UI pieces. New file `lib/apartments/fields.ts`:

```ts
export type FieldType = 'text' | 'number' | 'boolean' | 'select';

export interface FieldDef {
  key: string; // Apartment property name
  label: string;
  type: FieldType;
  filterable: boolean;
  sortable: boolean;
  tableColumn: boolean;
  defaultColumn: boolean; // checked by default in the column picker
  options?: { value: string; label: string }[]; // for type: 'select'
}

export const FIELDS: FieldDef[] = [
  { key: 'address', label: 'Address', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: true },
  { key: 'price', label: 'Price', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'livingArea', label: 'Living area', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'rooms', label: 'Rooms', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'floor', label: 'Floor', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'balcony', label: 'Balcony', type: 'boolean', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'elevator', label: 'Elevator', type: 'boolean', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'kitchen', label: 'Kitchen', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'condition', label: 'Condition', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'hausgeld', label: 'Hausgeld', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: true },
  { key: 'maklerprovision', label: 'Maklerprovision', type: 'text', filterable: true, sortable: false, tableColumn: true, defaultColumn: false },
  { key: 'locationRating', label: 'Location rating', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: false },
  { key: 'personalRating', label: 'Personal rating', type: 'number', filterable: true, sortable: true, tableColumn: true, defaultColumn: false },
  { key: 'status', label: 'Status', type: 'select', filterable: true, sortable: true, tableColumn: true, defaultColumn: true, options: toOptions(STATUS_LABELS) },
  { key: 'maklervertragStatus', label: 'Maklervertrag', type: 'select', filterable: true, sortable: false, tableColumn: true, defaultColumn: true, options: toOptions(MAKLERVERTRAG_LABELS) },
  { key: 'createdAt', label: 'Date added', type: 'number' /* compared as a timestamp */, filterable: false, sortable: true, tableColumn: false, defaultColumn: false },
];
```

where `toOptions` is a one-line local helper in the same file:

```ts
function toOptions(labels: Record<string, string>): { value: string; label: string }[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}
```

`STATUS_LABELS`/`MAKLERVERTRAG_LABELS` are imported from the existing
`lib/apartments/format.ts` — single source of truth for these labels, not
duplicated here. `status`'s option order (used below for sort position)
follows `STATUS_LABELS`'s existing declaration order, which is already the
pipeline order (`NOT_CONTACTED` → ... → `INTEREST_FOR_PURCHASE`).

`title` is deliberately excluded from the catalog — it's covered by search,
and `address` (always populated for a real listing, per spec's card
mockups) is the field actually shown/filtered/sorted on; a table row can
still fall back to `title` for display exactly as `ApartmentCard` already
does (`apartment.address ?? apartment.title ?? 'Untitled apartment'`).

`createdAt` is sortable ("Date added: newest → oldest", spec §17) but not
filterable or a table column — spec never asks to filter or display it as
a column, only to sort by it; keeping it out of those two catalogs avoids
building unused UI.

## 4. Filtering

Filter state:

```ts
export type FilterOperator = 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';

export interface FilterCondition {
  id: string;
  field: string; // FieldDef.key
  operator: FilterOperator;
  value: string; // raw text from the input; parsed against the field's type when evaluated
}
```

Per-type allowed operators (enforced by the Filter builder UI — the
operator `<select>` only offers what's valid for the chosen field's type):
`text` → `contains` only; `number` → `eq | lt | lte | gt | gte`; `boolean`
→ `eq` only (value is `'true'` or `'false'`, chosen from a Yes/No select,
not typed); `select` → `eq` only (value chosen from the field's `options`).

New file `lib/apartments/filterApartments.ts`:

```ts
export function matchesFilter(apartment: Apartment, condition: FilterCondition): boolean;
export function matchesAllFilters(apartment: Apartment, conditions: FilterCondition[]): boolean; // AND — every condition must match
```

`matchesFilter` looks up the field's `FieldDef` to know how to compare:
`text` → case-insensitive substring match, treating a `null`/`undefined`
field value as never matching; `number` → numeric comparison per operator,
`null`/`undefined` never matches (an apartment with no recorded Hausgeld
doesn't match a Hausgeld filter, which is the correct "unknown ≠ passes
filter" reading); `boolean` → strict equality against the condition's
`true`/`false` value (a `null` balcony field matches neither "Balcony =
Yes" nor "Balcony = No" — consistent with the ingestion design doc's
existing "absence means unknown, not false" semantics for these two
fields); `select` → strict string equality.

An empty `conditions` array matches every apartment (no filters active).

## 5. Search

New file `lib/apartments/searchApartments.ts`:

```ts
export function matchesSearch(apartment: ApartmentWithRelations, query: string): boolean;
```

Case-insensitive substring match against `address`, `title`, `notes`,
`source`, and every related `document.filename` (spec §18). An empty query
matches every apartment. Combines with active filters via AND (an
apartment must match the search text AND every active filter condition) —
matching the product intent that search and filters narrow the same list
together, not as separate/exclusive modes.

## 6. Sorting

```ts
export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  id: string;
  field: string; // FieldDef.key, sortable: true only
  direction: SortDirection;
}
```

New file `lib/apartments/sortApartments.ts`:

```ts
export function sortApartments(apartments: Apartment[], criteria: SortCriterion[]): Apartment[];
```

Stable multi-key sort: compares by the first criterion; on a tie, falls
through to the next; `status` sorts by its defined pipeline position (the
index into the existing `STATUS_LABELS`-ordered key list — "further along
the process" is what "Status" sorting means here, not alphabetical); every
other sortable field sorts numerically (`createdAt` compared as
`Date.getTime()`). A `null`/`undefined` value always sorts last regardless
of direction (an apartment with no Personal rating shouldn't jump to the
top when sorting ascending). An empty `criteria` array is a no-op (list
stays in `listApartments()`'s existing `createdAt desc` order — unchanged
default).

## 7. View mode and column selection persistence

New file `lib/hooks/useLocalStorageState.ts` — a small shared hook:

```ts
export function useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void];
```

Reads/writes JSON via `localStorage`, wrapped in `try/catch` (private
browsing / storage-disabled contexts must not crash the page — falls back
to `initialValue` and becomes a no-op write). Used for two keys:
`'flatTracker.viewMode'` (`'card' | 'table'`, defaults to `'card'` per spec
§2's "default view is Card view") and `'flatTracker.tableColumns'` (a
`string[]` of `FieldDef.key`s, defaults to the catalog's `defaultColumn:
true` keys).

## 8. Component structure

```
components/
  ApartmentBrowser.tsx   — owns search/filter/sort/view/column state,
                            computes the visible list via useMemo, renders
                            the toolbar + AddApartmentCard + (grid | table)
  FilterBuilder.tsx       — the Filter panel (add/remove/edit condition rows)
  SortBuilder.tsx         — the Sort panel (add/remove/edit criterion rows)
  ColumnPicker.tsx        — the Columns checklist panel
  ApartmentTable.tsx      — table view rendering, using selected columns
```

`app/page.tsx` shrinks to:

```tsx
import { listApartments } from '@/lib/db/apartments';
import { ApartmentBrowser } from '@/components/ApartmentBrowser';

export default async function HomePage() {
  const apartments = await listApartments();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <ApartmentBrowser apartments={apartments} />
    </main>
  );
}
```

`ApartmentBrowser` renders, in order: the toolbar (Search input, Card/Table
toggle, Filter button, Sort button, Columns button [table mode only], Add
apartment button [table mode only]); active-filter chips (removable, only
shown when filters are active — spec §16's "make it obvious which filters
are active"); then either the existing card grid (`AddApartmentCard` as
the first item, exactly as today, plus `ApartmentCard` per visible
apartment) or `ApartmentTable` with `AddApartmentCard` revealed inline
above it when the toolbar's Add-apartment button is clicked (Card mode
needs no such button — the grid-embedded add-card already satisfies spec
§2's toolbar requirement in that mode).

**Panel mechanics:** `FilterBuilder`, `SortBuilder`, and `ColumnPicker`
each toggle-show as an inline block directly below the toolbar (pushing
the list down), not a floating/positioned popover — this codebase has no
popover/floating-UI dependency yet (Plan 1/2 only ever used plain
conditional rendering and `<select>` elements), and introducing one is
disproportionate to this plan's scope. Only one panel is open at a time —
opening one closes any other that was open (a single `openPanel: 'filter'
| 'sort' | 'columns' | null` state in `ApartmentBrowser`, passed down as
props, rather than three independent booleans that could show
simultaneously and crowd the page).

## 9. Table view content

One row per apartment; the row's columns are the currently-selected
`FieldDef` keys, in the catalog's declared order (not user-reorderable —
spec doesn't ask for column reordering, only selection). Clicking a row
(anywhere except an interactive control within it, though this plan adds
none) opens `/apartments/${id}`, matching the card's existing click
behavior. Cell rendering per type: `text`/`number` → raw value or an em
dash for `null`; `boolean` → "Yes"/"No"/em dash for `null`; `select` →
the field's label lookup (`STATUS_LABELS`/`MAKLERVERTRAG_LABELS`), styled
the same way the card already renders status (spec's card mockup shows a
colored status dot — table rows reuse the same label text, a full colored
badge treatment is a nice-to-have this plan doesn't require).

## 10. Out of scope (unchanged from the original spec)

Address-based duplicate detection, saved/named filter presets, column
reordering or resizing, exporting the table, any change to how apartments
are created/scraped (Plan 2, untouched by this plan). Everything already
excluded from the MVP in `specs.md` §23 remains excluded.
