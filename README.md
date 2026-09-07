# Flat Buying Tracker

A personal workspace for tracking apartments through the buying process — add listings, track status, and keep documents and notes together in one place.

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app. `DATABASE_URL` in `.env` points at a local SQLite file (`data/app.db` by default); `npx prisma migrate deploy` applies the schema in `prisma/migrations/` to it.

## Running tests

```bash
npm test
```

Tests use a separate SQLite database (`data/test.db`, configured via `.env.test`) so they never touch your dev data. The schema is pushed to it automatically before each run.
