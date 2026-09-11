# CLAUDE.md

Operational notes for working in this repo. See `specs.md` for the product spec.

## Testing conventions

- `lib/` and `lib/db/*`: TDD with real Vitest tests (integration tests against the real SQLite test DB — see `.env.test` / `vitest.config.ts`). Write the failing test first, verify RED, implement, verify GREEN.
- React components/hooks under `components/` and `app/`: **not** unit-tested. `vitest.config.ts` runs with `environment: 'node'` — there's no jsdom/DOM environment installed, deliberately. Verify UI changes with `npx tsc --noEmit`, `npm run build`, and manual browser testing instead.

## Dev server / build cache

Never run `npm run build` while a `npm run dev` server is running against the same `.next/` directory — they race on the webpack cache and corrupt it. Symptoms: missing CSS, `Cannot find module './vendor-chunks/...'`, `PageNotFoundError: Cannot find module for page`. Always:

```bash
# kill any running dev server first, then:
rm -rf .next
npm run build   # or npm run dev
```

If a corrupted cache is suspected even without an obvious build/dev race, `rm -rf .next node_modules/.cache` and restart clean.

## Routing gotcha

`app/@modal/(.)apartments/[id]/page.tsx` intercepts `/apartments/[id]` to show the overlay. Its `[id]` segment matches ANY literal path segment via client-side `<Link>` navigation — including `/apartments/new`. Any link to `/apartments/new` from a client component must be a plain `<a href="...">`, not `<Link>`, to force a full navigation that bypasses interception. See the comment in `components/AddApartmentCard.tsx`.

## Data model notes

- `Image.order` is the single source of truth for both display sequence and "cover image": `images[0]` (lowest `order`) is always what's shown as the card thumbnail / carousel's first photo. `lib/db/images.ts`'s `setCoverImage` reorders; `appendImage` appends after the current max order.
- Deleting an apartment (`deleteApartment` in `lib/db/apartments.ts`) also deletes its `data/files/<id>/` directory via `fileStorage.deleteAll` — DB delete alone would orphan uploaded files on disk.
- Date-only fields (`viewingDate`) are stored as a bare `YYYY-MM-DD` string, not a Prisma `DateTime` — matches `<input type="date">`'s native format exactly and sidesteps UTC/local timezone shift bugs a `Date` round-trip would risk. `lib/apartments/format.ts` has the (de)serialization/comparison helpers (`formatViewingDate`, `isUpcomingViewingDate`, `viewingDateSortRank`); follow this pattern for any future date-only field instead of reaching for `DateTime`.

## Data is git-tracked, not ignored — single-writer model

`data/app.db` and `data/files/` are committed on purpose (only `data/test.db` and SQLite's transient `*.db-wal`/`*.db-shm`/`*.db-journal` files stay gitignored). This only works because exactly one instance is ever allowed to write: the local dev server. Any other running instance (a Codespace, a Render deployment, anything reachable by a second person) MUST run with `NEXT_PUBLIC_READ_ONLY=true` — see below — or this sync model breaks (two writers means the next `git pull`/`push` can silently clobber one side's edits, since SQLite is a binary file git can't merge). Workflow: edit locally → `git add data && git commit && git push` → `git pull` on any read-only mirror to refresh it.

## Read-only mode

Set `NEXT_PUBLIC_READ_ONLY=true` (`.env`, or the host's env var config) to make an instance view-only — used to give a second person access to a deployment without giving them edit rights, with no login system involved. `NEXT_PUBLIC_`-prefixed so `lib/readOnly.ts`'s `isReadOnly()`/`assertNotReadOnly()` work identically in server actions and client components without a context provider. Two things every future mutating code path must do:

- Server action: call `assertNotReadOnly()` as the first line — this is the actual enforcement boundary. Every action in `app/actions/*.ts` already does this; new ones must too.
- UI: call `isReadOnly()` to hide or `<fieldset disabled>` the corresponding controls, so a read-only viewer isn't shown dead buttons. This is UX polish only, not the security boundary.

Because `NEXT_PUBLIC_*` vars are inlined into the client bundle at build time (not read at runtime), a host's env var must be set *before* its build runs — toggling it after deploy without a rebuild has no effect on client-rendered UI (server-side checks like `assertNotReadOnly()` are unaffected, since server code reads `process.env` fresh per request either way).

## Schema migrations that change or transform existing data

`npx prisma migrate dev --create-only` refuses to run non-interactively whenever Prisma detects a data-loss warning (e.g. changing a column's type, dropping a column with existing rows) — it needs a TTY to confirm, which isn't available here. Workaround used repeatedly in this repo: hand-write (or generate once via `--create-only` when there's no warning, then edit) the migration's `migration.sql`, using SQLite's "redefine tables" rebuild pattern (`CREATE TABLE new_X ...; INSERT INTO new_X SELECT ... FROM X; DROP TABLE X; ALTER TABLE new_X RENAME TO X;`) with a `CASE` expression in the `SELECT` to transform data during the copy, then apply with `npx prisma migrate deploy` (which doesn't have the interactive-confirmation restriction). See `prisma/migrations/20260909183936_kitchen_boolean` or `.../20260909190548_drop_maklerprovision_text` for real examples, including the backfill-before-drop pattern.

## Computed (non-stored) catalog fields

`lib/apartments/fields.ts`'s `FieldDef` supports an optional `computed(apartment)` function for values that aren't real columns — e.g. `maklerFee` (price × maklerprovisionPercent) and `viewingDate`'s sort rank. `getFieldValue()` is the single access point that checks for `computed` before falling back to a plain property read, and both `sortApartments.ts` and `filterApartments.ts` already go through `getFieldValue()` — so a computed field is automatically sortable/filterable/table-displayable for free, no changes needed in those files.

## Auto-submitting form controls

`components/AutoSubmitSelect.tsx` and `AutoSubmitDateInput.tsx` call `event.currentTarget.form?.requestSubmit()` on change, so picking a value *is* the save action — no separate submit button. Used for Status, Maklervertrag, and Viewing date. Reach for these instead of a button+form when a control's value has no reason to be edited without immediately saving.

## Deployment

Private GitHub repo (`https://github.com/m-guseva/flat-buying-tracker`) is `origin`. The local dev server is the only writer (see "Data is git-tracked" above); a read-only mirror can run via GitHub Codespaces (manual start/stop, free tier ~60hrs/month on a 2-core machine) or a host like Render (free tier, sleeps when idle and auto-wakes on request — `npm install && npm run build` / `npm start`, needs `DATABASE_URL=file:../data/app.db` and `NEXT_PUBLIC_READ_ONLY=true` set as env vars before its build runs). `package.json`'s `start` script binds to `$PORT` when the host assigns one, and `postinstall` runs `prisma generate`, for exactly this.

## Attribution

Commits/PRs include Claude co-authorship trailers per the active session's instructions — these vary per session, so don't hardcode a specific session URL here.
