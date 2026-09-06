-- CreateTable
CREATE TABLE "Apartment" (
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
    "kitchen" TEXT,
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

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Image_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apartmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
