-- RedefineTables
-- Drops the free-text `maklerprovision` field now that `maklerprovisionPercent`
-- covers the same information unambiguously. Before dropping, backfill
-- `maklerprovisionPercent` from the old text for any row that doesn't already
-- have it set, by taking the number immediately before the first "%" and
-- normalizing a German comma decimal to a dot (e.g. "3,57 % inkl. MwSt." -> 3.57).
-- Text with no "%" at all (e.g. "Nein") yields NULL, same as leaving it unset.
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
    "maklerprovisionPercent" REAL,
    "locationRating" INTEGER,
    "personalRating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONTACTED',
    "maklervertragStatus" TEXT NOT NULL DEFAULT 'NOT_RECEIVED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Apartment" ("id", "title", "source", "sourceUrl", "address", "price", "livingArea", "rooms", "floor", "balcony", "elevator", "kitchen", "condition", "hausgeld", "maklerprovisionPercent", "locationRating", "personalRating", "status", "maklervertragStatus", "notes", "createdAt", "updatedAt")
SELECT "id", "title", "source", "sourceUrl", "address", "price", "livingArea", "rooms", "floor", "balcony", "elevator", "kitchen", "condition", "hausgeld",
  COALESCE(
    "maklerprovisionPercent",
    CASE
      WHEN "maklerprovision" IS NULL THEN NULL
      WHEN INSTR("maklerprovision", '%') = 0 THEN NULL
      ELSE CAST(TRIM(REPLACE(SUBSTR("maklerprovision", 1, INSTR("maklerprovision", '%') - 1), ',', '.')) AS REAL)
    END
  ),
  "locationRating", "personalRating", "status", "maklervertragStatus", "notes", "createdAt", "updatedAt"
FROM "Apartment";
DROP TABLE "Apartment";
ALTER TABLE "new_Apartment" RENAME TO "Apartment";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
