# Scraping / Ingestion Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add an apartment by pasting an ImmoScout24/Immowelt URL or dropping a saved copy of the listing page, automatically populating apartment fields, downloading real gallery images, detecting duplicates by URL, and offering a recovery path when live scraping is blocked.

**Architecture:** A new `lib/ingestion/` module holds two site-specific scrapers behind a shared `Scraper` interface (`canHandle`/`fetchHtml`/`parse`), a pure `parse()` per site tested against committed real-listing HTML fixtures, and a shared orchestration pipeline (`addApartmentFromInput`) that both the URL-paste and HTML-upload paths funnel through. Image URLs are recovered from the HTML (live-fetched or uploaded) and downloaded directly from each site's CDN, which is unprotected even though the listing pages themselves are bot-walled.

**Tech Stack:** Next.js 14 (App Router, Server Actions), TypeScript, Prisma + SQLite, `cheerio` (new dependency, HTML parsing), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-scraping-ingestion-design.md` (this plan's design doc — read it first for the *why* behind each decision below); `specs.md` §3–5, §20–22 (product requirements this plan implements).

## Global Constraints

- TypeScript strict mode (existing project default).
- All currency/date/number display uses German locale formatting where applicable (existing convention from the core-skeleton plan).
- No automated test may depend on live network reachability of immobilienscout24.de or immowelt.de — both are confirmed bot-walled (DataDome / AWS WAF). Scraper parsing is tested only against the two real-listing fixtures already committed at `tests/fixtures/immoscout24.html` and `tests/fixtures/immowelt.html`.
- Images and documents remain stored on disk under `./data/files/<apartmentId>/...`, never inline in the database (per spec §21).
- `./data/` and `.env` stay git-ignored (personal data, not code) — already configured.
- Follow this codebase's existing style for building partial-update objects: explicit per-field `if (x !== undefined) result.x = x;` checks, not a generic loop over a keys array (matches the existing `parseApartmentPropertiesForm` in `lib/apartments/formData.ts`).
- `cheerio` is a new dependency (already installed in the working tree as of this plan being written — `npm ls cheerio` shows `cheerio@1.2.0`; if starting from a fresh checkout, `npm install cheerio` first).

---

### Task 1: Data model — add `'OTHER'` as a valid source

**Files:**
- Modify: `lib/db/apartments.ts:16`
- Test: `tests/db/apartments.test.ts` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CreateApartmentInput['source']` now includes `'OTHER'`, used by Task 10's ingestion pipeline for URLs matching neither scraper.

- [ ] **Step 1: Write the failing test**

Append to `tests/db/apartments.test.ts` (inside the existing `describe('apartment repository', ...)` block, alongside the other `it(...)` cases):

```ts
  it('creates and finds an apartment with source OTHER', async () => {
    const apartment = await createApartment({
      source: 'OTHER',
      sourceUrl: 'https://www.example.com/listing/42',
    });
    createdIds.push(apartment.id);

    expect(apartment.source).toBe('OTHER');

    const found = await findApartmentBySourceUrl('https://www.example.com/listing/42');
    expect(found?.id).toBe(apartment.id);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/db/apartments.test.ts`
Expected: FAIL — TypeScript error, `'OTHER'` is not assignable to the `source` union.

- [ ] **Step 3: Widen the source union**

In `lib/db/apartments.ts`, change line 16:

```ts
  source: 'IMMOSCOUT24' | 'IMMOWELT' | 'MANUAL';
```

to:

```ts
  source: 'IMMOSCOUT24' | 'IMMOWELT' | 'MANUAL' | 'OTHER';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/db/apartments.test.ts`
Expected: all tests in this file pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db/apartments.ts tests/db/apartments.test.ts
git commit -m "feat: allow OTHER as an apartment source for unrecognized URLs"
```

---

### Task 2: `normalizeUrl` — canonicalize a listing URL for duplicate comparison

**Files:**
- Create: `lib/ingestion/normalizeUrl.ts`
- Test: `tests/ingestion/normalizeUrl.test.ts`

**Interfaces:**
- Produces: `normalizeUrl(url: string): string`. Used by Task 10 (`addApartmentFromInput`) for both storing `sourceUrl` and for duplicate lookup.

- [ ] **Step 1: Write the failing test**

Create `tests/ingestion/normalizeUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeUrl } from '@/lib/ingestion/normalizeUrl';

describe('normalizeUrl', () => {
  it('strips query parameters and a hash fragment', () => {
    const url =
      'https://www.immobilienscout24.de/expose/169175842?referrer=HYBRID_VIEW_LISTING&searchId=6fd43899-2240-3ae4-b78f-89e8f99eb939&searchType=radius&fairPrice=FAIR_OFFER#/';
    expect(normalizeUrl(url)).toBe('https://www.immobilienscout24.de/expose/169175842');
  });

  it('strips a trailing slash', () => {
    expect(normalizeUrl('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3/')).toBe(
      'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3',
    );
  });

  it('leaves an already-normalized URL unchanged', () => {
    expect(normalizeUrl('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3')).toBe(
      'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/ingestion/normalizeUrl.test.ts`
Expected: FAIL — `lib/ingestion/normalizeUrl` does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/normalizeUrl.ts`:

```ts
export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = '';
  parsed.hash = '';
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/ingestion/normalizeUrl.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/normalizeUrl.ts tests/ingestion/normalizeUrl.test.ts
git commit -m "feat: add normalizeUrl for duplicate-URL comparison"
```

---

### Task 3: `parseGermanNumber` — parse German-locale numeric text

**Files:**
- Create: `lib/ingestion/parseGermanNumber.ts`
- Test: `tests/ingestion/parseGermanNumber.test.ts`

**Interfaces:**
- Produces: `parseGermanNumber(text: string | undefined): number | undefined`. Used by Task 6 and Task 7's scrapers for rooms/area/hausgeld fields (e.g. `"45,99  m²"` → `45.99`, `"1.328 €"` → `1328`).

- [ ] **Step 1: Write the failing test**

Create `tests/ingestion/parseGermanNumber.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseGermanNumber } from '@/lib/ingestion/parseGermanNumber';

describe('parseGermanNumber', () => {
  it('parses a simple integer', () => {
    expect(parseGermanNumber('2')).toBe(2);
  });

  it('parses a German decimal comma with a unit suffix', () => {
    expect(parseGermanNumber('45,99  m²')).toBe(45.99);
  });

  it('parses a value with a thousands separator', () => {
    expect(parseGermanNumber('1.328 €')).toBe(1328);
  });

  it('returns undefined for missing input', () => {
    expect(parseGermanNumber(undefined)).toBeUndefined();
  });

  it('returns undefined for unparseable text', () => {
    expect(parseGermanNumber('n/a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/ingestion/parseGermanNumber.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/parseGermanNumber.ts`:

```ts
export function parseGermanNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
```

Note: `Number('')` is `0`, not `NaN` — the `if (!cleaned) return undefined;` guard before calling `Number()` is required, not defensive filler; without it, unparseable text like `'n/a'` (which strips down to an empty string) would silently produce `0` instead of `undefined`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/ingestion/parseGermanNumber.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/parseGermanNumber.ts tests/ingestion/parseGermanNumber.test.ts
git commit -m "feat: add parseGermanNumber for scraped numeric fields"
```

---

### Task 4: `extractGalleryImages` — recover absolute CDN URLs for gallery images

**Files:**
- Create: `lib/ingestion/extractGalleryImages.ts`
- Test: `tests/ingestion/extractGalleryImages.test.ts`

**Interfaces:**
- Produces: `extractGalleryImages(html: string, imgSrcs: string[], cdnHost: string): string[]`. Used by Task 6 and Task 7's scrapers.

This is the mechanism described in the design doc §4: an `<img src>` found in the scraper's scoped gallery container is either already an absolute CDN URL (the live-fetch case) or a local path rewritten by a browser's "Save Page As" (the uploaded-file case). For the latter, the image's UUID survives in the local filename; this function recovers the real absolute URL by finding that UUID inside an absolute URL on the given CDN host elsewhere in the raw HTML text — necessary because Immowelt's URLs carry a signed `ci_seal` query parameter that cannot be reconstructed, only recovered verbatim.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/extractGalleryImages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractGalleryImages } from '@/lib/ingestion/extractGalleryImages';

describe('extractGalleryImages', () => {
  it('passes through an already-absolute src unchanged (live-fetch case)', () => {
    const url = 'https://pictures.immobilienscout24.de/listings/xyz.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80';
    expect(extractGalleryImages('', [url], 'pictures.immobilienscout24.de')).toEqual([url]);
  });

  it('resolves a relative local src by finding its UUID inside an absolute CDN URL elsewhere in the page', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<script>{"url":"https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80"}</script>`;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'pictures.immobilienscout24.de');
    expect(result).toEqual([
      `https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80`,
    ]);
  });

  it('prefers the 1106x830 size variant when multiple sizes are present for the same image', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `
      <a href="https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/legacy_thumbnail/80x60/format/jpg/quality/80"></a>
      <a href="https://pictures.immobilienscout24.de/listings/${guid}.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80"></a>
    `;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'pictures.immobilienscout24.de');
    expect(result[0]).toContain('1106x830');
  });

  it('drops an image whose UUID cannot be found anywhere in the page', () => {
    const result = extractGalleryImages('<html>no matches here</html>', ['page_files/no-guid-here.jpg'], 'pictures.immobilienscout24.de');
    expect(result).toEqual([]);
  });

  it('deduplicates the same image appearing twice (carousel loop-around)', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<a href="https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=abc"></a>`;
    const srcs = [`page_files/${guid}_x.jpg`, `page_files/${guid}_x.jpg`];
    const result = extractGalleryImages(html, srcs, 'mms.immowelt.de');
    expect(result).toEqual([`https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=abc`]);
  });

  it('recovers a signed URL that cannot be reconstructed from the UUID alone', () => {
    const guid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const html = `<a href="https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6"></a>`;
    const result = extractGalleryImages(html, [`page_files/${guid}_x.jpg`], 'mms.immowelt.de');
    expect(result).toEqual([`https://mms.immowelt.de/a/a/a/a/${guid}.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6`]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/extractGalleryImages.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/extractGalleryImages.ts`:

```ts
const GUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-\d+)?/i;

export function extractGalleryImages(html: string, imgSrcs: string[], cdnHost: string): string[] {
  const escapedHost = cdnHost.replace(/\./g, '\\.');
  const urls: string[] = [];

  for (const src of imgSrcs) {
    if (/^https?:\/\//.test(src)) {
      urls.push(src);
      continue;
    }

    const guidMatch = src.match(GUID_PATTERN);
    if (!guidMatch) continue;
    const guid = guidMatch[0];

    const urlPattern = new RegExp(`https://${escapedHost}/[^"'\\\\]*${guid}[^"'\\\\]*`, 'g');
    const matches = html.match(urlPattern);
    if (!matches || matches.length === 0) continue;

    const largeVariant = matches.find((match) => /1106x830/.test(match));
    urls.push(largeVariant ?? matches[0]);
  }

  return Array.from(new Set(urls));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/extractGalleryImages.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/extractGalleryImages.ts tests/ingestion/extractGalleryImages.test.ts
git commit -m "feat: add extractGalleryImages to recover CDN URLs from scraped HTML"
```

---

### Task 5: `recoverSourceUrl` — recover the original listing URL from saved HTML

**Files:**
- Create: `lib/ingestion/recoverSourceUrl.ts`
- Test: `tests/ingestion/recoverSourceUrl.test.ts`

**Interfaces:**
- Consumes: `cheerio` (new dependency).
- Produces: `recoverSourceUrl(html: string): string | null`. Used by Task 10 and Task 11 when an HTML file is uploaded without a separately pasted URL.

- [ ] **Step 1: Confirm cheerio is installed**

Run: `npm ls cheerio`
Expected: prints an installed version (e.g. `cheerio@1.2.0`). If missing, run `npm install cheerio` first.

- [ ] **Step 2: Write the failing tests**

Create `tests/ingestion/recoverSourceUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { recoverSourceUrl } from '@/lib/ingestion/recoverSourceUrl';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');
const immoweltHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immowelt.html'), 'utf-8');

describe('recoverSourceUrl', () => {
  it('recovers the canonical URL from a saved ImmoScout24 page', () => {
    expect(recoverSourceUrl(immoscout24Html)).toBe('https://www.immobilienscout24.de/expose/169009235');
  });

  it('recovers the canonical URL from a saved Immowelt page', () => {
    expect(recoverSourceUrl(immoweltHtml)).toBe('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3');
  });

  it('returns null when neither a canonical link nor an og:url meta tag is present', () => {
    expect(recoverSourceUrl('<html><head></head><body></body></html>')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/recoverSourceUrl.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 4: Implement it**

Create `lib/ingestion/recoverSourceUrl.ts`:

```ts
import * as cheerio from 'cheerio';

export function recoverSourceUrl(html: string): string | null {
  const $ = cheerio.load(html);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;
  const ogUrl = $('meta[property="og:url"]').attr('content');
  return ogUrl ?? null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/recoverSourceUrl.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/ingestion/recoverSourceUrl.ts tests/ingestion/recoverSourceUrl.test.ts
git commit -m "feat: add recoverSourceUrl and cheerio dependency"
```

---

### Task 6: ImmoScout24 scraper

**Files:**
- Create: `lib/ingestion/types.ts`
- Create: `lib/ingestion/immoscout24.ts`
- Test: `tests/ingestion/immoscout24.test.ts`

**Interfaces:**
- Consumes: `parseGermanNumber` (Task 3), `extractGalleryImages` (Task 4), `cheerio`.
- Produces: `ScrapedApartment`, `Scraper` types (in `types.ts`, also used by Task 7, 8, 10, 11); `immoscout24Scraper: Scraper` (used by Task 8's registry).

- [ ] **Step 1: Create the shared ingestion types**

Create `lib/ingestion/types.ts`:

```ts
export interface ScrapedApartment {
  title?: string;
  address?: string;
  price?: number;
  rooms?: number;
  livingArea?: number;
  floor?: string;
  balcony?: boolean;
  elevator?: boolean;
  kitchen?: string;
  condition?: string;
  hausgeld?: number;
  maklerprovision?: string;
  images: string[];
}

export interface Scraper {
  source: 'IMMOSCOUT24' | 'IMMOWELT';
  canHandle(url: string): boolean;
  fetchHtml(url: string): Promise<string>;
  parse(html: string, sourceUrl: string): ScrapedApartment;
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/ingestion/immoscout24.test.ts`. The expected values below were verified by running the actual parse logic against the real fixture, not guessed:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { immoscout24Scraper } from '@/lib/ingestion/immoscout24';

const fixtureHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');
const sourceUrl = 'https://www.immobilienscout24.de/expose/169009235';

describe('immoscout24Scraper.canHandle', () => {
  it('matches immobilienscout24.de URLs', () => {
    expect(immoscout24Scraper.canHandle('https://www.immobilienscout24.de/expose/123')).toBe(true);
  });

  it('rejects other URLs', () => {
    expect(immoscout24Scraper.canHandle('https://www.immowelt.de/expose/123')).toBe(false);
  });
});

describe('immoscout24Scraper.parse', () => {
  const result = immoscout24Scraper.parse(fixtureHtml, sourceUrl);

  it('extracts title, address, and price from JSON-LD', () => {
    expect(result.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(result.address).toBe('Elsenstraße 5, 12435 Berlin');
    expect(result.price).toBe(229900);
  });

  it('extracts rooms, living area, floor, hausgeld, and maklerprovision', () => {
    expect(result.rooms).toBe(2);
    expect(result.livingArea).toBeCloseTo(45.99);
    expect(result.floor).toBe('1 von 4');
    expect(result.hausgeld).toBe(328);
    expect(result.maklerprovision).toBe('Nein');
  });

  it('detects balcony and elevator as present', () => {
    expect(result.balcony).toBe(true);
    expect(result.elevator).toBe(true);
  });

  it('leaves condition and kitchen undefined when not present on the listing', () => {
    expect(result.condition).toBeUndefined();
    expect(result.kitchen).toBeUndefined();
  });

  it('extracts the 4 real gallery images at full size, excluding recommended listings', () => {
    expect(result.images).toEqual([
      'https://pictures.immobilienscout24.de/listings/13922db7-711e-470c-9f78-500aa4536aee-2052742405.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/0c717341-0ac4-465a-a007-3b8e6f8561fd-2052742407.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/18ae457b-9861-4af7-9ede-2821857e6d73-2052742404.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
      'https://pictures.immobilienscout24.de/listings/71272d62-4166-4ed2-8f0c-54846711248d-2052742408.jpg/ORIG/resize/1106x830%3E/format/jpg/quality/80',
    ]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/immoscout24.test.ts`
Expected: FAIL — `lib/ingestion/immoscout24` does not exist yet.

- [ ] **Step 4: Implement the scraper**

Create `lib/ingestion/immoscout24.ts`:

```ts
import * as cheerio from 'cheerio';
import type { Scraper, ScrapedApartment } from './types';
import { extractGalleryImages } from './extractGalleryImages';
import { parseGermanNumber } from './parseGermanNumber';

const CDN_HOST = 'pictures.immobilienscout24.de';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const immoscout24Scraper: Scraper = {
  source: 'IMMOSCOUT24',

  canHandle(url: string): boolean {
    return /immobilienscout24\.de/.test(url);
  },

  async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`ImmoScout24 fetch failed: HTTP ${response.status}`);
    }
    return response.text();
  },

  parse(html: string, sourceUrl: string): ScrapedApartment {
    const $ = cheerio.load(html);
    const result: ScrapedApartment = { images: [] };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const nodes: Array<Record<string, any>> = data['@graph'] ?? [data];
        const listing = nodes.find((node) => node['@type'] === 'RealEstateListing');
        if (listing) {
          if (listing.name) result.title = listing.name;
          if (listing.offers?.price) result.price = Number(listing.offers.price);
          const addr = listing.address;
          if (addr) {
            const cityLine = [addr.postalCode, addr.addressLocality].filter(Boolean).join(' ');
            const parts = [addr.streetAddress, cityLine].filter(Boolean);
            if (parts.length) result.address = parts.join(', ');
          }
        }
      } catch {
        // not the listing's JSON-LD block, or malformed — skip it
      }
    });

    const qaText = (className: string): string | undefined => {
      const text = $(`.${className}`).first().text().trim();
      return text || undefined;
    };

    const rooms = parseGermanNumber(qaText('is24qa-zimmer'));
    if (rooms !== undefined) result.rooms = rooms;
    const livingArea = parseGermanNumber(qaText('is24qa-wohnflaeche-ca'));
    if (livingArea !== undefined) result.livingArea = livingArea;
    const floor = qaText('is24qa-etage');
    if (floor) result.floor = floor;
    const hausgeld = parseGermanNumber(qaText('is24qa-hausgeld'));
    if (hausgeld !== undefined) result.hausgeld = hausgeld;
    const maklerprovision = qaText('is24qa-provision');
    if (maklerprovision) result.maklerprovision = maklerprovision;

    // IS24's boolean-feature indicator tags only render when the feature IS
    // present — there is no explicit "no balcony" tag — so absence means
    // "unknown", not "false". Only ever set true, never false.
    if ($('[data-qa="is24qa-balcony-label"]').length > 0) result.balcony = true;
    if ($('[data-qa="is24qa-lift-label"]').length > 0) result.elevator = true;

    const localSrcs = $('#is24-gallery-entry-point')
      .find('img[data-testid="gallery-entry-image"]')
      .map((_, img) => $(img).attr('src') ?? '')
      .get()
      .filter(Boolean);
    result.images = extractGalleryImages(html, localSrcs, CDN_HOST);

    return result;
  },
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/immoscout24.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/ingestion/types.ts lib/ingestion/immoscout24.ts tests/ingestion/immoscout24.test.ts
git commit -m "feat: add ImmoScout24 scraper"
```

---

### Task 7: Immowelt scraper

**Files:**
- Create: `lib/ingestion/immowelt.ts`
- Test: `tests/ingestion/immowelt.test.ts`

**Interfaces:**
- Consumes: `Scraper`, `ScrapedApartment` (Task 6), `parseGermanNumber` (Task 3), `extractGalleryImages` (Task 4).
- Produces: `immoweltScraper: Scraper` (used by Task 8's registry).

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/immowelt.test.ts`. As with Task 6, these values were verified against real cheerio output, not the source page's visual rendering — cheerio's `.text()` inserts no whitespace between sibling tags, which matters for a couple of these fields (see the implementation step):

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { immoweltScraper } from '@/lib/ingestion/immowelt';

const fixtureHtml = readFileSync(path.join(process.cwd(), 'tests/fixtures/immowelt.html'), 'utf-8');
const sourceUrl = 'https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3';

describe('immoweltScraper.canHandle', () => {
  it('matches immowelt.de URLs', () => {
    expect(immoweltScraper.canHandle('https://www.immowelt.de/expose/123')).toBe(true);
  });

  it('rejects other URLs', () => {
    expect(immoweltScraper.canHandle('https://www.immobilienscout24.de/expose/123')).toBe(false);
  });
});

describe('immoweltScraper.parse', () => {
  const result = immoweltScraper.parse(fixtureHtml, sourceUrl);

  it('extracts a title from JSON-LD (an auto-generated summary on this listing)', () => {
    expect(result.title).toBe('Wohnung 46.25 m² 360000 € zum Kauf Mitte,Berlin (10115)');
  });

  it('extracts only district and postal code for address (no street address is present)', () => {
    expect(result.address).toBe('Mitte, Mitte (10115)');
  });

  it('extracts price, hausgeld, and maklerprovision from the price details box', () => {
    expect(result.price).toBe(360000);
    expect(result.hausgeld).toBe(380);
    expect(result.maklerprovision).toBe('3,57 % inkl. MwSt.');
  });

  it('extracts rooms, living area, and floor from the hardfacts row', () => {
    expect(result.rooms).toBe(2);
    expect(result.livingArea).toBeCloseTo(46.3);
    expect(result.floor).toBe('3. Geschoss');
  });

  it('detects balcony, elevator, and kitchen from the features list', () => {
    expect(result.balcony).toBe(true);
    expect(result.elevator).toBe(true);
    expect(result.kitchen).toBe('Einbauküche');
  });

  it('leaves condition undefined when no condition keyword is present', () => {
    expect(result.condition).toBeUndefined();
  });

  it('extracts all 13 real gallery images, excluding similar listings', () => {
    expect(result.images).toEqual([
      'https://mms.immowelt.de/2/b/6/7/2b67b692-e8f0-4b0f-b9fb-be45f34a8978.jpg?ci_seal=f0bbac39e4223fdf2260b7399e829880a3ce2ec6',
      'https://mms.immowelt.de/d/4/e/2/d4e21e41-36b9-48cc-a224-560c5351e086.jpg?ci_seal=ea9f99c9725e37e6e2e0980eb7100d5bcfef243f',
      'https://mms.immowelt.de/2/e/3/2/2e329ed7-dcb7-4cd6-894c-2f1fe72cf6e2.jpg?ci_seal=cc407a921c2adc375989255efaa5a4a712e3171c',
      'https://mms.immowelt.de/1/1/6/e/116ec32e-337e-4c20-8ba8-d71ba70235a2.jpg?ci_seal=9147f29df6d6583882f97a45591996f82487300f',
      'https://mms.immowelt.de/1/1/c/0/11c0cca9-96cf-4325-bccc-a862347373ca.jpg?ci_seal=5af42afd93b29ef297af3039e7bd4b0726b1e62e',
      'https://mms.immowelt.de/8/2/c/7/82c717a3-5db3-4058-93f1-a01d79bd3c23.jpg?ci_seal=af588f3fb307d8a46e3d8af099df1313bc08b160',
      'https://mms.immowelt.de/c/5/5/e/c55ef18e-e040-416e-85e9-ecf693bf81b4.jpg?ci_seal=6f56d2e7eb151c643eb1ee8766d16a6475232f3d',
      'https://mms.immowelt.de/0/5/5/b/055b2643-4927-430b-a5dc-5de34670ddf1.jpg?ci_seal=51f5f91c9268cec0f89423ca93c73ea9de226da8',
      'https://mms.immowelt.de/a/c/3/1/ac31e635-5f70-437d-a4ec-2d6b0723e43b.jpg?ci_seal=042e77858b9f5a37a7f17c9bc809d978f7da0060',
      'https://mms.immowelt.de/4/2/4/3/42432ec2-84e7-458d-9ebc-40a627b63a2b.jpg?ci_seal=4e6215fa7929f201a306a3ec74b86f1d3ff18712',
      'https://mms.immowelt.de/9/9/5/b/995bfd87-8355-4d80-ae78-d19b047ad888.jpg?ci_seal=d8528046696d593b62e715ecf4b7ad839d87dfc0',
      'https://mms.immowelt.de/d/7/7/0/d7705877-e938-4ae5-9b98-e9096804898f.jpg?ci_seal=0d6e49d8baaa0b82bcfd83690c12bef3260836fa',
      'https://mms.immowelt.de/2/8/4/8/2848e3f7-da00-4c02-8452-9a3b5bf142cb.jpg?ci_seal=731e49a59fed6046b4e9548b55ee91e80737a7df',
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/immowelt.test.ts`
Expected: FAIL — `lib/ingestion/immowelt` does not exist yet.

- [ ] **Step 3: Implement the scraper**

Create `lib/ingestion/immowelt.ts`:

```ts
import * as cheerio from 'cheerio';
import type { Scraper, ScrapedApartment } from './types';
import { extractGalleryImages } from './extractGalleryImages';
import { parseGermanNumber } from './parseGermanNumber';

const CDN_HOST = 'mms.immowelt.de';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const immoweltScraper: Scraper = {
  source: 'IMMOWELT',

  canHandle(url: string): boolean {
    return /immowelt\.de/.test(url);
  },

  async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`Immowelt fetch failed: HTTP ${response.status}`);
    }
    return response.text();
  },

  parse(html: string, sourceUrl: string): ScrapedApartment {
    const $ = cheerio.load(html);
    const result: ScrapedApartment = { images: [] };

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data['@type'] === 'RealEstateListing' && data.name) {
          result.title = data.name;
        }
      } catch {
        // not the listing's JSON-LD block, or malformed — skip it
      }
    });

    const address = $('[data-testid="cdp-location-address"]').first().text().trim();
    if (address) result.address = address;

    // cheerio's .text() concatenates sibling elements with no inserted
    // whitespace (e.g. "Kaufpreis360000 €", not "Kaufpreis 360000 €"), so
    // these patterns deliberately do not require whitespace after the label.
    const priceBoxText = $('[data-testid="cdp-price"]').first().text();
    const beforeCostBreakdown = priceBoxText.split('Geschätzte Gesamtkosten')[0];

    const priceMatch = beforeCostBreakdown.match(/Kaufpreis(\d+)\s*€/);
    if (priceMatch) result.price = Number(priceMatch[1]);

    const hausgeldMatch = beforeCostBreakdown.match(/Hausgeld(\d+)\s*€/);
    if (hausgeldMatch) result.hausgeld = Number(hausgeldMatch[1]);

    // "Provision für Käufer" appears a second time inside the cost-breakdown
    // section in a different format ("(3,57%)") — beforeCostBreakdown already
    // excludes that, so this only ever matches the first occurrence.
    const provisionMatch = beforeCostBreakdown.match(/Provision für Käufer([\d,]+\s*%[^]*?)(?=Geld vom Staat|$)/);
    if (provisionMatch) result.maklerprovision = provisionMatch[1].trim();

    const hardfactSpans = $('[data-testid="cdp-hardfacts-keyfacts"]')
      .children('span')
      .map((_, el) => $(el).text().replace(/^•/, '').trim())
      .get();

    for (const text of hardfactSpans) {
      const roomsMatch = text.match(/^(\d+)\s*Zimmer/);
      if (roomsMatch) result.rooms = Number(roomsMatch[1]);
      const areaMatch = text.match(/^([\d,]+)\s*m²/);
      if (areaMatch) result.livingArea = parseGermanNumber(areaMatch[1]);
      if (/Geschoss/.test(text)) result.floor = text;
    }

    // No per-feature hook exists (Emotion's css-xxxxxx classnames are not
    // stable across deploys) — match each list item's text against known
    // keywords instead. German compound nouns keep the second component
    // lowercase ("Personenaufzug", not "PersonenAufzug"), hence /i.
    $('[data-testid="cdp-features"] li').each((_, el) => {
      const text = $(el).text().trim();
      if (/balkon/i.test(text)) result.balcony = true;
      if (/aufzug|fahrstuhl/i.test(text)) result.elevator = true;
      if (/einbauküche/i.test(text)) result.kitchen = text;
    });

    const localSrcs = $('[data-testid="cdp-medias-overview"]')
      .find('img')
      .map((_, img) => $(img).attr('src') ?? '')
      .get()
      .filter(Boolean);
    result.images = extractGalleryImages(html, localSrcs, CDN_HOST);

    return result;
  },
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/immowelt.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/immowelt.ts tests/ingestion/immowelt.test.ts
git commit -m "feat: add Immowelt scraper"
```

---

### Task 8: Scraper registry

**Files:**
- Create: `lib/ingestion/registry.ts`
- Test: `tests/ingestion/registry.test.ts`

**Interfaces:**
- Consumes: `immoscout24Scraper` (Task 6), `immoweltScraper` (Task 7).
- Produces: `pickScraper(url: string): Scraper | null`. Used by Task 10 and Task 11.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickScraper } from '@/lib/ingestion/registry';

describe('pickScraper', () => {
  it('picks the ImmoScout24 scraper for an immobilienscout24.de URL', () => {
    expect(pickScraper('https://www.immobilienscout24.de/expose/169009235')?.source).toBe('IMMOSCOUT24');
  });

  it('picks the Immowelt scraper for an immowelt.de URL', () => {
    expect(pickScraper('https://www.immowelt.de/expose/33243731-190e-4df3-b1eb-483020d6b6f3')?.source).toBe(
      'IMMOWELT',
    );
  });

  it('returns null for an unrecognized URL', () => {
    expect(pickScraper('https://www.example.com/listing/123')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/registry.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/registry.ts`:

```ts
import { immoscout24Scraper } from './immoscout24';
import { immoweltScraper } from './immowelt';
import type { Scraper } from './types';

const scrapers: Scraper[] = [immoscout24Scraper, immoweltScraper];

export function pickScraper(url: string): Scraper | null {
  return scrapers.find((scraper) => scraper.canHandle(url)) ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/registry.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/registry.ts tests/ingestion/registry.test.ts
git commit -m "feat: add scraper registry"
```

---

### Task 9: Image download pipeline

**Files:**
- Create: `lib/ingestion/downloadAndStoreImages.ts`
- Test: `tests/ingestion/downloadAndStoreImages.test.ts`

**Interfaces:**
- Consumes: `createImage` (`lib/db/images.ts`, existing).
- Produces: `downloadAndStoreImages(apartmentId: string, imageUrls: string[]): Promise<void>`. Used by Task 10 and Task 11.

Processing is sequential (not concurrent) deliberately — for a personal tool downloading at most ~13 images, the extra second or two is immaterial, and sequential processing keeps ordering fully deterministic without needing to reason about concurrent-promise interleaving in tests.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/downloadAndStoreImages.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createImageMock = vi.fn();
vi.mock('@/lib/db/images', () => ({
  createImage: (...args: unknown[]) => createImageMock(...args),
}));

import { downloadAndStoreImages } from '@/lib/ingestion/downloadAndStoreImages';

function mockResponse(body: string, ok = true): Response {
  return new Response(body, { status: ok ? 200 : 500 });
}

describe('downloadAndStoreImages', () => {
  beforeEach(() => {
    createImageMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads each image in order and stores it with a sequential order index', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse('image-a'))
      .mockResolvedValueOnce(mockResponse('image-b'));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg']);

    expect(createImageMock).toHaveBeenCalledTimes(2);
    expect(createImageMock.mock.calls[0]).toEqual(['apartment-1', Buffer.from('image-a'), 'photo-1.jpg', 0]);
    expect(createImageMock.mock.calls[1]).toEqual(['apartment-1', Buffer.from('image-b'), 'photo-2.jpg', 1]);
  });

  it('skips a failed download and keeps the next successful image contiguous', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(mockResponse('image-b'));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/broken.jpg', 'https://cdn.example.com/b.jpg']);

    expect(createImageMock).toHaveBeenCalledTimes(1);
    expect(createImageMock.mock.calls[0]).toEqual(['apartment-1', Buffer.from('image-b'), 'photo-1.jpg', 0]);
  });

  it('skips a non-OK response without throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse('', false));
    vi.stubGlobal('fetch', fetchMock);

    await downloadAndStoreImages('apartment-1', ['https://cdn.example.com/missing.jpg']);

    expect(createImageMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/downloadAndStoreImages.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/downloadAndStoreImages.ts`:

```ts
import { createImage } from '@/lib/db/images';

export async function downloadAndStoreImages(apartmentId: string, imageUrls: string[]): Promise<void> {
  let order = 0;
  for (const url of imageUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      await createImage(apartmentId, buffer, `photo-${order + 1}.jpg`, order);
      order += 1;
    } catch {
      // one failed image download must not block the others or the apartment
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/downloadAndStoreImages.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/downloadAndStoreImages.ts tests/ingestion/downloadAndStoreImages.test.ts
git commit -m "feat: add downloadAndStoreImages"
```

---

### Task 10: Add-apartment ingestion pipeline

**Files:**
- Create: `lib/ingestion/addApartment.ts`
- Test: `tests/ingestion/addApartment.test.ts`

**Interfaces:**
- Consumes: `createApartment`, `findApartmentBySourceUrl` (`lib/db/apartments.ts`), `normalizeUrl` (Task 2), `recoverSourceUrl` (Task 5), `pickScraper` (Task 8), `downloadAndStoreImages` (Task 9).
- Produces: `addApartmentFromInput(input: AddApartmentInput): Promise<AddApartmentResult>`. Used by Task 12's server action.

```ts
type AddApartmentInput = { url?: string; html?: string; force?: boolean };
type AddApartmentResult =
  | { status: 'duplicate'; existingApartmentId: string }
  | { status: 'created'; apartmentId: string };
```

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/addApartment.test.ts`. Note: the duplicate-detection tests deliberately use an unrecognized `example.com` URL, not a real ImmoScout24/Immowelt one — with no `html` provided and a URL that *did* match a real scraper, the pipeline would attempt a live `fetchHtml()`, which the Global Constraints forbid in tests. Using an unrecognized URL exercises the same normalization/dedup logic without ever reaching that branch.

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/client';

const downloadAndStoreImagesMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/ingestion/downloadAndStoreImages', () => ({
  downloadAndStoreImages: (...args: unknown[]) => downloadAndStoreImagesMock(...args),
}));

import { addApartmentFromInput } from '@/lib/ingestion/addApartment';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
  downloadAndStoreImagesMock.mockClear();
});

describe('addApartmentFromInput', () => {
  it('creates an apartment with source OTHER for an unrecognized URL, scraping nothing', async () => {
    const result = await addApartmentFromInput({ url: 'https://www.example.com/listing/123' });
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    createdIds.push(result.apartmentId);

    const apartment = await prisma.apartment.findUniqueOrThrow({ where: { id: result.apartmentId } });
    expect(apartment.source).toBe('OTHER');
    expect(apartment.sourceUrl).toBe('https://www.example.com/listing/123');
    expect(apartment.title).toBeNull();
    expect(downloadAndStoreImagesMock).not.toHaveBeenCalled();
  });

  it('parses uploaded ImmoScout24 HTML and creates a fully populated apartment', async () => {
    const result = await addApartmentFromInput({ html: immoscout24Html });
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    createdIds.push(result.apartmentId);

    const apartment = await prisma.apartment.findUniqueOrThrow({ where: { id: result.apartmentId } });
    expect(apartment.source).toBe('IMMOSCOUT24');
    expect(apartment.sourceUrl).toBe('https://www.immobilienscout24.de/expose/169009235');
    expect(apartment.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(apartment.price).toBe(229900);
    expect(apartment.rooms).toBe(2);

    expect(downloadAndStoreImagesMock).toHaveBeenCalledTimes(1);
    expect(downloadAndStoreImagesMock.mock.calls[0][0]).toBe(result.apartmentId);
    expect(downloadAndStoreImagesMock.mock.calls[0][1]).toHaveLength(4);
  });

  it('detects a duplicate by normalized source URL and does not create a second apartment', async () => {
    const first = await addApartmentFromInput({ url: 'https://www.example.com/listing/42?ref=abc' });
    if (first.status !== 'created') throw new Error('expected created');
    createdIds.push(first.apartmentId);

    const second = await addApartmentFromInput({ url: 'https://www.example.com/listing/42?ref=xyz' });
    expect(second).toEqual({ status: 'duplicate', existingApartmentId: first.apartmentId });
  });

  it('creates a second apartment anyway when force is true', async () => {
    const first = await addApartmentFromInput({ url: 'https://www.example.com/listing/42' });
    if (first.status !== 'created') throw new Error('expected created');
    createdIds.push(first.apartmentId);

    const second = await addApartmentFromInput({ url: 'https://www.example.com/listing/42', force: true });
    if (second.status !== 'created') throw new Error('expected created');
    createdIds.push(second.apartmentId);

    expect(second.apartmentId).not.toBe(first.apartmentId);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/addApartment.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/addApartment.ts`:

```ts
import { createApartment, findApartmentBySourceUrl } from '@/lib/db/apartments';
import { normalizeUrl } from './normalizeUrl';
import { recoverSourceUrl } from './recoverSourceUrl';
import { pickScraper } from './registry';
import { downloadAndStoreImages } from './downloadAndStoreImages';
import type { ScrapedApartment } from './types';

export type AddApartmentInput = {
  url?: string;
  html?: string;
  force?: boolean;
};

export type AddApartmentResult =
  | { status: 'duplicate'; existingApartmentId: string }
  | { status: 'created'; apartmentId: string };

export async function addApartmentFromInput(input: AddApartmentInput): Promise<AddApartmentResult> {
  const sourceUrl = input.html ? (recoverSourceUrl(input.html) ?? input.url) : input.url;

  if (sourceUrl && !input.force) {
    const existing = await findApartmentBySourceUrl(normalizeUrl(sourceUrl));
    if (existing) {
      return { status: 'duplicate', existingApartmentId: existing.id };
    }
  }

  const scraper = sourceUrl ? pickScraper(sourceUrl) : null;

  let html = input.html;
  if (!html && sourceUrl && scraper) {
    try {
      html = await scraper.fetchHtml(sourceUrl);
    } catch {
      html = undefined; // live fetch blocked/failed — fall back to an empty apartment
    }
  }

  const scraped = html && scraper && sourceUrl ? scraper.parse(html, sourceUrl) : null;

  const apartment = await createApartment({
    source: scraper ? scraper.source : sourceUrl ? 'OTHER' : 'MANUAL',
    sourceUrl: sourceUrl ? normalizeUrl(sourceUrl) : undefined,
    ...(scraped ? scrapedToCreateFields(scraped) : {}),
  });

  if (scraped && scraped.images.length > 0) {
    await downloadAndStoreImages(apartment.id, scraped.images);
  }

  return { status: 'created', apartmentId: apartment.id };
}

function scrapedToCreateFields(scraped: ScrapedApartment): Omit<ScrapedApartment, 'images'> {
  const { images, ...rest } = scraped;
  return rest;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/addApartment.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/addApartment.ts tests/ingestion/addApartment.test.ts
git commit -m "feat: add addApartmentFromInput ingestion pipeline"
```

---

### Task 11: Retry-import pipeline

**Files:**
- Create: `lib/ingestion/retryImport.ts`
- Test: `tests/ingestion/retryImport.test.ts`

**Interfaces:**
- Consumes: `getApartment`, `updateApartment`, `UpdateApartmentInput` (`lib/db/apartments.ts`), `recoverSourceUrl` (Task 5), `pickScraper` (Task 8), `downloadAndStoreImages` (Task 9).
- Produces: `retryImportFromHtml(apartmentId: string, html: string): Promise<void>`. Used by Task 12's server action.

- [ ] **Step 1: Write the failing tests**

Create `tests/ingestion/retryImport.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';

const downloadAndStoreImagesMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/ingestion/downloadAndStoreImages', () => ({
  downloadAndStoreImages: (...args: unknown[]) => downloadAndStoreImagesMock(...args),
}));

import { retryImportFromHtml } from '@/lib/ingestion/retryImport';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
  downloadAndStoreImagesMock.mockClear();
});

describe('retryImportFromHtml', () => {
  it('fills in null fields from the parsed HTML and downloads images', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
    });
    createdIds.push(apartment.id);

    await retryImportFromHtml(apartment.id, immoscout24Html);

    const updated = await prisma.apartment.findUniqueOrThrow({ where: { id: apartment.id } });
    expect(updated.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(updated.price).toBe(229900);
    expect(downloadAndStoreImagesMock).toHaveBeenCalledTimes(1);
    expect(downloadAndStoreImagesMock.mock.calls[0][0]).toBe(apartment.id);
    expect(downloadAndStoreImagesMock.mock.calls[0][1]).toHaveLength(4);
  });

  it('does not overwrite a field the user has already set', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
      title: 'My custom title',
    });
    createdIds.push(apartment.id);

    await retryImportFromHtml(apartment.id, immoscout24Html);

    const updated = await prisma.apartment.findUniqueOrThrow({ where: { id: apartment.id } });
    expect(updated.title).toBe('My custom title');
    expect(updated.price).toBe(229900);
  });

  it('does not download images when the apartment already has some', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
    });
    createdIds.push(apartment.id);
    await prisma.image.create({
      data: { apartmentId: apartment.id, filePath: `${apartment.id}/existing.jpg`, order: 0 },
    });

    await retryImportFromHtml(apartment.id, immoscout24Html);

    expect(downloadAndStoreImagesMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/ingestion/retryImport.test.ts`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement it**

Create `lib/ingestion/retryImport.ts`:

```ts
import { getApartment, updateApartment, type UpdateApartmentInput } from '@/lib/db/apartments';
import { recoverSourceUrl } from './recoverSourceUrl';
import { pickScraper } from './registry';
import { downloadAndStoreImages } from './downloadAndStoreImages';
import type { ScrapedApartment } from './types';

type ApartmentWithRelations = NonNullable<Awaited<ReturnType<typeof getApartment>>>;

export async function retryImportFromHtml(apartmentId: string, html: string): Promise<void> {
  const sourceUrl = recoverSourceUrl(html);
  const scraper = sourceUrl ? pickScraper(sourceUrl) : null;
  if (!scraper || !sourceUrl) return;

  const apartment = await getApartment(apartmentId);
  if (!apartment) return;

  const scraped = scraper.parse(html, sourceUrl);
  const fillable = fillableFieldsFrom(apartment, scraped);
  if (Object.keys(fillable).length > 0) {
    await updateApartment(apartmentId, fillable);
  }
  if (apartment.images.length === 0 && scraped.images.length > 0) {
    await downloadAndStoreImages(apartmentId, scraped.images);
  }
}

function fillableFieldsFrom(apartment: ApartmentWithRelations, scraped: ScrapedApartment): UpdateApartmentInput {
  const result: UpdateApartmentInput = {};
  if (scraped.title !== undefined && apartment.title == null) result.title = scraped.title;
  if (scraped.address !== undefined && apartment.address == null) result.address = scraped.address;
  if (scraped.price !== undefined && apartment.price == null) result.price = scraped.price;
  if (scraped.rooms !== undefined && apartment.rooms == null) result.rooms = scraped.rooms;
  if (scraped.livingArea !== undefined && apartment.livingArea == null) result.livingArea = scraped.livingArea;
  if (scraped.floor !== undefined && apartment.floor == null) result.floor = scraped.floor;
  if (scraped.balcony !== undefined && apartment.balcony == null) result.balcony = scraped.balcony;
  if (scraped.elevator !== undefined && apartment.elevator == null) result.elevator = scraped.elevator;
  if (scraped.kitchen !== undefined && apartment.kitchen == null) result.kitchen = scraped.kitchen;
  if (scraped.condition !== undefined && apartment.condition == null) result.condition = scraped.condition;
  if (scraped.hausgeld !== undefined && apartment.hausgeld == null) result.hausgeld = scraped.hausgeld;
  if (scraped.maklerprovision !== undefined && apartment.maklerprovision == null) {
    result.maklerprovision = scraped.maklerprovision;
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/ingestion/retryImport.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ingestion/retryImport.ts tests/ingestion/retryImport.test.ts
git commit -m "feat: add retryImportFromHtml for backfilling a failed scrape"
```

---

### Task 12: Server actions

**Files:**
- Modify: `app/actions/apartments.ts`

**Interfaces:**
- Consumes: `addApartmentFromInput` (Task 10), `retryImportFromHtml` (Task 11).
- Produces: `addApartmentAction(formData: FormData): Promise<AddApartmentResult>`, `retryImportFromHtmlAction(apartmentId: string, formData: FormData): Promise<void>`. Used by Task 13 and Task 14's client components.

No dedicated automated test — this task is a thin wrapper over already-tested pipeline functions (`addApartmentFromInput`, `retryImportFromHtml`), consistent with this codebase's existing convention of not unit-testing `'use server'` action files directly (see the core-skeleton plan's Task 5, 7, 8). Verified manually in Task 13/14's manual-verification steps.

- [ ] **Step 1: Add the actions**

In `app/actions/apartments.ts`, add these imports alongside the existing ones at the top of the file:

```ts
import { addApartmentFromInput, type AddApartmentResult } from '@/lib/ingestion/addApartment';
import { retryImportFromHtml } from '@/lib/ingestion/retryImport';
```

Append these two functions at the end of the file:

```ts
export async function addApartmentAction(formData: FormData): Promise<AddApartmentResult> {
  const url = formData.get('url')?.toString() || undefined;
  const file = formData.get('file');
  const force = formData.get('force') === 'true';
  const html = file instanceof File ? await file.text() : undefined;

  const result = await addApartmentFromInput({ url, html, force });
  if (result.status === 'created') {
    revalidatePath('/');
  }
  return result;
}

export async function retryImportFromHtmlAction(apartmentId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const html = await file.text();
  await retryImportFromHtml(apartmentId, html);
  revalidatePath(`/apartments/${apartmentId}`);
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: all tests pass (this task adds no new tests of its own).

- [ ] **Step 3: Commit**

```bash
git add app/actions/apartments.ts
git commit -m "feat: wire ingestion pipelines into server actions"
```

---

### Task 13: Add-apartment card UI

**Files:**
- Create: `components/AddApartmentCard.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `addApartmentAction` (Task 12).
- Produces: `<AddApartmentCard />`, replacing the static `+ Add apartment` link.

No automated test — this codebase has no tests for interactive React components (`ApartmentCard`, `DocumentDropzone`, `NotesEditor` are all untested; UI flows are verified manually, per the core-skeleton plan's Definition of Done). Verified in Step 3 below.

- [ ] **Step 1: Create the component**

Create `components/AddApartmentCard.tsx`:

```tsx
'use client';

import { useState, useRef, useTransition, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addApartmentAction } from '@/app/actions/apartments';

const PROGRESS_MESSAGES = ['Fetching listing…', 'Extracting apartment information…', 'Loading images…'];

type CardState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'duplicate'; existingApartmentId: string; pendingFormData: FormData };

export function AddApartmentCard() {
  const router = useRouter();
  const [state, setState] = useState<CardState>({ phase: 'idle' });
  const [progressIndex, setProgressIndex] = useState(0);
  const [urlValue, setUrlValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  function beginSubmit(formData: FormData) {
    setState({ phase: 'submitting' });
    setProgressIndex(0);
    timerRef.current = setInterval(() => {
      setProgressIndex((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
    }, 1000);

    startTransition(async () => {
      const result = await addApartmentAction(formData);
      if (timerRef.current) clearInterval(timerRef.current);

      if (result.status === 'duplicate') {
        setState({ phase: 'duplicate', existingApartmentId: result.existingApartmentId, pendingFormData: formData });
      } else {
        router.push(`/apartments/${result.apartmentId}`);
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!urlValue.trim()) return;
    const formData = new FormData();
    formData.set('url', urlValue.trim());
    beginSubmit(formData);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      const formData = new FormData();
      formData.set('file', file);
      beginSubmit(formData);
      return;
    }

    const droppedUrl = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (droppedUrl.trim()) {
      const formData = new FormData();
      formData.set('url', droppedUrl.trim());
      beginSubmit(formData);
    }
  }

  function handleCreateAnyway() {
    if (state.phase !== 'duplicate') return;
    state.pendingFormData.set('force', 'true');
    beginSubmit(state.pendingFormData);
  }

  const baseClass = 'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed aspect-[4/3] p-4 text-center';

  if (state.phase === 'duplicate') {
    return (
      <div className={`${baseClass} border-gray-300 gap-2`}>
        <p className="font-medium">This listing may already exist.</p>
        <Link href={`/apartments/${state.existingApartmentId}`} className="text-blue-600 text-sm">
          Open existing apartment
        </Link>
        <button type="button" onClick={handleCreateAnyway} className="text-sm text-gray-600 underline">
          Create anyway
        </button>
        <button type="button" onClick={() => setState({ phase: 'idle' })} className="text-sm text-gray-400">
          Cancel
        </button>
      </div>
    );
  }

  if (state.phase === 'submitting') {
    return (
      <div className={`${baseClass} border-gray-300 text-gray-500`}>
        <span className="text-sm">{PROGRESS_MESSAGES[progressIndex]}</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        isDragging
          ? `${baseClass} border-blue-400 bg-blue-50 text-gray-500`
          : `${baseClass} border-gray-300 text-gray-500 hover:border-gray-400`
      }
    >
      <span className="text-3xl">+</span>
      <span className="font-medium">Add apartment</span>
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="text"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="Paste or drop a link"
          className="w-full border rounded px-2 py-1 text-sm text-center"
        />
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Use it on the home page**

In `app/page.tsx`, replace the `Link` import and the static card:

```tsx
import { listApartments } from '@/lib/db/apartments';
import { ApartmentCard } from '@/components/ApartmentCard';
import { AddApartmentCard } from '@/components/AddApartmentCard';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AddApartmentCard />
        {apartments.map((apartment) => (
          <ApartmentCard key={apartment.id} apartment={apartment} />
        ))}
      </div>
    </main>
  );
}
```

(This drops the `Link` import since it's no longer used directly on this page — `AddApartmentCard` uses its own.)

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000`:

1. Paste an unrelated URL (e.g. `https://example.com`) into the add card and submit — confirm it navigates to a new apartment detail page with source shown as unrecognized and all fields empty (live scraping is expected to fail/be skipped for a non-listing URL).
2. Drag the `tests/fixtures/immoscout24.html` file from Finder onto the add card — confirm the progress messages cycle, then it navigates to a new apartment populated with the real title/price/address/rooms and 4 images.
3. Repeat step 2 with the same file again — confirm the card shows "This listing may already exist" with working "Open existing apartment" and "Create anyway" buttons, and that "Create anyway" creates a second apartment.
4. Drag the `tests/fixtures/immowelt.html` file onto the add card — confirm it creates an apartment with 13 images.

- [ ] **Step 4: Commit**

```bash
git add components/AddApartmentCard.tsx app/page.tsx
git commit -m "feat: add the URL/HTML add-apartment card"
```

---

### Task 14: Import-retry dropzone on the detail page

**Files:**
- Create: `components/ImportRetryDropzone.tsx`
- Modify: `app/apartments/[id]/page.tsx`

**Interfaces:**
- Consumes: `retryImportFromHtmlAction` (Task 12).
- Produces: `<ImportRetryDropzone apartmentId={string} />`, shown on the detail page when a URL-sourced apartment has no scraped data yet.

No automated test, consistent with Task 13's rationale.

- [ ] **Step 1: Create the component**

Create `components/ImportRetryDropzone.tsx` (mirrors the existing `DocumentDropzone` pattern):

```tsx
'use client';

import { useState, useTransition, type DragEvent, type ChangeEvent } from 'react';
import { retryImportFromHtmlAction } from '@/app/actions/apartments';

export function ImportRetryDropzone({ apartmentId }: { apartmentId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    startTransition(() => {
      retryImportFromHtmlAction(apartmentId, formData);
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) upload(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        isDragging
          ? 'border-2 border-dashed border-blue-400 bg-blue-50 rounded-md p-4 text-center space-y-2'
          : 'border-2 border-dashed border-amber-300 bg-amber-50 rounded-md p-4 text-center space-y-2'
      }
    >
      <p className="text-sm text-gray-700">
        {isPending ? 'Importing…' : 'Automatic import failed — drop the saved page here to fill in details automatically'}
      </p>
      <input type="file" accept=".html,.htm" onChange={handleChange} />
    </div>
  );
}
```

- [ ] **Step 2: Show it on the detail page when appropriate**

In `app/apartments/[id]/page.tsx`, add the import alongside the existing component imports:

```tsx
import { ImportRetryDropzone } from '@/components/ImportRetryDropzone';
```

Add this section immediately after the opening `<h1>` (before the properties `<form>`):

```tsx
      {apartment.source !== 'MANUAL' && !apartment.title && apartment.images.length === 0 && (
        <ImportRetryDropzone apartmentId={apartment.id} />
      )}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Create an apartment from an unrecognized URL (e.g. `https://example.com`) via the home page's add card — its detail page should show the import-retry dropzone. Drop `tests/fixtures/immoscout24.html` onto it — confirm the page fields populate (title, price, address, rooms, 4 images) after the page revalidates, and that the dropzone disappears once the apartment has a title and images. Then edit the title manually on an apartment that still shows the dropzone, drop the fixture again, and confirm the manually-set title is preserved while other empty fields still fill in.

- [ ] **Step 4: Commit**

```bash
git add components/ImportRetryDropzone.tsx app/apartments/[id]/page.tsx
git commit -m "feat: add import-retry dropzone for apartments with a failed scrape"
```

---

### Task 15: Image carousel on apartment cards

**Files:**
- Create: `components/ImageCarousel.tsx`
- Modify: `components/ApartmentCard.tsx`
- Modify: `lib/db/apartments.ts` (`listApartments`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `<ImageCarousel images={Image[]} alt={string} />`.

Deferred from the core-skeleton plan (Plan 1), which shipped cards with a single image only, noting the carousel "is only meaningfully testable once the scraper is downloading multiple images per apartment" — true as of Task 6/7/9 above. No automated test, consistent with Task 13's rationale (interactive component, verified manually).

- [ ] **Step 1: Stop limiting the home grid to one image per apartment**

In `lib/db/apartments.ts`, in `listApartments()`, change:

```ts
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
```

to:

```ts
    include: { images: { orderBy: { order: 'asc' } } },
```

- [ ] **Step 2: Create the carousel component**

Create `components/ImageCarousel.tsx`:

```tsx
'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import type { Image as ApartmentImage } from '@prisma/client';

export function ImageCarousel({ images, alt }: { images: ApartmentImage[]; alt: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  function goTo(nextIndex: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((nextIndex + images.length) % images.length);
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={`/api/files/${images[index].filePath}`}
        alt={alt}
        width={400}
        height={300}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => goTo(index - 1, event)}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => goTo(index + 1, event)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
```

Clicking an arrow calls `event.preventDefault()` and `event.stopPropagation()` before updating state — required because `ApartmentCard` wraps the whole card in a `<Link>` (per spec §5: "Clicking anywhere on the card, except specific controls, opens the apartment detail page"); without stopping propagation, an arrow click would both cycle the image and navigate away.

- [ ] **Step 3: Use it in ApartmentCard**

In `components/ApartmentCard.tsx`, replace the `Image`/placeholder import and JSX:

```tsx
import Link from 'next/link';
import type { Apartment, Image as ApartmentImage } from '@prisma/client';
import { formatPrice, formatAreaAndRooms, STATUS_LABELS } from '@/lib/apartments/format';
import { ImageCarousel } from '@/components/ImageCarousel';

type ApartmentCardProps = {
  apartment: Apartment & { images: ApartmentImage[] };
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const price = formatPrice(apartment.price);
  const areaAndRooms = formatAreaAndRooms(apartment.livingArea, apartment.rooms);

  return (
    <Link
      href={`/apartments/${apartment.id}`}
      className="block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100">
        <ImageCarousel images={apartment.images} alt={apartment.title ?? 'Apartment'} />
      </div>
      <div className="p-3 space-y-1">
        <div className="font-medium">{apartment.address ?? apartment.title ?? 'Untitled apartment'}</div>
        {price && <div>{price}</div>}
        {areaAndRooms && <div className="text-sm text-gray-500">{areaAndRooms}</div>}
        <div className="text-sm">{STATUS_LABELS[apartment.status]}</div>
      </div>
    </Link>
  );
}
```

(Drops the direct `next/image` import from this file — `ImageCarousel` now owns image rendering.)

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass (this task changes no tested behavior — `listApartments`'s repository test doesn't assert on image count).

- [ ] **Step 5: Manual verification**

Run `npm run dev`. On the home page, find the apartment created earlier from the Immowelt fixture (13 images) — confirm left/right arrows appear on its card, cycle through images, and clicking an arrow does not navigate to the detail page while clicking elsewhere on the card does. Confirm a single-image or no-image apartment's card shows no arrows and still navigates correctly.

- [ ] **Step 6: Commit**

```bash
git add lib/db/apartments.ts components/ImageCarousel.tsx components/ApartmentCard.tsx
git commit -m "feat: add image carousel to apartment cards"
```

---

## Definition of done for this plan

- `npm test` passes, including the new `tests/ingestion/` suite, with no test depending on live network access to immobilienscout24.de or immowelt.de.
- On `npm run dev`: pasting an unrecognized URL still creates an apartment with empty fields (graceful fallback); dropping either of `tests/fixtures/immoscout24.html` / `tests/fixtures/immowelt.html` onto the add card creates a fully populated apartment with real images; re-dropping the same fixture triggers the duplicate-detection flow with working "Open existing" / "Create anyway"; an apartment with a failed scrape shows the import-retry dropzone on its detail page, which backfills fields without overwriting manual edits; apartment cards with multiple images show a working, non-navigating left/right carousel.
- No scope from `docs/superpowers/plans/2026-09-06-core-skeleton.md` (table view, filtering, sorting, search) is touched — that remains Plan 3.
