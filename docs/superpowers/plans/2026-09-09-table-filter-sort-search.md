# Table View, Filtering, Sorting, Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user switch the home page between the existing card grid and a new table view, search across apartments/notes/document filenames, build combinable field filters, sort by multiple criteria, and choose which columns the table shows — the last piece of the original MVP scope.

**Architecture:** A small set of pure functions (`lib/apartments/fields.ts`, `filterApartments.ts`, `searchApartments.ts`, `sortApartments.ts`) drive a new client component, `ApartmentBrowser`, which owns all of this plan's interactive state and replaces the home page's current direct rendering of `AddApartmentCard` + the card grid. Search/filter/sort state is in-memory (resets on reload); view mode and table-column selection persist via `localStorage`. No Prisma schema changes — everything operates on `Apartment` fields that already exist.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React Client Components, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-table-filter-sort-search-design.md` (this plan's design doc); `specs.md` §2, §13–18 (product requirements this plan implements).

## Global Constraints

- TypeScript strict mode (existing project default).
- Currency values (price, Hausgeld) display via the existing `formatPrice` helper (`lib/apartments/format.ts`) — German locale (`€425.000`), reused, not reimplemented.
- Pure logic (the field catalog, filter/search/sort functions) is unit tested with hand-constructed fixture objects, not real database rows — unlike Plan 1/2's `lib/db/*` tests, these functions do no I/O, so a real SQLite-backed test would add DB overhead for no correctness benefit.
- No automated tests for React components or hooks, per this codebase's established convention (zero component/hook tests exist anywhere in this repo as of Plan 2) — verified via `tsc --noEmit`, `npm run build`, and manual use of the running app instead.
- No Prisma schema changes in this plan.
- View mode (`'card' | 'table'`) and selected table columns persist via `localStorage`, guarded with `try/catch` (private browsing / storage-disabled contexts must not crash the page).

---

### Task 1: Include documents in `listApartments()`

**Files:**
- Modify: `lib/db/apartments.ts:60-65`
- Test: `tests/db/apartments.test.ts` (append)

**Interfaces:**
- Produces: `listApartments()` now returns each apartment's `documents: Document[]` alongside its existing `images: Image[]`. Consumed by Task 4 (`searchApartments`, via `ApartmentBrowser` in Task 11) for filename search (spec §18).

- [ ] **Step 1: Write the failing test**

Append to `tests/db/apartments.test.ts`, inside the existing `describe('apartment repository', ...)` block:

```ts
  it("includes each apartment's documents in the listing", async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'With a doc' });
    createdIds.push(apartment.id);
    await prisma.document.create({
      data: {
        apartmentId: apartment.id,
        filename: 'Expose.pdf',
        fileType: 'application/pdf',
        filePath: `${apartment.id}/expose.pdf`,
      },
    });

    const list = await listApartments();
    const listed = list.find((a) => a.id === apartment.id);
    expect(listed?.documents).toHaveLength(1);
    expect(listed?.documents[0].filename).toBe('Expose.pdf');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/db/apartments.test.ts`
Expected: FAIL — `documents` is `undefined` on the listed result (not yet included in the query).

- [ ] **Step 3: Update the query**

In `lib/db/apartments.ts`, change `listApartments()`:

```ts
export async function listApartments() {
  return prisma.apartment.findMany({
    include: {
      images: { orderBy: { order: 'asc' } },
      documents: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/db/apartments.test.ts`
Expected: all tests in this file pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db/apartments.ts tests/db/apartments.test.ts
git commit -m "feat: include documents when listing apartments"
```

---

### Task 2: Field catalog

**Files:**
- Create: `lib/apartments/fields.ts`
- Test: `tests/apartments/fields.test.ts`

**Interfaces:**
- Consumes: `STATUS_LABELS`, `MAKLERVERTRAG_LABELS` (`lib/apartments/format.ts`, existing).
- Produces: `FieldType`, `FieldOption`, `FieldDef`, `FIELDS`, `getField(key): FieldDef | undefined`, `getFieldValue(apartment, key): unknown`, `FILTERABLE_FIELDS`, `SORTABLE_FIELDS`, `TABLE_COLUMN_FIELDS`, `DEFAULT_TABLE_COLUMNS`. Used by Task 3 (`filterApartments`), Task 5 (`sortApartments`), Task 7–10 (`FilterBuilder`/`SortBuilder`/`ColumnPicker`/`ApartmentTable`), Task 11 (`ApartmentBrowser`).

- [ ] **Step 1: Write the failing tests**

Create `tests/apartments/fields.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  FIELDS,
  getField,
  FILTERABLE_FIELDS,
  SORTABLE_FIELDS,
  TABLE_COLUMN_FIELDS,
  DEFAULT_TABLE_COLUMNS,
} from '@/lib/apartments/fields';

describe('fields catalog', () => {
  it('gives every field a unique key', () => {
    const keys = FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('builds status options from STATUS_LABELS in pipeline order', () => {
    const status = getField('status');
    expect(status?.options?.map((o) => o.value)).toEqual([
      'NOT_CONTACTED',
      'CONTACTED',
      'RECEIVED_EXPOSE',
      'SETUP_VIEWING',
      'POST_VIEWING',
      'INTEREST_FOR_PURCHASE',
    ]);
    expect(status?.options?.find((o) => o.value === 'CONTACTED')?.label).toBe('Contacted');
  });

  it('builds maklervertragStatus options from MAKLERVERTRAG_LABELS', () => {
    const mv = getField('maklervertragStatus');
    expect(mv?.options?.map((o) => o.value)).toEqual(['NOT_RECEIVED', 'RECEIVED', 'SIGNED', 'WIDERRUF']);
  });

  it('marks createdAt sortable but not filterable or a table column', () => {
    const createdAt = getField('createdAt');
    expect(createdAt?.sortable).toBe(true);
    expect(createdAt?.filterable).toBe(false);
    expect(createdAt?.tableColumn).toBe(false);
  });

  it('defaults the table columns to address, price, livingArea, rooms, hausgeld, status, maklervertragStatus', () => {
    expect(DEFAULT_TABLE_COLUMNS).toEqual([
      'address',
      'price',
      'livingArea',
      'rooms',
      'hausgeld',
      'status',
      'maklervertragStatus',
    ]);
  });

  it('filters the catalog into filterable/sortable/table-column subsets', () => {
    expect(FILTERABLE_FIELDS.length).toBeGreaterThan(0);
    expect(FILTERABLE_FIELDS.every((f) => f.filterable)).toBe(true);
    expect(SORTABLE_FIELDS.every((f) => f.sortable)).toBe(true);
    expect(TABLE_COLUMN_FIELDS.every((f) => f.tableColumn)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/apartments/fields.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the catalog**

Create `lib/apartments/fields.ts`:

```ts
import type { Apartment } from '@prisma/client';
import { STATUS_LABELS, MAKLERVERTRAG_LABELS } from './format';

export type FieldType = 'text' | 'number' | 'boolean' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  filterable: boolean;
  sortable: boolean;
  tableColumn: boolean;
  defaultColumn: boolean;
  options?: FieldOption[];
}

function toOptions(labels: Record<string, string>): FieldOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
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
  { key: 'createdAt', label: 'Date added', type: 'number', filterable: false, sortable: true, tableColumn: false, defaultColumn: false },
];

export function getField(key: string): FieldDef | undefined {
  return FIELDS.find((field) => field.key === key);
}

export function getFieldValue(apartment: Apartment, key: string): unknown {
  return (apartment as unknown as Record<string, unknown>)[key];
}

export const FILTERABLE_FIELDS = FIELDS.filter((field) => field.filterable);
export const SORTABLE_FIELDS = FIELDS.filter((field) => field.sortable);
export const TABLE_COLUMN_FIELDS = FIELDS.filter((field) => field.tableColumn);
export const DEFAULT_TABLE_COLUMNS = TABLE_COLUMN_FIELDS.filter((field) => field.defaultColumn).map((field) => field.key);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/apartments/fields.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/apartments/fields.ts tests/apartments/fields.test.ts
git commit -m "feat: add the apartment field catalog"
```

---

### Task 3: `matchesFilter` / `matchesAllFilters`

**Files:**
- Create: `lib/apartments/filterApartments.ts`
- Test: `tests/apartments/filterApartments.test.ts`

**Interfaces:**
- Consumes: `getField`, `getFieldValue` (Task 2).
- Produces: `FilterOperator`, `FilterCondition`, `matchesFilter(apartment, condition): boolean`, `matchesAllFilters(apartment, conditions): boolean`. Used by Task 7 (`FilterBuilder`) and Task 11 (`ApartmentBrowser`).

- [ ] **Step 1: Write the failing tests**

Create `tests/apartments/filterApartments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Apartment } from '@prisma/client';
import { matchesFilter, matchesAllFilters, type FilterCondition } from '@/lib/apartments/filterApartments';

function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'a1',
    title: null,
    source: 'MANUAL',
    sourceUrl: null,
    address: 'Müllerstraße 42',
    price: 425000,
    livingArea: 58,
    rooms: 2,
    floor: null,
    balcony: true,
    elevator: null,
    kitchen: null,
    condition: null,
    hausgeld: 280,
    maklerprovision: null,
    locationRating: null,
    personalRating: 4,
    status: 'CONTACTED',
    maklervertragStatus: 'NOT_RECEIVED',
    notes: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}

describe('matchesFilter', () => {
  it('matches a text field via case-insensitive contains', () => {
    const apartment = makeApartment();
    expect(matchesFilter(apartment, { id: '1', field: 'address', operator: 'contains', value: 'müller' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'address', operator: 'contains', value: 'hauptstraße' })).toBe(false);
  });

  it('matches a number field with each comparison operator', () => {
    const apartment = makeApartment({ price: 425000 });
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'lt', value: '450000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'gt', value: '450000' })).toBe(false);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'eq', value: '425000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'gte', value: '425000' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'price', operator: 'lte', value: '425000' })).toBe(true);
  });

  it('never matches a number filter when the field is null', () => {
    const apartment = makeApartment({ hausgeld: null });
    expect(matchesFilter(apartment, { id: '1', field: 'hausgeld', operator: 'gte', value: '0' })).toBe(false);
  });

  it('matches a boolean field by strict equality', () => {
    const apartment = makeApartment({ balcony: true });
    expect(matchesFilter(apartment, { id: '1', field: 'balcony', operator: 'eq', value: 'true' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'balcony', operator: 'eq', value: 'false' })).toBe(false);
  });

  it('never matches a boolean filter when the field is null (unknown is neither yes nor no)', () => {
    const apartment = makeApartment({ elevator: null });
    expect(matchesFilter(apartment, { id: '1', field: 'elevator', operator: 'eq', value: 'true' })).toBe(false);
    expect(matchesFilter(apartment, { id: '1', field: 'elevator', operator: 'eq', value: 'false' })).toBe(false);
  });

  it('matches a select field by strict equality', () => {
    const apartment = makeApartment({ status: 'CONTACTED' });
    expect(matchesFilter(apartment, { id: '1', field: 'status', operator: 'eq', value: 'CONTACTED' })).toBe(true);
    expect(matchesFilter(apartment, { id: '1', field: 'status', operator: 'eq', value: 'SETUP_VIEWING' })).toBe(false);
  });
});

describe('matchesAllFilters', () => {
  it('requires every condition to match (AND)', () => {
    const apartment = makeApartment({ price: 425000, rooms: 2, balcony: true });
    const conditions: FilterCondition[] = [
      { id: '1', field: 'price', operator: 'lt', value: '450000' },
      { id: '2', field: 'rooms', operator: 'gte', value: '2' },
      { id: '3', field: 'balcony', operator: 'eq', value: 'true' },
    ];
    expect(matchesAllFilters(apartment, conditions)).toBe(true);
    expect(matchesAllFilters(apartment, [...conditions, { id: '4', field: 'rooms', operator: 'gte', value: '3' }])).toBe(false);
  });

  it('matches everything when there are no conditions', () => {
    expect(matchesAllFilters(makeApartment(), [])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/apartments/filterApartments.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/apartments/filterApartments.ts`:

```ts
import type { Apartment } from '@prisma/client';
import { getField, getFieldValue } from './fields';

export type FilterOperator = 'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export function matchesFilter(apartment: Apartment, condition: FilterCondition): boolean {
  const field = getField(condition.field);
  if (!field) return true;
  const rawValue = getFieldValue(apartment, condition.field);

  if (field.type === 'text') {
    return typeof rawValue === 'string' && rawValue.toLowerCase().includes(condition.value.toLowerCase());
  }

  if (field.type === 'number') {
    if (typeof rawValue !== 'number') return false;
    const target = Number(condition.value);
    if (!Number.isFinite(target)) return false;
    switch (condition.operator) {
      case 'eq':
        return rawValue === target;
      case 'lt':
        return rawValue < target;
      case 'lte':
        return rawValue <= target;
      case 'gt':
        return rawValue > target;
      case 'gte':
        return rawValue >= target;
      default:
        return false;
    }
  }

  if (field.type === 'boolean') {
    return typeof rawValue === 'boolean' && rawValue === (condition.value === 'true');
  }

  // select
  return typeof rawValue === 'string' && rawValue === condition.value;
}

export function matchesAllFilters(apartment: Apartment, conditions: FilterCondition[]): boolean {
  return conditions.every((condition) => matchesFilter(apartment, condition));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/apartments/filterApartments.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/apartments/filterApartments.ts tests/apartments/filterApartments.test.ts
git commit -m "feat: add apartment filter matching"
```

---

### Task 4: `matchesSearch`

**Files:**
- Create: `lib/apartments/searchApartments.ts`
- Test: `tests/apartments/searchApartments.test.ts`

**Interfaces:**
- Produces: `matchesSearch(apartment, query): boolean`. Used by Task 11 (`ApartmentBrowser`).

- [ ] **Step 1: Write the failing tests**

Create `tests/apartments/searchApartments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Apartment, Document } from '@prisma/client';
import { matchesSearch } from '@/lib/apartments/searchApartments';

type ApartmentWithDocuments = Apartment & { documents: Pick<Document, 'filename'>[] };

function makeApartment(overrides: Partial<ApartmentWithDocuments> = {}): ApartmentWithDocuments {
  return {
    id: 'a1',
    title: 'Nice flat',
    source: 'IMMOSCOUT24',
    sourceUrl: null,
    address: 'Müllerstraße 42',
    price: null,
    livingArea: null,
    rooms: null,
    floor: null,
    balcony: null,
    elevator: null,
    kitchen: null,
    condition: null,
    hausgeld: null,
    maklerprovision: null,
    locationRating: null,
    personalRating: null,
    status: 'NOT_CONTACTED',
    maklervertragStatus: 'NOT_RECEIVED',
    notes: 'Really like the light',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    documents: [{ filename: 'Expose_Müllerstraße.pdf' }],
    ...overrides,
  };
}

describe('matchesSearch', () => {
  it('matches on address', () => {
    expect(matchesSearch(makeApartment(), 'müller')).toBe(true);
  });

  it('matches on title', () => {
    expect(matchesSearch(makeApartment(), 'nice')).toBe(true);
  });

  it('matches on notes', () => {
    expect(matchesSearch(makeApartment(), 'light')).toBe(true);
  });

  it('matches on source', () => {
    expect(matchesSearch(makeApartment(), 'immoscout')).toBe(true);
  });

  it('matches on a document filename', () => {
    expect(matchesSearch(makeApartment(), 'expose')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesSearch(makeApartment(), 'MÜLLER')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(matchesSearch(makeApartment(), 'nonexistent')).toBe(false);
  });

  it('matches everything for an empty or whitespace-only query', () => {
    expect(matchesSearch(makeApartment(), '')).toBe(true);
    expect(matchesSearch(makeApartment(), '   ')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/apartments/searchApartments.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/apartments/searchApartments.ts`:

```ts
import type { Apartment, Document } from '@prisma/client';

type ApartmentWithDocuments = Apartment & { documents: Pick<Document, 'filename'>[] };

export function matchesSearch(apartment: ApartmentWithDocuments, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const haystacks = [
    apartment.address,
    apartment.title,
    apartment.notes,
    apartment.source,
    ...apartment.documents.map((document) => document.filename),
  ];

  return haystacks.some((value) => value != null && value.toLowerCase().includes(trimmed));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/apartments/searchApartments.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/apartments/searchApartments.ts tests/apartments/searchApartments.test.ts
git commit -m "feat: add apartment search matching"
```

---

### Task 5: `sortApartments`

**Files:**
- Create: `lib/apartments/sortApartments.ts`
- Test: `tests/apartments/sortApartments.test.ts`

**Interfaces:**
- Consumes: `getFieldValue` (Task 2), `STATUS_LABELS` (`lib/apartments/format.ts`, existing).
- Produces: `SortDirection`, `SortCriterion`, `sortApartments(apartments, criteria): Apartment[]`. Used by Task 8 (`SortBuilder`) and Task 11 (`ApartmentBrowser`).

- [ ] **Step 1: Write the failing tests**

Create `tests/apartments/sortApartments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Apartment } from '@prisma/client';
import { sortApartments } from '@/lib/apartments/sortApartments';

function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'a1',
    title: null,
    source: 'MANUAL',
    sourceUrl: null,
    address: null,
    price: null,
    livingArea: null,
    rooms: null,
    floor: null,
    balcony: null,
    elevator: null,
    kitchen: null,
    condition: null,
    hausgeld: null,
    maklerprovision: null,
    locationRating: null,
    personalRating: null,
    status: 'NOT_CONTACTED',
    maklervertragStatus: 'NOT_RECEIVED',
    notes: null,
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
    ...overrides,
  };
}

describe('sortApartments', () => {
  it('sorts ascending by a numeric field', () => {
    const cheap = makeApartment({ id: 'cheap', price: 100 });
    const mid = makeApartment({ id: 'mid', price: 200 });
    const expensive = makeApartment({ id: 'expensive', price: 300 });
    const result = sortApartments([expensive, cheap, mid], [{ id: 's1', field: 'price', direction: 'asc' }]);
    expect(result.map((a) => a.id)).toEqual(['cheap', 'mid', 'expensive']);
  });

  it('sorts descending by a numeric field', () => {
    const cheap = makeApartment({ id: 'cheap', price: 100 });
    const expensive = makeApartment({ id: 'expensive', price: 300 });
    const result = sortApartments([cheap, expensive], [{ id: 's1', field: 'price', direction: 'desc' }]);
    expect(result.map((a) => a.id)).toEqual(['expensive', 'cheap']);
  });

  it('breaks ties using the second sort criterion', () => {
    const a = makeApartment({ id: 'a', personalRating: 5, price: 300 });
    const b = makeApartment({ id: 'b', personalRating: 5, price: 100 });
    const result = sortApartments(
      [a, b],
      [
        { id: 's1', field: 'personalRating', direction: 'desc' },
        { id: 's2', field: 'price', direction: 'asc' },
      ],
    );
    expect(result.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('always sorts a null value last regardless of direction', () => {
    const withRating = makeApartment({ id: 'has-rating', personalRating: 3 });
    const withoutRating = makeApartment({ id: 'no-rating', personalRating: null });
    const asc = sortApartments([withoutRating, withRating], [{ id: 's1', field: 'personalRating', direction: 'asc' }]);
    expect(asc.map((a) => a.id)).toEqual(['has-rating', 'no-rating']);
    const desc = sortApartments([withoutRating, withRating], [{ id: 's1', field: 'personalRating', direction: 'desc' }]);
    expect(desc.map((a) => a.id)).toEqual(['has-rating', 'no-rating']);
  });

  it('sorts status by its pipeline position, not alphabetically', () => {
    const interested = makeApartment({ id: 'interested', status: 'INTEREST_FOR_PURCHASE' });
    const notContacted = makeApartment({ id: 'not-contacted', status: 'NOT_CONTACTED' });
    const contacted = makeApartment({ id: 'contacted', status: 'CONTACTED' });
    const result = sortApartments(
      [interested, notContacted, contacted],
      [{ id: 's1', field: 'status', direction: 'asc' }],
    );
    expect(result.map((a) => a.id)).toEqual(['not-contacted', 'contacted', 'interested']);
  });

  it('sorts by date added (createdAt) as a timestamp', () => {
    const older = makeApartment({ id: 'older', createdAt: new Date('2026-01-01') });
    const newer = makeApartment({ id: 'newer', createdAt: new Date('2026-06-01') });
    const result = sortApartments([older, newer], [{ id: 's1', field: 'createdAt', direction: 'desc' }]);
    expect(result.map((a) => a.id)).toEqual(['newer', 'older']);
  });

  it('returns the list in the same order when there are no sort criteria', () => {
    const a = makeApartment({ id: 'a' });
    const b = makeApartment({ id: 'b' });
    expect(sortApartments([a, b], []).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const a = makeApartment({ id: 'a', price: 300 });
    const b = makeApartment({ id: 'b', price: 100 });
    const input = [a, b];
    sortApartments(input, [{ id: 's1', field: 'price', direction: 'asc' }]);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/apartments/sortApartments.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/apartments/sortApartments.ts`:

```ts
import type { Apartment } from '@prisma/client';
import { STATUS_LABELS } from './format';
import { getFieldValue } from './fields';

export type SortDirection = 'asc' | 'desc';

export interface SortCriterion {
  id: string;
  field: string;
  direction: SortDirection;
}

const STATUS_ORDER = Object.keys(STATUS_LABELS);

function comparableValue(apartment: Apartment, field: string): number | null {
  if (field === 'status') {
    const index = STATUS_ORDER.indexOf(apartment.status);
    return index === -1 ? null : index;
  }
  if (field === 'createdAt') {
    return apartment.createdAt.getTime();
  }
  const raw = getFieldValue(apartment, field);
  return typeof raw === 'number' ? raw : null;
}

function compareBy(a: Apartment, b: Apartment, criterion: SortCriterion): number {
  const aValue = comparableValue(a, criterion.field);
  const bValue = comparableValue(b, criterion.field);

  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1; // nulls always sort last, regardless of direction
  if (bValue == null) return -1;

  const diff = aValue - bValue;
  return criterion.direction === 'asc' ? diff : -diff;
}

export function sortApartments(apartments: Apartment[], criteria: SortCriterion[]): Apartment[] {
  if (criteria.length === 0) return apartments;
  return [...apartments].sort((a, b) => {
    for (const criterion of criteria) {
      const result = compareBy(a, b, criterion);
      if (result !== 0) return result;
    }
    return 0;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/apartments/sortApartments.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/apartments/sortApartments.ts tests/apartments/sortApartments.test.ts
git commit -m "feat: add multi-criterion apartment sorting"
```

---

### Task 6: `useLocalStorageState` hook

**Files:**
- Create: `lib/hooks/useLocalStorageState.ts`

**Interfaces:**
- Produces: `useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void]`. Used by Task 9 (`ColumnPicker`, via `ApartmentBrowser`) and Task 11 (`ApartmentBrowser`, for view mode).

No automated test (React hook — this codebase has no DOM test environment; see Global Constraints). Verified via `tsc --noEmit` and manual use once wired into `ApartmentBrowser` in Task 11.

- [ ] **Step 1: Implement it**

Create `lib/hooks/useLocalStorageState.ts`:

```ts
'use client';

import { useCallback, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setAndPersist = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage unavailable (private browsing, disabled, quota) — state still updates in memory
      }
    },
    [key],
  );

  return [value, setAndPersist];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useLocalStorageState.ts
git commit -m "feat: add useLocalStorageState hook"
```

---

### Task 7: `FilterBuilder` component

**Files:**
- Create: `components/FilterBuilder.tsx`

**Interfaces:**
- Consumes: `FILTERABLE_FIELDS`, `getField`, `FieldDef` (Task 2), `FilterCondition`, `FilterOperator` (Task 3).
- Produces: `<FilterBuilder conditions={FilterCondition[]} onChange={(conditions: FilterCondition[]) => void} />`. Used by Task 11 (`ApartmentBrowser`).

No automated test (interactive React component; see Global Constraints).

- [ ] **Step 1: Implement it**

Create `components/FilterBuilder.tsx`:

```tsx
'use client';

import { FILTERABLE_FIELDS, getField, type FieldDef } from '@/lib/apartments/fields';
import type { FilterCondition, FilterOperator } from '@/lib/apartments/filterApartments';

const OPERATORS_BY_TYPE: Record<FieldDef['type'], { value: FilterOperator; label: string }[]> = {
  text: [{ value: 'contains', label: 'contains' }],
  number: [
    { value: 'eq', label: '=' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '<=' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '>=' },
  ],
  boolean: [{ value: 'eq', label: '=' }],
  select: [{ value: 'eq', label: '=' }],
};

function defaultValueFor(field: FieldDef): string {
  if (field.type === 'boolean') return 'true';
  if (field.type === 'select') return field.options?.[0]?.value ?? '';
  return '';
}

function newCondition(): FilterCondition {
  const field = FILTERABLE_FIELDS[0];
  return {
    id: crypto.randomUUID(),
    field: field.key,
    operator: OPERATORS_BY_TYPE[field.type][0].value,
    value: defaultValueFor(field),
  };
}

export function FilterBuilder({
  conditions,
  onChange,
}: {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}) {
  function updateCondition(id: string, patch: Partial<FilterCondition>) {
    onChange(conditions.map((condition) => (condition.id === id ? { ...condition, ...patch } : condition)));
  }

  function changeField(id: string, fieldKey: string) {
    const field = getField(fieldKey);
    if (!field) return;
    updateCondition(id, {
      field: fieldKey,
      operator: OPERATORS_BY_TYPE[field.type][0].value,
      value: defaultValueFor(field),
    });
  }

  function removeCondition(id: string) {
    onChange(conditions.filter((condition) => condition.id !== id));
  }

  function addCondition() {
    onChange([...conditions, newCondition()]);
  }

  return (
    <div className="border rounded p-3 space-y-2">
      {conditions.map((condition) => {
        const field = getField(condition.field) ?? FILTERABLE_FIELDS[0];
        return (
          <div key={condition.id} className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={condition.field}
              onChange={(e) => changeField(condition.id, e.target.value)}
              className="border rounded px-2 py-1"
            >
              {FILTERABLE_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(condition.id, { operator: e.target.value as FilterOperator })}
              className="border rounded px-2 py-1"
            >
              {OPERATORS_BY_TYPE[field.type].map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            {field.type === 'boolean' ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="border rounded px-2 py-1"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : field.type === 'select' ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="border rounded px-2 py-1"
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                className="border rounded px-2 py-1 w-28"
              />
            )}
            <button type="button" onClick={() => removeCondition(condition.id)} className="text-red-600 text-sm">
              Remove
            </button>
          </div>
        );
      })}
      <div className="flex gap-3">
        <button type="button" onClick={addCondition} className="text-sm text-blue-600">
          + Add filter
        </button>
        {conditions.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-gray-500">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/FilterBuilder.tsx
git commit -m "feat: add FilterBuilder component"
```

---

### Task 8: `SortBuilder` component

**Files:**
- Create: `components/SortBuilder.tsx`

**Interfaces:**
- Consumes: `SORTABLE_FIELDS` (Task 2), `SortCriterion`, `SortDirection` (Task 5).
- Produces: `<SortBuilder criteria={SortCriterion[]} onChange={(criteria: SortCriterion[]) => void} />`. Used by Task 11 (`ApartmentBrowser`).

No automated test (interactive React component; see Global Constraints).

- [ ] **Step 1: Implement it**

Create `components/SortBuilder.tsx`:

```tsx
'use client';

import { SORTABLE_FIELDS } from '@/lib/apartments/fields';
import type { SortCriterion, SortDirection } from '@/lib/apartments/sortApartments';

function newCriterion(): SortCriterion {
  return { id: crypto.randomUUID(), field: SORTABLE_FIELDS[0].key, direction: 'asc' };
}

export function SortBuilder({
  criteria,
  onChange,
}: {
  criteria: SortCriterion[];
  onChange: (criteria: SortCriterion[]) => void;
}) {
  function updateCriterion(id: string, patch: Partial<SortCriterion>) {
    onChange(criteria.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion)));
  }

  function removeCriterion(id: string) {
    onChange(criteria.filter((criterion) => criterion.id !== id));
  }

  function addCriterion() {
    onChange([...criteria, newCriterion()]);
  }

  return (
    <div className="border rounded p-3 space-y-2">
      {criteria.map((criterion, index) => (
        <div key={criterion.id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400 w-16">{index === 0 ? 'Sort by' : 'then by'}</span>
          <select
            value={criterion.field}
            onChange={(e) => updateCriterion(criterion.id, { field: e.target.value })}
            className="border rounded px-2 py-1"
          >
            {SORTABLE_FIELDS.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
          <select
            value={criterion.direction}
            onChange={(e) => updateCriterion(criterion.id, { direction: e.target.value as SortDirection })}
            className="border rounded px-2 py-1"
          >
            <option value="asc">↑ ascending</option>
            <option value="desc">↓ descending</option>
          </select>
          <button type="button" onClick={() => removeCriterion(criterion.id)} className="text-red-600 text-sm">
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-3">
        <button type="button" onClick={addCriterion} className="text-sm text-blue-600">
          + Add sort level
        </button>
        {criteria.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm text-gray-500">
            Clear sort
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/SortBuilder.tsx
git commit -m "feat: add SortBuilder component"
```

---

### Task 9: `ColumnPicker` component

**Files:**
- Create: `components/ColumnPicker.tsx`

**Interfaces:**
- Consumes: `TABLE_COLUMN_FIELDS` (Task 2).
- Produces: `<ColumnPicker selected={string[]} onChange={(selected: string[]) => void} />`. Used by Task 11 (`ApartmentBrowser`).

No automated test (interactive React component; see Global Constraints).

- [ ] **Step 1: Implement it**

Create `components/ColumnPicker.tsx`:

```tsx
'use client';

import { TABLE_COLUMN_FIELDS } from '@/lib/apartments/fields';

export function ColumnPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="border rounded p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
      {TABLE_COLUMN_FIELDS.map((field) => (
        <label key={field.key} className="flex items-center gap-2">
          <input type="checkbox" checked={selected.includes(field.key)} onChange={() => toggle(field.key)} />
          {field.label}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ColumnPicker.tsx
git commit -m "feat: add ColumnPicker component"
```

---

### Task 10: `ApartmentTable` component

**Files:**
- Create: `components/ApartmentTable.tsx`

**Interfaces:**
- Consumes: `getField` (Task 2), `formatPrice`, `STATUS_LABELS`, `MAKLERVERTRAG_LABELS` (`lib/apartments/format.ts`, existing).
- Produces: `<ApartmentTable apartments={Apartment[]} columns={string[]} />`. Used by Task 11 (`ApartmentBrowser`).

No automated test (interactive React component; see Global Constraints).

- [ ] **Step 1: Implement it**

Create `components/ApartmentTable.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { Apartment } from '@prisma/client';
import { getField } from '@/lib/apartments/fields';
import { formatPrice, STATUS_LABELS, MAKLERVERTRAG_LABELS } from '@/lib/apartments/format';

function formatCell(apartment: Apartment, key: string): string {
  const field = getField(key);
  if (!field) return '—';
  const value = (apartment as unknown as Record<string, unknown>)[key];
  if (value == null) return '—';

  if (key === 'price' || key === 'hausgeld') return formatPrice(value as number) ?? '—';
  if (key === 'livingArea') return `${value} m²`;
  if (key === 'status') return STATUS_LABELS[apartment.status] ?? String(value);
  if (key === 'maklervertragStatus') return MAKLERVERTRAG_LABELS[apartment.maklervertragStatus] ?? String(value);
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function ApartmentTable({ apartments, columns }: { apartments: Apartment[]; columns: string[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            {columns.map((key) => (
              <th key={key} className="p-2 font-medium">
                {getField(key)?.label ?? key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apartments.map((apartment) => (
            <tr
              key={apartment.id}
              onClick={() => router.push(`/apartments/${apartment.id}`)}
              className="border-b hover:bg-gray-50 cursor-pointer"
            >
              {columns.map((key) => (
                <td key={key} className="p-2">
                  {formatCell(apartment, key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ApartmentTable.tsx
git commit -m "feat: add ApartmentTable component"
```

---

### Task 11: `ApartmentBrowser` — wire everything together

**Files:**
- Create: `components/ApartmentBrowser.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `ApartmentCard` (existing), `AddApartmentCard` (existing), `ApartmentTable` (Task 10), `FilterBuilder` (Task 7), `SortBuilder` (Task 8), `ColumnPicker` (Task 9), `useLocalStorageState` (Task 6), `matchesAllFilters`/`FilterCondition` (Task 3), `matchesSearch` (Task 4), `sortApartments`/`SortCriterion` (Task 5), `getField`/`DEFAULT_TABLE_COLUMNS` (Task 2).
- Produces: `<ApartmentBrowser apartments={...} />`, replacing the home page's direct card-grid rendering.

No automated test (interactive React component; see Global Constraints) — this is the plan's integration point, verified via `tsc --noEmit`, `npm run build`, `npm test` (full suite, confirms nothing broke), and manual use of the running app.

- [ ] **Step 1: Implement the component**

Create `components/ApartmentBrowser.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { Apartment, Document, Image as ApartmentImage } from '@prisma/client';
import { ApartmentCard } from '@/components/ApartmentCard';
import { AddApartmentCard } from '@/components/AddApartmentCard';
import { ApartmentTable } from '@/components/ApartmentTable';
import { FilterBuilder } from '@/components/FilterBuilder';
import { SortBuilder } from '@/components/SortBuilder';
import { ColumnPicker } from '@/components/ColumnPicker';
import { useLocalStorageState } from '@/lib/hooks/useLocalStorageState';
import { matchesAllFilters, type FilterCondition } from '@/lib/apartments/filterApartments';
import { matchesSearch } from '@/lib/apartments/searchApartments';
import { sortApartments, type SortCriterion } from '@/lib/apartments/sortApartments';
import { getField, DEFAULT_TABLE_COLUMNS } from '@/lib/apartments/fields';

type ApartmentWithRelations = Apartment & { images: ApartmentImage[]; documents: Document[] };

type ViewMode = 'card' | 'table';
type OpenPanel = 'filter' | 'sort' | 'columns' | null;

export function ApartmentBrowser({ apartments }: { apartments: ApartmentWithRelations[] }) {
  const [viewMode, setViewMode] = useLocalStorageState<ViewMode>('flatTracker.viewMode', 'card');
  const [columns, setColumns] = useLocalStorageState<string[]>('flatTracker.tableColumns', DEFAULT_TABLE_COLUMNS);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([]);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [showAddCard, setShowAddCard] = useState(false);

  const visibleApartments = useMemo(() => {
    const filtered = apartments.filter(
      (apartment) => matchesSearch(apartment, search) && matchesAllFilters(apartment, filters),
    );
    return sortApartments(filtered, sortCriteria);
  }, [apartments, search, filters, sortCriteria]);

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function removeFilter(id: string) {
    setFilters(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[160px]"
        />
        <div className="flex border rounded overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 ${viewMode === 'card' ? 'bg-black text-white' : 'bg-white'}`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 ${viewMode === 'table' ? 'bg-black text-white' : 'bg-white'}`}
          >
            Table
          </button>
        </div>
        <button type="button" onClick={() => togglePanel('filter')} className="border rounded px-3 py-1.5 text-sm">
          Filter{filters.length > 0 ? ` (${filters.length})` : ''}
        </button>
        <button type="button" onClick={() => togglePanel('sort')} className="border rounded px-3 py-1.5 text-sm">
          Sort{sortCriteria.length > 0 ? ` (${sortCriteria.length})` : ''}
        </button>
        {viewMode === 'table' && (
          <>
            <button type="button" onClick={() => togglePanel('columns')} className="border rounded px-3 py-1.5 text-sm">
              Columns
            </button>
            <button
              type="button"
              onClick={() => setShowAddCard((shown) => !shown)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              + Add apartment
            </button>
          </>
        )}
      </div>

      {openPanel === 'filter' && <FilterBuilder conditions={filters} onChange={setFilters} />}
      {openPanel === 'sort' && <SortBuilder criteria={sortCriteria} onChange={setSortCriteria} />}
      {openPanel === 'columns' && <ColumnPicker selected={columns} onChange={setColumns} />}

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <span key={filter.id} className="text-xs bg-gray-100 rounded-full px-3 py-1 flex items-center gap-1">
              {getField(filter.field)?.label ?? filter.field} {filter.operator} {filter.value}
              <button type="button" onClick={() => removeFilter(filter.id)} className="text-gray-500">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {viewMode === 'table' && showAddCard && (
        <div className="max-w-sm">
          <AddApartmentCard />
        </div>
      )}

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AddApartmentCard />
          {visibleApartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      ) : (
        <ApartmentTable apartments={visibleApartments} columns={columns} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Simplify the home page**

Replace `app/page.tsx`:

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

- [ ] **Step 3: Verify it compiles and the full suite passes**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm test` — expect all tests passing (the full suite, to confirm nothing in Plan 1/2's existing pages/actions broke).
Run: `npm run build` — expect a clean production build.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, visit `http://localhost:3000` with at least 3-4 existing apartments (varying price/rooms/status/balcony so filters/sort have something to show):

1. Confirm the card grid renders exactly as before (Plan 1/2 behavior unchanged), with `AddApartmentCard` still the first item.
2. Type in Search — confirm the grid narrows to matching apartments as you type, and clears back to all when you clear the box.
3. Open Filter, add a condition (e.g. Price < some value), confirm the grid narrows accordingly and a removable chip appears below the toolbar; remove it via the chip's `×` and confirm the grid returns to unfiltered.
4. Open Sort, add a criterion (e.g. Price ascending), confirm card order changes; add a second criterion and confirm it breaks ties correctly.
5. Switch to Table view — confirm it shows the default columns (Address, Price, Living area, Rooms, Hausgeld, Status, Maklervertrag), search/filter/sort still apply, and clicking anywhere on a row navigates to that apartment's detail page.
6. Open Columns in table view, toggle a column off and on — confirm the table updates immediately.
7. Reload the page — confirm view mode (should still be Table) and column selection persist; confirm search/filter/sort reset to empty (expected, in-memory only).
8. In Table view, click "+ Add apartment", confirm `AddApartmentCard` appears inline and adding an apartment via a dropped fixture file still works end-to-end (reuses Plan 2's already-tested pipeline).
9. Switch back to Card view, reload — confirm it now defaults to Card (persisted).

- [ ] **Step 5: Commit**

```bash
git add components/ApartmentBrowser.tsx app/page.tsx
git commit -m "feat: add table view, filtering, sorting, and search to the home page"
```

---

## Definition of done for this plan

- `npm test` passes (full suite, including the new `tests/apartments/{fields,filterApartments,searchApartments,sortApartments}.test.ts`).
- `npx tsc --noEmit` and `npm run build` are clean.
- On `npm run dev`: the home page supports Card/Table toggle (persisted), search, combinable filters (removable, visibly active), multi-criterion sort, and table column selection (persisted) — all client-side and instant, per the design doc.
- No change to Plan 1 (apartment CRUD, documents, notes, status) or Plan 2 (scraping/ingestion) behavior — this plan only adds a new browsing layer on top of the existing `listApartments()` data.
- This completes the MVP scope described in `docs/superpowers/plans/2026-09-06-core-skeleton.md`.
