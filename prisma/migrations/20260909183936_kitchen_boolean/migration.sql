-- RedefineTables
-- `kitchen` changes from a free-text field (e.g. "yes", "no", "Einbauküche")
-- to a boolean indicating whether a kitchen exists. Any non-null value other
-- than "no" (case-insensitive) is treated as "kitchen exists" — this covers
-- both the old "yes"/"no" manual entries and scraped free text like
-- "Einbauküche", where the field being non-null at all meant a kitchen was
-- mentioned on the listing.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Apartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "address" TEXT,
    "price" REAL,
    "livingArea" REAL,
    "rooms" REAL,
    "floor" TEXT,
    "balcony" BOOLEAN,
    "elevator" BOOLEAN,
    "kitchen" BOOLEAN,
    "condition" TEXT,
    "hausgeld" REAL,
    "maklerprovision" TEXT,
    "locationRating" INTEGER,
    "personalRating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONTACTED',
    "maklervertragStatus" TEXT NOT NULL DEFAULT 'NOT_RECEIVED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Apartment" ("id", "title", "source", "sourceUrl", "address", "price", "livingArea", "rooms", "floor", "balcony", "elevator", "kitchen", "condition", "hausgeld", "maklerprovision", "locationRating", "personalRating", "status", "maklervertragStatus", "notes", "createdAt", "updatedAt")
SELECT "id", "title", "source", "sourceUrl", "address", "price", "livingArea", "rooms", "floor", "balcony", "elevator",
  CASE
    WHEN "kitchen" IS NULL THEN NULL
    WHEN lower("kitchen") = 'no' THEN 0
    ELSE 1
  END,
  "condition", "hausgeld", "maklerprovision", "locationRating", "personalRating", "status", "maklervertragStatus", "notes", "createdAt", "updatedAt"
FROM "Apartment";
DROP TABLE "Apartment";
ALTER TABLE "new_Apartment" RENAME TO "Apartment";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
