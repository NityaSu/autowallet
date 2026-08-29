# AutoWallet

Demo person-to-person wallet. **No real money.**

**Stack:** Next.js · TypeScript · Postgres-compatible ledger (PGlite locally, Postgres in production)

## Run locally

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Leave `DATABASE_URL` empty to use a local PGlite file in `.data/`. Or set `DATABASE_URL` and `docker compose up -d` for real Postgres.

Open [http://localhost:3000](http://localhost:3000).

Demo logins (password `demo`):

- `sunik.pay` — $82.40 (Sunik Codes)
- `midas.pay` — $24.00 (Midas Wang)

Send from Sunik to Midas, then hard-refresh: the ledger keeps the transfer. Log out and sign in as Midas to see the credit.

## Deploy (Vercel)

1. Create a Postgres database (Neon or Vercel Postgres).
2. Set `DATABASE_URL` and `AUTH_SECRET` (long random string).
3. Deploy this Next.js app.

The first request creates tables and seeds the two demo users.

Agent / policy screens are still in-memory mocks. P2P send is the real path.
