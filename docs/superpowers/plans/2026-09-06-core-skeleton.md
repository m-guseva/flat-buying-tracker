# Flat Buying Tracker — Core Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working local app where apartments can be added manually, browsed as cards, edited on a detail page (properties, status, Maklervertrag), given documents and notes — the full data model and file storage, without scraping yet.

**Architecture:** Single Next.js (App Router, TypeScript) app. SQLite via Prisma for data. Local filesystem for documents/images behind a small storage interface. Server Actions for all mutations; a single `/api/files/[...path]` route streams stored files back to the browser.

**Tech Stack:** Next.js 14.2.5 (App Router), TypeScript, Prisma + SQLite, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-06-flat-buying-tracker-design.md` (technical design), `specs.md` (product spec).

This is plan 1 of 3 for the MVP described in the specs above:

- **Plan 1 (this one):** data model, file storage, manual apartment creation, card view, detail page, documents, notes.
- **Plan 2:** ingestion layer, duplicate detection, ImmoScout24/Immowelt scrapers, URL-based add flow.
- **Plan 3:** table view, column selection, filtering, sorting, search.

Each plan is independently runnable/testable software.

Note on scope: this plan's cards show a single image (or a placeholder). The
left/right carousel navigation from spec §5 is deferred to Plan 2, since it's
only meaningfully testable once the scraper is downloading multiple images
per apartment — manual entry alone rarely produces more than one.

## Global Constraints

- TypeScript strict mode (default for `create-next-app --typescript`).
- Next.js version pinned to 14.2.5 — its App Router uses synchronous `params`, unlike 15+. Do not upgrade mid-plan.
- All currency/date display uses German locale formatting (`toLocaleString('de-DE')`).
- Documents and images are stored on disk under `./data/files/<apartmentId>/...`, never inline in the database (per spec §21 / design doc §4).
- `./data/` (the SQLite file and stored files) and `.env` are git-ignored — this is personal apartment-search data, not code.

---

### Task 1: Project scaffolding

**Files:**
- Create: whole Next.js project structure (via `create-next-app`)
- Create: `prisma/schema.prisma` (empty datasource only, filled in Task 2)
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Produces: a running `npm run dev` app, a working `npm test`, a Prisma client wired to a SQLite file at `./data/app.db`.

- [ ] **Step 1: Scaffold the Next.js app**

Run in the project root (already a git repo):

```bash
npx create-next-app@14.2.5 . --typescript --eslint --app --tailwind --src-dir=false --import-alias "@/*" --use-npm
```

When prompted about the current directory not being empty, confirm yes (it contains `specs.md` and `docs/`, which is fine).

- [ ] **Step 2: Verify the dev server runs**

Run: `npm run dev`
Expected: server starts on port 3000, `http://localhost:3000` shows the default Next.js starter page. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 3: Install and initialize Prisma with SQLite**

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

Edit the generated `.env` so the database lives at the project root's `data/` folder, not inside `prisma/`:

```
DATABASE_URL="file:../data/app.db"
```

- [ ] **Step 4: Generate the client and create the (currently empty) database**

```bash
npx prisma generate
npx prisma db push
```

Expected: `data/app.db` is created at the project root.

- [ ] **Step 5: Git-ignore local data and env**

Add to `.gitignore` (append, don't remove existing entries from the scaffold):

```
/data
.env
```

- [ ] **Step 6: Install Vitest and write a DB smoke test**

```bash
npm install -D vitest
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('database connectivity', () => {
  it('connects to the SQLite database', async () => {
    const prisma = new PrismaClient();
    const result = await prisma.$queryRawUnsafe<{ result: number }[]>('SELECT 1 as result');
    expect(result[0].result).toBe(1);
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 7: Run the test suite**

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Prisma/SQLite and Vitest"
```

---

### Task 2: Data model and apartment repository

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/db/client.ts`
- Create: `lib/db/apartments.ts`
- Test: `tests/db/apartments.test.ts`

**Interfaces:**
- Consumes: Prisma client set up in Task 1.
- Produces: `createApartment(input: CreateApartmentInput): Promise<Apartment>`, `getApartment(id: string)`, `listApartments()`, `updateApartment(id, data)`, `updateApartmentStatus(id, status: Status)`, `deleteApartment(id)`, `findApartmentBySourceUrl(sourceUrl: string)` — all later tasks read/write apartments only through these.

- [ ] **Step 1: Write the full Prisma schema**

Replace the contents of `prisma/schema.prisma` (keep the existing `generator` and `datasource` blocks from Task 1, add the models/enums below):

```prisma
model Apartment {
  id                  String   @id @default(cuid())
  title               String?
  source              Source
  sourceUrl           String?
  address             String?
  price               Float?
  livingArea          Float?
  rooms               Float?
  floor               String?
  balcony             Boolean?
  elevator            Boolean?
  kitchen             String?
  condition           String?
  hausgeld            Float?
  maklerprovision     String?
  locationRating      Int?
  personalRating      Int?
  status              Status   @default(NOT_CONTACTED)
  maklervertragStatus MaklervertragStatus @default(NOT_RECEIVED)
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  images        Image[]
  documents     Document[]
  statusHistory StatusHistory[]
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

- [ ] **Step 2: Apply the migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/migrations/`, applies to `data/app.db`, regenerates the client.

- [ ] **Step 3: Create the Prisma client singleton**

Create `lib/db/client.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Write the failing repository tests**

Create `tests/db/apartments.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import {
  createApartment,
  getApartment,
  listApartments,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
  findApartmentBySourceUrl,
} from '@/lib/db/apartments';

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

describe('apartment repository', () => {
  it('creates an apartment with an initial status history entry', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Test flat' });
    createdIds.push(apartment.id);

    expect(apartment.status).toBe('NOT_CONTACTED');

    const fetched = await getApartment(apartment.id);
    expect(fetched?.statusHistory).toHaveLength(1);
    expect(fetched?.statusHistory[0].status).toBe('NOT_CONTACTED');
  });

  it('lists apartments newest first', async () => {
    const first = await createApartment({ source: 'MANUAL', title: 'First' });
    const second = await createApartment({ source: 'MANUAL', title: 'Second' });
    createdIds.push(first.id, second.id);

    const list = await listApartments();
    const ids = list.map((a) => a.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it('updates fields without touching status history', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Original' });
    createdIds.push(apartment.id);

    await updateApartment(apartment.id, { title: 'Updated', price: 425000 });

    const fetched = await getApartment(apartment.id);
    expect(fetched?.title).toBe('Updated');
    expect(fetched?.price).toBe(425000);
    expect(fetched?.statusHistory).toHaveLength(1);
  });

  it('records a status history entry on status change', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Status test' });
    createdIds.push(apartment.id);

    await updateApartmentStatus(apartment.id, 'CONTACTED');

    const fetched = await getApartment(apartment.id);
    expect(fetched?.status).toBe('CONTACTED');
    expect(fetched?.statusHistory).toHaveLength(2);
    expect(fetched?.statusHistory[0].status).toBe('CONTACTED');
  });

  it('finds an apartment by source URL', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/123',
    });
    createdIds.push(apartment.id);

    const found = await findApartmentBySourceUrl('https://www.immobilienscout24.de/expose/123');
    expect(found?.id).toBe(apartment.id);
  });

  it('deletes an apartment', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'To delete' });

    await deleteApartment(apartment.id);

    const fetched = await getApartment(apartment.id);
    expect(fetched).toBeNull();
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/db/apartments` does not exist yet.

- [ ] **Step 6: Implement the repository**

Create `lib/db/apartments.ts`:

```ts
import { prisma } from './client';
import type { Apartment, Status, MaklervertragStatus } from '@prisma/client';

export type CreateApartmentInput = {
  title?: string;
  source: 'IMMOSCOUT24' | 'IMMOWELT' | 'MANUAL';
  sourceUrl?: string;
  address?: string;
  price?: number;
  livingArea?: number;
  rooms?: number;
  floor?: string;
  balcony?: boolean;
  elevator?: boolean;
  kitchen?: string;
  condition?: string;
  hausgeld?: number;
  maklerprovision?: string;
};

export type UpdateApartmentInput = Partial<CreateApartmentInput> & {
  locationRating?: number;
  personalRating?: number;
  maklervertragStatus?: MaklervertragStatus;
  notes?: string;
};

export async function createApartment(input: CreateApartmentInput): Promise<Apartment> {
  return prisma.apartment.create({
    data: {
      ...input,
      statusHistory: {
        create: { status: 'NOT_CONTACTED' },
      },
    },
  });
}

export async function getApartment(id: string) {
  return prisma.apartment.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { timestamp: 'desc' } },
    },
  });
}

export async function listApartments() {
  return prisma.apartment.findMany({
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateApartment(id: string, data: UpdateApartmentInput) {
  return prisma.apartment.update({ where: { id }, data });
}

export async function updateApartmentStatus(id: string, status: Status) {
  const [apartment] = await prisma.$transaction([
    prisma.apartment.update({ where: { id }, data: { status } }),
    prisma.statusHistory.create({ data: { apartmentId: id, status } }),
  ]);
  return apartment;
}

export async function deleteApartment(id: string) {
  return prisma.apartment.delete({ where: { id } });
}

export async function findApartmentBySourceUrl(sourceUrl: string) {
  return prisma.apartment.findFirst({ where: { sourceUrl } });
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass (smoke test + 6 repository tests).

- [ ] **Step 8: Commit**

```bash
git add prisma lib/db tests/db
git commit -m "feat: add apartment data model and repository"
```

---

### Task 3: File storage layer

**Files:**
- Create: `lib/storage/fileStorage.ts`
- Test: `tests/storage/fileStorage.test.ts`

**Interfaces:**
- Produces: `FileStorage` interface (`save`, `read`, `delete`) and a `fileStorage` singleton implementing it against `./data/files/`. Documents and images repositories (Task 4) and the file-serving API route (Task 6) depend on this.

- [ ] **Step 1: Write the failing tests**

Create `tests/storage/fileStorage.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import path from 'path';
import { LocalFileStorage } from '@/lib/storage/fileStorage';

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk as Buffer));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const storage = new LocalFileStorage();
const apartmentId = 'test-apartment-id';

afterEach(async () => {
  await rm(path.join(process.cwd(), 'data', 'files', apartmentId), { recursive: true, force: true });
});

describe('LocalFileStorage', () => {
  it('saves and reads back a file', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('hello world'), 'test.txt');

    const stream = await storage.read(reference);
    const buffer = await streamToBuffer(stream);

    expect(buffer.toString()).toBe('hello world');
  });

  it('sanitizes unsafe filenames', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('data'), '../../etc/passwd');

    expect(reference).not.toContain('..');
  });

  it('deletes a saved file', async () => {
    const reference = await storage.save(apartmentId, Buffer.from('to delete'), 'delete-me.txt');

    await storage.delete(reference);

    await expect(storage.read(reference)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/storage/fileStorage` does not exist yet.

- [ ] **Step 3: Implement the storage layer**

Create `lib/storage/fileStorage.ts`:

```ts
import { mkdir, writeFile, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import type { Readable } from 'stream';

const STORAGE_ROOT = path.join(process.cwd(), 'data', 'files');

export interface FileStorage {
  save(apartmentId: string, buffer: Buffer, filename: string): Promise<string>;
  read(reference: string): Promise<Readable>;
  delete(reference: string): Promise<void>;
}

function safeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export class LocalFileStorage implements FileStorage {
  async save(apartmentId: string, buffer: Buffer, filename: string): Promise<string> {
    const dir = path.join(STORAGE_ROOT, apartmentId);
    await mkdir(dir, { recursive: true });
    const unique = `${Date.now()}-${safeFilename(filename)}`;
    await writeFile(path.join(dir, unique), buffer);
    return path.join(apartmentId, unique);
  }

  async read(reference: string): Promise<Readable> {
    return createReadStream(path.join(STORAGE_ROOT, reference));
  }

  async delete(reference: string): Promise<void> {
    await unlink(path.join(STORAGE_ROOT, reference));
  }
}

export const fileStorage: FileStorage = new LocalFileStorage();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/storage tests/storage
git commit -m "feat: add local file storage layer"
```

---

### Task 4: Documents and images repositories

**Files:**
- Create: `lib/db/documents.ts`
- Create: `lib/db/images.ts`
- Test: `tests/db/documents.test.ts`
- Test: `tests/db/images.test.ts`

**Interfaces:**
- Consumes: `createApartment`/`deleteApartment` (Task 2), `fileStorage` (Task 3).
- Produces: `createDocument(apartmentId, buffer, filename, fileType)`, `deleteDocument(id)`; `createImage(apartmentId, buffer, filename, order)`. Task 6 (cards) and Task 9 (documents UI) depend on these.

- [ ] **Step 1: Write the failing tests**

Create `tests/db/documents.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { createDocument, deleteDocument } from '@/lib/db/documents';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  createdApartmentIds.length = 0;
});

describe('document repository', () => {
  it('creates a document and stores its file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Doc test' });
    createdApartmentIds.push(apartment.id);

    const document = await createDocument(apartment.id, Buffer.from('pdf bytes'), 'expose.pdf', 'application/pdf');

    expect(document.filename).toBe('expose.pdf');
    expect(document.filePath).toContain(apartment.id);
  });

  it('deletes a document and its stored file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Doc delete test' });
    createdApartmentIds.push(apartment.id);
    const document = await createDocument(apartment.id, Buffer.from('pdf bytes'), 'expose.pdf', 'application/pdf');

    await deleteDocument(document.id);

    const found = await prisma.document.findUnique({ where: { id: document.id } });
    expect(found).toBeNull();
  });
});
```

Create `tests/db/images.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { createImage } from '@/lib/db/images';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  createdApartmentIds.length = 0;
});

describe('image repository', () => {
  it('creates an image and stores its file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Image test' });
    createdApartmentIds.push(apartment.id);

    const image = await createImage(apartment.id, Buffer.from('jpeg bytes'), 'photo.jpg', 0);

    expect(image.order).toBe(0);
    expect(image.filePath).toContain(apartment.id);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `lib/db/documents` and `lib/db/images` do not exist yet.

- [ ] **Step 3: Implement the repositories**

Create `lib/db/documents.ts`:

```ts
import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';

export async function createDocument(apartmentId: string, buffer: Buffer, filename: string, fileType: string) {
  const filePath = await fileStorage.save(apartmentId, buffer, filename);
  return prisma.document.create({ data: { apartmentId, filename, fileType, filePath } });
}

export async function deleteDocument(id: string) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  await fileStorage.delete(document.filePath);
  await prisma.document.delete({ where: { id } });
}
```

Create `lib/db/images.ts`:

```ts
import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';

export async function createImage(apartmentId: string, buffer: Buffer, filename: string, order: number) {
  const filePath = await fileStorage.save(apartmentId, buffer, filename);
  return prisma.image.create({ data: { apartmentId, filePath, order } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db/documents.ts lib/db/images.ts tests/db/documents.test.ts tests/db/images.test.ts
git commit -m "feat: add document and image repositories"
```

---

### Task 5: Manual apartment creation

**Files:**
- Create: `lib/apartments/formData.ts`
- Create: `app/actions/apartments.ts`
- Create: `app/apartments/new/page.tsx`
- Test: `tests/apartments/formData.test.ts`

**Interfaces:**
- Consumes: `createApartment` (Task 2).
- Produces: `parseManualApartmentForm(formData): CreateApartmentInput`, `createManualApartmentAction(formData)` — a server action used by the "+ Add apartment" form.

- [ ] **Step 1: Write the failing test**

Create `tests/apartments/formData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseManualApartmentForm } from '@/lib/apartments/formData';

describe('parseManualApartmentForm', () => {
  it('parses filled fields', () => {
    const formData = new FormData();
    formData.set('title', 'Nice flat');
    formData.set('address', 'Müllerstraße 42');
    formData.set('price', '425000');
    formData.set('livingArea', '58.5');
    formData.set('rooms', '2.5');

    const input = parseManualApartmentForm(formData);

    expect(input).toEqual({
      source: 'MANUAL',
      title: 'Nice flat',
      address: 'Müllerstraße 42',
      price: 425000,
      livingArea: 58.5,
      rooms: 2.5,
    });
  });

  it('omits empty fields instead of coercing to 0 or empty string', () => {
    const input = parseManualApartmentForm(new FormData());

    expect(input).toEqual({ source: 'MANUAL' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `lib/apartments/formData` does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `lib/apartments/formData.ts`:

```ts
import type { CreateApartmentInput } from '@/lib/db/apartments';

export function parseManualApartmentForm(formData: FormData): CreateApartmentInput {
  const title = formData.get('title')?.toString();
  const address = formData.get('address')?.toString();
  const price = formData.get('price')?.toString();
  const livingArea = formData.get('livingArea')?.toString();
  const rooms = formData.get('rooms')?.toString();

  return {
    source: 'MANUAL',
    ...(title && { title }),
    ...(address && { address }),
    ...(price && { price: Number(price) }),
    ...(livingArea && { livingArea: Number(livingArea) }),
    ...(rooms && { rooms: Number(rooms) }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Add the server action**

Create `app/actions/apartments.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Status, MaklervertragStatus } from '@prisma/client';
import {
  createApartment,
  updateApartment,
  updateApartmentStatus,
} from '@/lib/db/apartments';
import { parseManualApartmentForm } from '@/lib/apartments/formData';

export async function createManualApartmentAction(formData: FormData) {
  const apartment = await createApartment(parseManualApartmentForm(formData));
  revalidatePath('/');
  redirect(`/apartments/${apartment.id}`);
}
```

- [ ] **Step 6: Add the manual-creation page**

Create `app/apartments/new/page.tsx`:

```tsx
import { createManualApartmentAction } from '@/app/actions/apartments';

export default function NewApartmentPage() {
  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Add apartment manually</h1>
      <form action={createManualApartmentAction} className="space-y-3">
        <label className="block">
          Title
          <input name="title" type="text" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Address
          <input name="address" type="text" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Price (EUR)
          <input name="price" type="number" step="1" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Living area (m²)
          <input name="livingArea" type="number" step="0.1" className="block w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          Rooms
          <input name="rooms" type="number" step="0.5" className="block w-full border rounded px-2 py-1" />
        </label>
        <button type="submit" className="px-4 py-2 bg-black text-white rounded">
          Create apartment
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/apartments/new`, submit the form, confirm it redirects to `/apartments/<id>` (a 404 page is expected there until Task 7 adds the detail page — that's fine, it confirms the apartment was created and redirected correctly).

- [ ] **Step 8: Commit**

```bash
git add lib/apartments app/actions app/apartments/new tests/apartments
git commit -m "feat: add manual apartment creation"
```

---

### Task 6: Apartment grid (card view) and file-serving route

**Files:**
- Create: `lib/apartments/format.ts`
- Create: `app/api/files/[...path]/route.ts`
- Create: `components/ApartmentCard.tsx`
- Modify: `app/page.tsx`
- Test: `tests/apartments/format.test.ts`

**Interfaces:**
- Consumes: `listApartments` (Task 2), `fileStorage.read` (Task 3).
- Produces: `formatPrice`, `formatAreaAndRooms`, `STATUS_LABELS` (imported by the detail page in Task 8 too), `<ApartmentCard>`.

- [ ] **Step 1: Write the failing test**

Create `tests/apartments/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice, formatAreaAndRooms } from '@/lib/apartments/format';

describe('formatPrice', () => {
  it('formats a price in German locale', () => {
    expect(formatPrice(425000)).toBe('€425.000');
  });

  it('returns null for missing price', () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });
});

describe('formatAreaAndRooms', () => {
  it('combines area and rooms', () => {
    expect(formatAreaAndRooms(58, 2)).toBe('58 m² · 2 rooms');
  });

  it('handles only area', () => {
    expect(formatAreaAndRooms(58, null)).toBe('58 m²');
  });

  it('returns null when both are missing', () => {
    expect(formatAreaAndRooms(null, null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `lib/apartments/format` does not exist yet.

- [ ] **Step 3: Implement the formatters**

Create `lib/apartments/format.ts`:

```ts
export function formatPrice(price: number | null | undefined): string | null {
  if (price == null) return null;
  return `€${price.toLocaleString('de-DE')}`;
}

export function formatAreaAndRooms(
  livingArea: number | null | undefined,
  rooms: number | null | undefined,
): string | null {
  const parts: string[] = [];
  if (livingArea != null) parts.push(`${livingArea} m²`);
  if (rooms != null) parts.push(`${rooms} rooms`);
  return parts.length ? parts.join(' · ') : null;
}

export const STATUS_LABELS: Record<string, string> = {
  NOT_CONTACTED: 'Not contacted yet',
  CONTACTED: 'Contacted',
  RECEIVED_EXPOSE: 'Received Exposé',
  SETUP_VIEWING: 'Setup viewing',
  POST_VIEWING: 'Post-viewing stage',
  INTEREST_FOR_PURCHASE: 'Interest for purchase',
};

export const MAKLERVERTRAG_LABELS: Record<string, string> = {
  NOT_RECEIVED: 'Not received',
  RECEIVED: 'Received',
  SIGNED: 'Signed',
  WIDERRUF: 'Widerruf',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Add the file-serving route**

Create `app/api/files/[...path]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import path from 'path';
import { fileStorage } from '@/lib/storage/fileStorage';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const reference = params.path.join('/');
  const download = request.nextUrl.searchParams.get('download') === '1';

  try {
    const stream = await fileStorage.read(reference);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    const headers = new Headers();
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${path.basename(reference)}"`);
    }
    return new NextResponse(webStream, { headers });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
```

- [ ] **Step 6: Add the ApartmentCard component**

Create `components/ApartmentCard.tsx`:

```tsx
import Link from 'next/link';
import Image from 'next/image';
import type { Apartment, Image as ApartmentImage } from '@prisma/client';
import { formatPrice, formatAreaAndRooms, STATUS_LABELS } from '@/lib/apartments/format';

type ApartmentCardProps = {
  apartment: Apartment & { images: ApartmentImage[] };
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const image = apartment.images[0];
  const price = formatPrice(apartment.price);
  const areaAndRooms = formatAreaAndRooms(apartment.livingArea, apartment.rooms);

  return (
    <Link
      href={`/apartments/${apartment.id}`}
      className="block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
        {image ? (
          <Image
            src={`/api/files/${image.filePath}`}
            alt={apartment.title ?? 'Apartment'}
            width={400}
            height={300}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-400 text-sm">No image</span>
        )}
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

- [ ] **Step 7: Replace the home page with the apartment grid**

Replace the contents of `app/page.tsx`:

```tsx
import Link from 'next/link';
import { listApartments } from '@/lib/db/apartments';
import { ApartmentCard } from '@/components/ApartmentCard';

export default async function HomePage() {
  const apartments = await listApartments();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Flat Buying Tracker</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Link
          href="/apartments/new"
          className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 aspect-[4/3] text-gray-500 hover:border-gray-400"
        >
          <span className="text-3xl">+</span>
          <span className="font-medium">Add apartment</span>
          <span className="text-sm">Paste or drop a link</span>
        </Link>
        {apartments.map((apartment) => (
          <ApartmentCard key={apartment.id} apartment={apartment} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Configure Next.js to allow local images**

In `next.config.mjs`, images served from `/api/files/...` are same-origin so no remote-pattern config is needed — confirm the default config is untouched.

- [ ] **Step 9: Manual verification**

Run `npm run dev`, visit `http://localhost:3000`, confirm the "+ Add apartment" card renders and any apartments created in Task 5 appear as cards with placeholder "No image".

- [ ] **Step 10: Commit**

```bash
git add lib/apartments/format.ts app/api/files components/ApartmentCard.tsx app/page.tsx tests/apartments/format.test.ts
git commit -m "feat: add apartment card grid and file-serving route"
```

---

### Task 7: Apartment detail page — editable properties

**Files:**
- Modify: `lib/apartments/formData.ts`
- Modify: `app/actions/apartments.ts`
- Create: `app/apartments/[id]/page.tsx`
- Test: `tests/apartments/formData.test.ts`

**Interfaces:**
- Consumes: `getApartment`, `updateApartment` (Task 2).
- Produces: `parseApartmentPropertiesForm(formData)`, `updateApartmentPropertiesAction(id, formData)`.

- [ ] **Step 1: Write the failing test**

Append to `tests/apartments/formData.test.ts`:

```ts
import { parseApartmentPropertiesForm } from '@/lib/apartments/formData';

describe('parseApartmentPropertiesForm', () => {
  it('parses all property fields including booleans', () => {
    const formData = new FormData();
    formData.set('title', 'Updated title');
    formData.set('floor', '3');
    formData.set('balcony', 'true');
    formData.set('elevator', 'false');
    formData.set('locationRating', '4');

    const input = parseApartmentPropertiesForm(formData);

    expect(input).toEqual({
      title: 'Updated title',
      floor: '3',
      balcony: true,
      elevator: false,
      locationRating: 4,
    });
  });

  it('omits fields left blank', () => {
    const input = parseApartmentPropertiesForm(new FormData());
    expect(input).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `parseApartmentPropertiesForm` does not exist yet.

- [ ] **Step 3: Implement the parser**

Append to `lib/apartments/formData.ts`:

```ts
import type { UpdateApartmentInput } from '@/lib/db/apartments';

export function parseApartmentPropertiesForm(formData: FormData): UpdateApartmentInput {
  const getString = (key: string) => formData.get(key)?.toString() || undefined;
  const getNumber = (key: string) => {
    const value = formData.get(key)?.toString();
    return value ? Number(value) : undefined;
  };
  const getBoolean = (key: string) => {
    const value = formData.get(key)?.toString();
    return value ? value === 'true' : undefined;
  };

  const result: UpdateApartmentInput = {};
  const title = getString('title');
  const address = getString('address');
  const price = getNumber('price');
  const livingArea = getNumber('livingArea');
  const rooms = getNumber('rooms');
  const floor = getString('floor');
  const balcony = getBoolean('balcony');
  const elevator = getBoolean('elevator');
  const kitchen = getString('kitchen');
  const condition = getString('condition');
  const hausgeld = getNumber('hausgeld');
  const maklerprovision = getString('maklerprovision');
  const locationRating = getNumber('locationRating');
  const personalRating = getNumber('personalRating');

  if (title !== undefined) result.title = title;
  if (address !== undefined) result.address = address;
  if (price !== undefined) result.price = price;
  if (livingArea !== undefined) result.livingArea = livingArea;
  if (rooms !== undefined) result.rooms = rooms;
  if (floor !== undefined) result.floor = floor;
  if (balcony !== undefined) result.balcony = balcony;
  if (elevator !== undefined) result.elevator = elevator;
  if (kitchen !== undefined) result.kitchen = kitchen;
  if (condition !== undefined) result.condition = condition;
  if (hausgeld !== undefined) result.hausgeld = hausgeld;
  if (maklerprovision !== undefined) result.maklerprovision = maklerprovision;
  if (locationRating !== undefined) result.locationRating = locationRating;
  if (personalRating !== undefined) result.personalRating = personalRating;

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Add the update action**

Append to `app/actions/apartments.ts`:

```ts
import { parseApartmentPropertiesForm } from '@/lib/apartments/formData';

export async function updateApartmentPropertiesAction(id: string, formData: FormData) {
  await updateApartment(id, parseApartmentPropertiesForm(formData));
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}
```

(Add this import alongside the existing ones at the top of the file rather than mid-file.)

- [ ] **Step 6: Create the detail page**

Create `app/apartments/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getApartment } from '@/lib/db/apartments';
import { updateApartmentPropertiesAction } from '@/app/actions/apartments';

export default async function ApartmentDetailPage({ params }: { params: { id: string } }) {
  const apartment = await getApartment(params.id);
  if (!apartment) notFound();

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">
        {apartment.title ?? apartment.address ?? 'Untitled apartment'}
      </h1>

      <form action={updateApartmentPropertiesAction.bind(null, apartment.id)} className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Basic</h2>
          <label className="block">
            Title
            <input name="title" defaultValue={apartment.title ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Address
            <input name="address" defaultValue={apartment.address ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Price
            <input name="price" type="number" defaultValue={apartment.price ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Living area (m²)
            <input name="livingArea" type="number" step="0.1" defaultValue={apartment.livingArea ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Rooms
            <input name="rooms" type="number" step="0.5" defaultValue={apartment.rooms ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Property characteristics</h2>
          <label className="block">
            Floor
            <input name="floor" defaultValue={apartment.floor ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Balcony / terrace
            <select name="balcony" defaultValue={apartment.balcony == null ? '' : String(apartment.balcony)} className="block w-full border rounded px-2 py-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block">
            Elevator
            <select name="elevator" defaultValue={apartment.elevator == null ? '' : String(apartment.elevator)} className="block w-full border rounded px-2 py-1">
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="block">
            Kitchen
            <input name="kitchen" defaultValue={apartment.kitchen ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Condition
            <input name="condition" defaultValue={apartment.condition ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Hausgeld
            <input name="hausgeld" type="number" defaultValue={apartment.hausgeld ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Maklerprovision
            <input name="maklerprovision" defaultValue={apartment.maklerprovision ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Location / evaluation</h2>
          <label className="block">
            Location rating (1-5)
            <input name="locationRating" type="number" min={1} max={5} defaultValue={apartment.locationRating ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
          <label className="block">
            Personal rating (1-5)
            <input name="personalRating" type="number" min={1} max={5} defaultValue={apartment.personalRating ?? ''} className="block w-full border rounded px-2 py-1" />
          </label>
        </section>

        <button type="submit" className="px-4 py-2 bg-black text-white rounded">
          Save
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Manual verification**

Run `npm run dev`, open an apartment created earlier, edit a few fields, save, confirm the values persist after reload.

- [ ] **Step 8: Commit**

```bash
git add lib/apartments/formData.ts app/actions/apartments.ts app/apartments/[id]/page.tsx tests/apartments/formData.test.ts
git commit -m "feat: add apartment detail page with editable properties"
```

---

### Task 8: Status and Maklervertrag on the detail page

**Files:**
- Modify: `app/actions/apartments.ts`
- Modify: `app/apartments/[id]/page.tsx`

**Interfaces:**
- Consumes: `updateApartmentStatus`, `updateApartment` (Task 2), `STATUS_LABELS`, `MAKLERVERTRAG_LABELS` (Task 6).
- Produces: `updateApartmentStatusAction(id, formData)`, `updateApartmentMaklervertragAction(id, formData)`.

- [ ] **Step 1: Add the status and Maklervertrag actions**

Append to `app/actions/apartments.ts` (add the `Status`/`MaklervertragStatus` type imports at the top if not already present from Task 5):

```ts
export async function updateApartmentStatusAction(id: string, formData: FormData) {
  const status = formData.get('status')?.toString() as Status;
  await updateApartmentStatus(id, status);
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentMaklervertragAction(id: string, formData: FormData) {
  const maklervertragStatus = formData.get('maklervertragStatus')?.toString() as MaklervertragStatus;
  await updateApartment(id, { maklervertragStatus });
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}
```

- [ ] **Step 2: Add status and Maklervertrag sections to the detail page**

In `app/apartments/[id]/page.tsx`, import `STATUS_LABELS` and `MAKLERVERTRAG_LABELS` from `@/lib/apartments/format`, and `updateApartmentStatusAction`, `updateApartmentMaklervertragAction` from `@/app/actions/apartments`. Add these two sections after the closing `</form>` of the properties form (as siblings inside `<main>`, each with its own `<form>`):

```tsx
<section className="space-y-3">
  <h2 className="text-lg font-medium">Process / status</h2>
  <form action={updateApartmentStatusAction.bind(null, apartment.id)} className="flex gap-2">
    <select name="status" defaultValue={apartment.status} className="border rounded px-2 py-1">
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
    <button type="submit" className="px-3 py-1 border rounded">Update status</button>
  </form>

  <h3 className="text-sm font-medium text-gray-500">Status history</h3>
  <ul className="text-sm space-y-1">
    {apartment.statusHistory.map((entry) => (
      <li key={entry.id}>
        {entry.timestamp.toLocaleDateString('de-DE')} — {STATUS_LABELS[entry.status]}
      </li>
    ))}
  </ul>
</section>

<section className="space-y-3">
  <h2 className="text-lg font-medium">Maklervertrag</h2>
  <form action={updateApartmentMaklervertragAction.bind(null, apartment.id)} className="flex gap-2">
    <select name="maklervertragStatus" defaultValue={apartment.maklervertragStatus} className="border rounded px-2 py-1">
      {Object.entries(MAKLERVERTRAG_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
    <button type="submit" className="px-3 py-1 border rounded">Update</button>
  </form>
</section>
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open an apartment, change status, confirm the history list grows with a new entry; change Maklervertrag status, confirm it persists after reload. (The underlying persistence logic is already covered by Task 2's repository tests — this step verifies the UI wiring.)

- [ ] **Step 4: Commit**

```bash
git add app/actions/apartments.ts app/apartments/[id]/page.tsx
git commit -m "feat: add status history and Maklervertrag tracking to detail page"
```

---

### Task 9: Documents section

**Files:**
- Create: `app/actions/documents.ts`
- Create: `components/DocumentDropzone.tsx`
- Modify: `app/apartments/[id]/page.tsx`

**Interfaces:**
- Consumes: `createDocument`, `deleteDocument` (Task 4), `/api/files/[...path]` (Task 6).
- Produces: `uploadDocumentAction(apartmentId, formData)`, `deleteDocumentAction(apartmentId, documentId)`, `<DocumentDropzone>`.

- [ ] **Step 1: Add document actions**

Create `app/actions/documents.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '@/lib/db/documents';

export async function uploadDocumentAction(apartmentId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await createDocument(apartmentId, buffer, file.name, file.type || 'application/octet-stream');
  revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteDocumentAction(apartmentId: string, documentId: string) {
  await deleteDocument(documentId);
  revalidatePath(`/apartments/${apartmentId}`);
}
```

- [ ] **Step 2: Add the drag-and-drop upload component**

Create `components/DocumentDropzone.tsx`:

```tsx
'use client';

import { useState, useTransition, type DragEvent, type ChangeEvent } from 'react';
import { uploadDocumentAction } from '@/app/actions/documents';

export function DocumentDropzone({ apartmentId }: { apartmentId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function uploadFiles(files: FileList) {
    Array.from(files).forEach((file) => {
      const formData = new FormData();
      formData.set('file', file);
      startTransition(() => {
        uploadDocumentAction(apartmentId, formData);
      });
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      uploadFiles(event.dataTransfer.files);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(event.target.files);
    }
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        isDragging
          ? 'border-2 border-dashed border-blue-400 bg-blue-50 rounded-md p-6 text-center space-y-2'
          : 'border-2 border-dashed border-gray-300 rounded-md p-6 text-center space-y-2'
      }
    >
      <p className="text-sm text-gray-500">{isPending ? 'Uploading…' : '+ Drop files here'}</p>
      <input type="file" multiple onChange={handleChange} />
    </div>
  );
}
```

- [ ] **Step 3: Add the documents section to the detail page**

In `app/apartments/[id]/page.tsx`, import `DocumentDropzone` from `@/components/DocumentDropzone` and `deleteDocumentAction` from `@/app/actions/documents`. Add this section:

```tsx
<section className="space-y-3">
  <h2 className="text-lg font-medium">Documents</h2>
  <ul className="space-y-2 text-sm">
    {apartment.documents.map((document) => (
      <li key={document.id} className="flex items-center gap-3 border rounded px-3 py-2">
        <span>📄 {document.filename}</span>
        <span className="text-gray-400">Added {document.createdAt.toLocaleDateString('de-DE')}</span>
        <a href={`/api/files/${document.filePath}`} target="_blank" rel="noreferrer" className="text-blue-600">
          Open
        </a>
        <a href={`/api/files/${document.filePath}?download=1`} className="text-blue-600">
          Download
        </a>
        <form action={deleteDocumentAction.bind(null, apartment.id, document.id)}>
          <button type="submit" className="text-red-600">Delete</button>
        </form>
      </li>
    ))}
  </ul>
  <DocumentDropzone apartmentId={apartment.id} />
</section>
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open an apartment, drag a PDF onto the dropzone (and also try the file picker), confirm it appears in the list, then Open, Download, and Delete each work.

- [ ] **Step 5: Commit**

```bash
git add app/actions/documents.ts components/DocumentDropzone.tsx app/apartments/[id]/page.tsx
git commit -m "feat: add document upload, download, and delete"
```

---

### Task 10: Notes with autosave

**Files:**
- Modify: `app/actions/apartments.ts`
- Create: `components/NotesEditor.tsx`
- Modify: `app/apartments/[id]/page.tsx`

**Interfaces:**
- Consumes: `updateApartment` (Task 2).
- Produces: `updateApartmentNotesAction(id, notes)`, `<NotesEditor>`.

- [ ] **Step 1: Add the notes action**

Append to `app/actions/apartments.ts`:

```ts
export async function updateApartmentNotesAction(id: string, notes: string) {
  await updateApartment(id, { notes });
  revalidatePath(`/apartments/${id}`);
}
```

- [ ] **Step 2: Add the notes editor component**

Create `components/NotesEditor.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { updateApartmentNotesAction } from '@/app/actions/apartments';

export function NotesEditor({ apartmentId, initialNotes }: { apartmentId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateApartmentNotesAction(apartmentId, value);
    }, 800);
  }

  return (
    <textarea
      value={notes}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Notes"
      rows={8}
      className="block w-full border rounded px-2 py-1"
    />
  );
}
```

- [ ] **Step 3: Add the notes section to the detail page**

In `app/apartments/[id]/page.tsx`, import `NotesEditor` from `@/components/NotesEditor` and add:

```tsx
<section className="space-y-3">
  <h2 className="text-lg font-medium">Notes</h2>
  <NotesEditor apartmentId={apartment.id} initialNotes={apartment.notes ?? ''} />
</section>
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open an apartment, type in the notes field, wait about a second, reload the page, confirm the notes persisted. (Persistence itself is covered by Task 2's `updateApartment` repository test — this step verifies the debounce/autosave wiring.)

- [ ] **Step 5: Commit**

```bash
git add app/actions/apartments.ts components/NotesEditor.tsx app/apartments/[id]/page.tsx
git commit -m "feat: add notes with autosave"
```

---

## Definition of done for this plan

- `npm test` passes.
- `npm run dev` lets you: create an apartment manually, see it on the home grid, open its detail page, edit all basic/characteristic/rating properties, change status (with a growing history list) and Maklervertrag status, drag-and-drop a document (open/download/delete it), and type notes that survive a reload.
- No scraping yet — that's plan 2.
