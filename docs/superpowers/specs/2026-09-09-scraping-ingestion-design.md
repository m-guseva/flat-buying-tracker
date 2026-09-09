# Scraping / Ingestion Layer — Technical Design (Plan 2)

This is the technical design for Plan 2 of the MVP roadmap set out in
`docs/superpowers/plans/2026-09-06-core-skeleton.md`: the ingestion layer,
ImmoScout24/Immowelt scrapers, duplicate detection, and the URL-based add
flow. It supersedes §5 ("Ingestion & error handling") of
`2026-09-06-flat-buying-tracker-design.md` with findings from testing
against real listing pages; everything else in that doc (stack, data model
shape, module boundary diagram) still holds.

## 1. Why this design differs from the original

The original design doc assumed a plain server-side `fetch()` +
`cheerio`-parsing scraper, falling back to manual entry only when a site
"may block automated requests." In practice, tested directly against a
real ImmoScout24 and a real Immowelt listing URL:

- Immowelt returns a DataDome JS-challenge page (HTTP 403) to a bare fetch.
- ImmoScout24 returns an AWS WAF "Ich bin kein Roboter" challenge page
  (HTTP 401).

Neither is a header/User-Agent tuning problem — both require solving a JS
challenge, which is out of scope (no headless browser, no anti-bot
investment, per the original design doc). So a live `fetch()` from the
add-apartment flow will succeed only inconsistently, and the manual-entry
fallback — originally scoped as an edge case — is the realistic common
case for pasted URLs.

What changes the picture: the user can save a listing page from their own
browser (already logged into nothing special — just "Save Page As" past
the challenge, since it's a real browser session) and hand that HTML to
the app directly. Two real saved pages were used to reverse-engineer both
sites' markup (see §6) and confirm this path works reliably. The add flow
is therefore built around **two ways to get listing HTML**, sharing one
parsing/creation pipeline (§3).

## 2. Scraper interface

Splits fetching (unreliable, network-dependent) from parsing (pure,
fixture-testable) — the original design doc's single `scrape(url)` method
conflated the two, which made the parser untestable without a live network
call.

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
  images: string[]; // absolute CDN URLs, to be downloaded server-side
}

export interface Scraper {
  source: 'IMMOSCOUT24' | 'IMMOWELT';
  canHandle(url: string): boolean;
  fetchHtml(url: string): Promise<string>; // throws on block/network failure
  parse(html: string, sourceUrl: string): ScrapedApartment;
}
```

`lib/ingestion/registry.ts` holds both scrapers; `pickScraper(url)` returns
the first match or `null` (unrecognized URL → `source: 'OTHER'`, per §5).

Module layout:

```
lib/ingestion/
  types.ts        — ScrapedApartment, Scraper
  registry.ts      — pickScraper(url), detectSourceFromHtml(html)
  normalizeUrl.ts  — strips query/tracking params + trailing slash
  immoscout24.ts   — Scraper impl
  immowelt.ts      — Scraper impl
  createFromHtml.ts — shared pipeline described in §3
```

## 3. Add-apartment flow

The "+ Add apartment" card is one drop target / paste target accepting
either a **URL** (pasted text or a dragged link) or a **saved `.html`
file** (dragged/dropped from the user's browser export). A file drop is
distinguished from a text/URL drop via `dataTransfer.files` vs
`dataTransfer.getData('text/plain')` in the drop handler.

```
                     ┌─ URL text ──────► fetchHtml(url) ─┐
add-apartment input ─┤                                    ├─► html: string | null
                     └─ .html file ────► file.text() ─────┘
                              │
                              ▼
                    source URL: pasted URL, or recovered
                    from the file's <link rel="canonical">
                    (verified present on both real fixtures)
                              │
                              ▼
                    normalizeUrl() + duplicate check
                    (dup found, no force) ──► inline duplicate state
                              │ (no dup, or force=true)
                              ▼
                    html available?
                      yes → scraper.parse(html, sourceUrl)
                             → download images (§4) → create apartment
                      no  → create apartment with just
                             sourceUrl + detected/OTHER source,
                             all other fields null
                              │
                              ▼
                    redirect to /apartments/:id
```

One server action (`addApartmentAction(formData)`) implements this whole
decision tree; `formData` carries `url` and/or `file`, plus a `force` flag
set when the user clicks "Create anyway" on a duplicate. This keeps
duplicate detection, image download, and apartment creation as one shared
path regardless of which of the two HTML sources was used — matching the
original design doc's intent that scraping source is an implementation
detail behind one normalized `Apartment` shape.

Source detection when only an HTML file is given (no separately pasted
URL): try `<link rel="canonical">`, falling back to matching known site
domain strings in the HTML if canonical is missing. Both real fixtures
have canonical link tags with the correct listing URL, so this is expected
to be the common case, not a fallback edge case.

**Progress feedback:** a single server action call does the whole job (no
streaming). The client cycles through "Fetching listing… / Extracting
apartment information… / Loading images…" on a fixed timer purely as a
spinner substitute, matching the spec's mockup without building
progress-streaming infrastructure.

**Duplicate detection UI:** on a duplicate, the add card's content swaps
in place (no modal) to "This listing may already exist" with `Open
existing apartment` (navigates to it) and `Create anyway` (resubmits the
same form with `force=true`).

**Failed live fetch:** when a pasted URL's `fetchHtml()` throws, the
apartment is still created immediately per spec §3 (URL + source, empty
fields) — the flow does not block on retry. Its detail page shows a
dropzone, reusing the `DocumentDropzone` component pattern from Plan 1:
"Automatic import failed — drop the saved page here to fill in details
automatically." Dropping a file there calls
`retryImportFromHtmlAction(apartmentId, formData)`, which parses the
uploaded HTML and fills in currently-null scalar fields only — it never
overwrites a field the user has already edited (satisfies spec §4's "don't
overwrite manual edits" rule using the simplest correct policy: null
fields are untouched data, non-null fields are either scraped-and-kept or
user-edited, either way left alone). Images are handled the same way at
the relation level: if the apartment currently has zero `Image` rows (the
normal case after a failed fetch), the newly parsed images are downloaded
and added; if it already has images, none are added or replaced.

## 4. Image handling

Both sites' image CDNs are open (verified via direct `curl`, no bot
challenge): `pictures.immobilienscout24.de` (CloudFront) and
`mms.immowelt.de` (Akamai/cloudimg). This holds regardless of whether the
HTML came from a live fetch or an uploaded saved file — a saved file's
`<img src>` attributes point to local relative paths from the browser's
save process, but full absolute CDN URLs remain recoverable elsewhere in
the page (carousel component props, etc.), so the same extraction
approach works for both HTML sources.

`parse()` is responsible for producing `images: string[]` as absolute CDN
URLs, scoped to the real listing gallery container so unrelated images
never leak in — both sites render "other listings" thumbnails
(recommendations, or the agent's other listings) elsewhere on the same
page with URLs from the same CDN, so scoping by container, not by domain,
is required.

Within that scoped container, each `<img>`'s `src` is either already an
absolute CDN URL (the expected shape for a live fetch) or a local relative
path rewritten by the browser's save process (the saved-file case, e.g.
`..._files/13922db7-711e-...-2052742405_yatW.jpg`). For the latter, the
image's UUID is still present in the local filename; a shared helper
(`lib/ingestion/extractGalleryImages.ts`) recovers the real absolute URL
by regex-searching the full raw HTML text for that UUID appearing inside
an absolute URL on the site's known CDN host, since the two sites differ
in whether that reconstruction can be done from the UUID alone: IS24's
CDN path is deterministic from the UUID (multiple resize variants exist
per image; the helper prefers one matching `1106x830` for a full-size
image), while Immowelt's `mms.immowelt.de` URLs carry a `ci_seal` signed
query parameter that cannot be reconstructed and must be recovered
verbatim from the page (confirmed 1:1 — every image UUID matched exactly
one signed URL on the sample listing).

- ImmoScout24: images within `#is24-gallery-entry-point` only (excludes
  `#similarObjects`, the agent's-other-listings section).
- Immowelt: images within `[data-testid="cdp-medias-overview"]` only
  (excludes `[data-testid="cdp-similar-listings-carousel"]`).

After `parse()` returns, the ingestion pipeline downloads each URL
server-side (plain fetch — confirmed unblocked) and stores it via the
existing `fileStorage` interface, creating `Image` rows in listing order.

**Known limitation:** ImmoScout24's server-rendered/fetched markup only
ever contains the initial preview grid (~4 images) for a listing; the rest
of the gallery loads via a JS-driven modal that issues its own API call
this scraper doesn't drive. This is a real, permanent limitation of the
fetch/parse approach (not something a better selector fixes) and should be
visible to the user as "some images could not be extracted," not treated
as a bug. Immowelt's carousel, by contrast, renders all gallery images
directly in the DOM/HTML (confirmed 13/13 on the test fixture) — full
gallery extraction works there.

## 5. Data model

`lib/db/apartments.ts`'s `source` union (currently `'IMMOSCOUT24' |
'IMMOWELT' | 'MANUAL'`) gains `'OTHER'`: a pasted URL matching neither
scraper still creates an apartment (URL + source only, no scraping
attempted), per spec §3's requirement that scraping/detection failure
never blocks apartment creation.

## 6. Site-specific extraction notes

Derived from two real listing pages (saved via browser, `<link
rel="canonical">` recovered the original URLs — an ImmoScout24 2-room
Berlin-Alt-Treptow listing and an Immowelt Berlin-Mitte listing). These are
the concrete selectors Task-level implementation should start from; they
are real but from a sample of one listing per site, so fields absent on
these two examples (e.g. IS24 "Zustand"/condition, IS24 fitted-kitchen
indicator) are implemented by naming convention from the sites' other
`is24qa-*` indicator fields and left gracefully null if not found on a
given listing — consistent with "do not assume every field will be
available" (spec §4).

**ImmoScout24** — stable `is24qa-*` CSS classes (the site's own QA test
hooks) and one JSON-LD block:

| Field | Source |
|---|---|
| title, address, price | `<script type="application/ld+json">` → `RealEstateListing.name` / `.address` / `.offers.price` |
| rooms | `.is24qa-zimmer` text |
| living area | `.is24qa-wohnflaeche-ca` text (German decimal comma) |
| floor | `.is24qa-etage` text (e.g. "1 von 4") |
| hausgeld | `.is24qa-hausgeld` text |
| maklerprovision | `.is24qa-provision` text (free text, e.g. "Nein" or a %) |
| balcony | presence of `[data-qa="is24qa-balcony-label"]` |
| elevator | presence of `[data-qa="is24qa-lift-label"]` |
| condition | `.is24qa-zustand` (naming-convention guess, unverified — not present on the sample listing) |
| kitchen | `[data-qa="is24qa-builtinkitchen-label"]` presence (naming-convention guess, unverified — not present on the sample listing) |
| images | `img` within `#is24-gallery-entry-point`, ~4 max (§4) |

**Immowelt** — Emotion CSS-in-JS means `css-xxxxxx` classnames are
build-generated and not stable across deploys; extraction relies on
`data-testid` container scoping plus text-content keyword matching instead
of those classnames:

| Field | Source |
|---|---|
| title | ld+json `name` — often an auto-generated summary string, not a human-written title, on listings without a custom headline (confirmed on the sample) |
| address | `[data-testid="cdp-location-address"]` text — **district + postal code only**, no street address in the static page (appears intentionally withheld pre-contact); user fills in the street manually |
| price, hausgeld, maklerprovision | `[data-testid="cdp-price"]` — Emotion classnames make row-structure matching brittle, so match on the container's full text instead: regex `Kaufpreis\s+(\d+)\s*€` for price, `Hausgeld\s+(\d+)\s*€` for hausgeld. The same text also repeats "Provision für Käufer" inside a later cost-breakdown section with a different format — take only the text before "Geschätzte Gesamtkosten" when matching `Provision für Käufer\s+([\d,]+\s*%[^\n]*)` for maklerprovision, confirmed present on the sample listing ("3,57 % inkl. MwSt.") |
| rooms, living area, floor | `[data-testid="cdp-hardfacts-keyfacts"]` — three sibling `<span>`s (e.g. "2 Zimmer", "•46,3 m²", "•3. Geschoss" — note the leading bullet on the 2nd/3rd), parsed by pattern: `(\d+)\s*Zimmer`, `([\d,]+)\s*m²`, and the floor span's text with the leading "•" stripped |
| balcony, elevator, kitchen, condition | `[data-testid="cdp-features"]` — a plain `<li>` list with no per-feature hook; match each item's text against known German keywords (Balkon → balcony, Personenaufzug/Aufzug/Fahrstuhl → elevator, Einbauküche → kitchen; no condition-indicating keyword found on the sample listing, left null) |
| images | `img` within `[data-testid="cdp-medias-overview"]`, full gallery (§4) |

## 7. Testing

- The two saved HTML pages become fixtures: `tests/fixtures/immoscout24.html`,
  `tests/fixtures/immowelt.html` (real listing pages, ~1–3.6MB — committed
  as personal-tool test data, not sensitive).
- `parse()` is unit tested directly against these fixtures — no live
  network calls, matching the original design doc's testing philosophy.
- `normalizeUrl()` and duplicate-matching are unit tested independently of
  any HTML.
- `fetchHtml()` and the CDN image download step are not covered by
  automated tests (network-dependent, best-effort by design) — verified
  manually per the plan's task-level manual-verification steps.
- No test asserts on live ImmoScout24/Immowelt reachability; a passing
  test suite must not depend on either site being unblocked.

## 8. Out of scope (unchanged from the original design doc)

Headless browsers, proxies, or any other anti-bot investment. Automatic
retry/backoff on blocked fetches. Detecting duplicates by address instead
of URL. Multi-image reordering UI (images are stored/shown in the order
the scraper returned them).
