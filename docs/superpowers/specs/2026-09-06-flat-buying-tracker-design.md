# Flat Buying Tracker — Technical Design

This is the technical/architecture companion to `specs.md` (the product spec).
It covers stack, module boundaries, data model, and the decisions needed to
build the MVP described there. It does not repeat product/UI behavior already
specified in `specs.md`.

## 1. Context and constraints

- Single user, running on their own laptop for the MVP.
- Future possibility (not MVP): another person accesses the app remotely.
  The architecture should not require a rewrite to get there — but nothing
  multi-user (auth, accounts, per-user data) is built now.
- Scraping ImmoScout24/Immowelt is best-effort. These sites may block
  automated requests; when that happens the app falls back to manual entry,
  which the product spec already requires as a first-class path. No
  investment in anti-bot workarounds (headless browsers, proxies) for MVP.

## 2. Stack

- **Next.js (App Router, TypeScript)** — one codebase, UI + server in one
  process, runs locally via `npm run dev`.
- **SQLite via Prisma** — zero-setup local database file
  (`./data/app.db`). Prisma abstracts the database engine: moving to Postgres
  later (needed once there's a second concurrent user / remote deployment)
  is a config + migration change, not a rewrite.
- **Local filesystem storage** for documents and images
  (`./data/files/<apartmentId>/...`), behind a small storage interface so it
  can be swapped for S3-compatible storage later without touching callers.

## 3. Architecture / module boundaries

```
Browser (React UI)
      │
      ▼
Next.js Server (API routes / Server Actions)
      │
      ├── Ingestion layer  → normalizes any source into one Apartment shape
      │     ├── ImmoScout24 scraper
      │     ├── Immowelt scraper
      │     └── Manual entry (no URL)
      │
      ├── Data access layer (Prisma)
      │     └── SQLite file on disk (./data/app.db)
      │
      └── File storage layer (local filesystem)
```

The UI never talks to a scraper directly — everything goes through one
ingestion layer that returns a normalized `Apartment` object regardless of
source. Adding ImmoScout's official API, Immowelt's API, or email ingestion
later means adding one new module behind this same interface.

```ts
interface ScrapedApartment {
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
  images: string[]; // remote URLs, to be downloaded
}

interface Scraper {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedApartment>;
}
```

A registry holds all scrapers; the first one whose `canHandle(url)` returns
true is used. Manual entry is always available regardless of URL.

File storage interface:

```ts
interface FileStorage {
  save(apartmentId: string, file: Buffer, filename: string): Promise<string>; // returns reference
  read(reference: string): Promise<Readable>;
  delete(reference: string): Promise<void>;
}
```

## 4. Data model

Fixes one gap in `specs.md`: §4 (scraping) asks for `Maklerprovision`, but
the data model in §21 omits it. Added below.

```prisma
model Apartment {
  id                 String   @id @default(cuid())
  title              String?
  source             Source
  sourceUrl          String?
  address            String?
  price              Float?
  livingArea         Float?
  rooms              Float?
  floor              String?
  balcony            Boolean?
  elevator           Boolean?
  kitchen            String?
  condition          String?
  hausgeld           Float?
  maklerprovision    String?
  locationRating     Int?
  personalRating     Int?
  status             Status   @default(NOT_CONTACTED)
  maklervertragStatus MaklervertragStatus @default(NOT_RECEIVED)
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  images             Image[]
  documents          Document[]
  statusHistory      StatusHistory[]
}

model Image {
  id          String    @id @default(cuid())
  apartmentId String
  apartment   Apartment @relation(fields: [apartmentId], references: [id])
  filePath    String
  order       Int
  createdAt   DateTime  @default(now())
}

model Document {
  id          String    @id @default(cuid())
  apartmentId String
  apartment   Apartment @relation(fields: [apartmentId], references: [id])
  filename    String
  fileType    String
  filePath    String
  createdAt   DateTime  @default(now())
  metadata    String?
}

model StatusHistory {
  id          String    @id @default(cuid())
  apartmentId String
  apartment   Apartment @relation(fields: [apartmentId], references: [id])
  status      Status
  timestamp   DateTime  @default(now())
}

enum Source {
  IMMOSCOUT24
  IMMOWELT
  MANUAL
}

enum Status {
  NOT_CONTACTED
  CONTACTED
  RECEIVED_EXPOSE
  SETUP_VIEWING
  POST_VIEWING
  INTEREST_FOR_PURCHASE
}

enum MaklervertragStatus {
  NOT_RECEIVED
  RECEIVED
  SIGNED
  WIDERRUF
}
```

Ratings (`locationRating`, `personalRating`) are 1–5 integers.

Table column selection (spec §15) persists via browser `localStorage`, not a
DB table — it's a per-browser UI preference, not shared data, and there's
one user.

## 5. Ingestion & error handling

- Scraping uses server-side fetch + `cheerio` HTML parsing (no headless
  browser for MVP).
- Total scraper failure (network error, blocked request, unrecognized page
  structure): still create the `Apartment` from URL + source only, all other
  fields null, and surface "some information could not be extracted" per
  spec §3.
- Partial extraction (some fields found, others not) is the normal case, not
  an error — missing fields are just left null, no message shown.
- Scraped images are downloaded server-side and saved via the file storage
  interface — not hotlinked — so a listing going offline later doesn't break
  the apartment's images.
- Duplicate detection normalizes the URL (strip query/tracking params,
  trailing slash) before comparing against existing `sourceUrl` values.

## 6. Testing

Proportionate to a personal tool:

- Scraper parsing tested against saved HTML fixtures (not live network
  calls), so tests don't depend on the real sites being reachable/unblocked.
- Duplicate/URL-normalization logic unit tested.
- Data access layer (Prisma models/CRUD) unit/integration tested.
- No full UI e2e suite for MVP; UI flows verified manually.

## 7. Future-proofing notes (not built now)

- Multi-user/remote: Prisma's engine portability (SQLite → Postgres) plus
  the storage interface (local disk → S3-compatible) are the two seams that
  make this possible later without a rewrite. Auth and per-user data
  scoping are explicitly out of scope for MVP (per `specs.md` §23).
- Additional ingestion sources (ImmoScout API, Immowelt API, email) plug into
  the existing `Scraper`-like interface in the ingestion layer.
