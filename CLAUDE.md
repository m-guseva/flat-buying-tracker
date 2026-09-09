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

## Attribution

Commits/PRs include Claude co-authorship trailers per the active session's instructions — these vary per session, so don't hardcode a specific session URL here.
