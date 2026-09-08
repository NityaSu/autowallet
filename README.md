# AutoWallet

An agent can spend only inside a policy the owner set. Every allow or block is a receipt on a Postgres ledger.

**No real money.** No card rails, no KYC, no licenses. The ledger, the policy, and the audit trail are real.

## What is real

- P2P transfers in integer cents, inside a database transaction
- Unique `(from_user_id, idempotency_key)` — a retry does not move money twice
- Agent wallets with allowlist, daily cap, per-request max, and pause
- `POST /api/pay` — session cookie or hashed `ak_…` bearer key; `402` when policy denies
- Signed webhooks on settle and block
- Inbox, receipts, and CSV audit export

Ledger is Postgres in production (Neon or any `DATABASE_URL`). Locally it is a PGlite file in `.data/` unless you point at Docker Postgres.

## What is still mocked

The APIs lab’s “facilitator verify + settle” step. Policy decides; nothing hits a real 402 rail.

Login/signup rate limits are an in-process map. Fine for a demo. Wrong under multiple serverless isolates.

## Try it

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Demo logins, password `demo`:

| Handle | Who | Seeded balance |
| --- | --- | --- |
| `sunik.pay` | Sunik Codes | $82.40 |
| `midas.pay` | Midas Wang | $24.00 |

Sunik owns two seeded agents. Research Agent (`research-agent.pay`) may call `api.search.com`, `api.openai.com`, and `data.example.com`.

Login, then list agents and copy Research Agent’s `id`:

```bash
curl -sS -c /tmp/aw.cookies -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"handle":"sunik.pay","password":"demo"}'

curl -sS -b /tmp/aw.cookies http://localhost:3000/api/agents
```

**Settle** — Search API is $0.02 and on the allowlist:

```bash
curl -sS -b /tmp/aw.cookies -X POST http://localhost:3000/api/pay \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "<id from GET /api/agents>",
    "apiId": "search",
    "idempotencyKey": "readme-settle-1"
  }'
```

**Block** — `unknown` is not on any allowlist. Expect HTTP 402 and an `agent_payments` row with `status: blocked`:

```bash
curl -sS -b /tmp/aw.cookies -X POST http://localhost:3000/api/pay \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "<id from GET /api/agents>",
    "apiId": "unknown",
    "idempotencyKey": "readme-block-1"
  }'
```

Same endpoint with `Authorization: Bearer ak_…` after you issue a key from the agent page or `POST /api/agents/:id/keys`. The token is shown once; only the SHA-256 hash is stored.

Hard-refresh the UI. The transfer and the payment receipt are still there.

## Policy

Evaluated in this order: paused → host allowlist → per-request max → daily cap. A deny still writes a payment row. A settle writes a transfer to the vendor account (`search-api.pay`, `llm-api.pay`, …).

## Deploy

1. Postgres (`DATABASE_URL`).
2. `AUTH_SECRET` — long random string, not the `.env.example` default. Production refuses to boot without it.
3. Deploy the Next.js app. First request creates tables and seeds the demo users.

This is a portfolio ledger, not a payments company. Fork it to learn how money and policy stay honest when the UI is gone.
