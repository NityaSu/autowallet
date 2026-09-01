import { eq, sql } from "drizzle-orm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { VENDOR_SEED } from "@/lib/api-vendors";
import { agents, agentPayments, transfers, users } from "./schema";

type AppDb =
  | ReturnType<typeof drizzlePg>
  | ReturnType<typeof drizzlePglite>;

const globalForDb = globalThis as unknown as {
  db: AppDb | undefined;
  ready: Promise<void> | undefined;
};

function createDb(): AppDb {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzlePg(postgres(url, { max: 4 }));
  }
  if (process.env.VITEST) {
    return drizzlePglite({ client: new PGlite() });
  }
  const dir = join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(join(dir, "autowallet"));
  return drizzlePglite({ client });
}

export function getDb(): AppDb {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}

export function ensureDb() {
  if (!globalForDb.ready) globalForDb.ready = migrateAndSeed();
  return globalForDb.ready;
}

async function migrateAndSeed() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      handle text NOT NULL UNIQUE,
      name text NOT NULL,
      password_hash text NOT NULL,
      balance_cents integer NOT NULL
    )
  `);
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'person'
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS transfers (
      id uuid PRIMARY KEY,
      from_user_id uuid NOT NULL REFERENCES users(id),
      to_user_id uuid NOT NULL REFERENCES users(id),
      amount_cents integer NOT NULL,
      memo text NOT NULL,
      idempotency_key text NOT NULL,
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS transfers_from_idempotency
    ON transfers (from_user_id, idempotency_key)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      user_id uuid PRIMARY KEY REFERENCES users(id),
      owner_user_id uuid NOT NULL REFERENCES users(id),
      status text NOT NULL,
      daily_cap_cents integer NOT NULL,
      per_request_max_cents integer NOT NULL,
      allowlist text NOT NULL,
      spent_today_cents integer NOT NULL DEFAULT 0,
      spent_on text NOT NULL DEFAULT '',
      funded_cents integer NOT NULL DEFAULT 0,
      public_key text NOT NULL DEFAULT ''
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_payments (
      id uuid PRIMARY KEY,
      agent_user_id uuid NOT NULL REFERENCES users(id),
      owner_user_id uuid NOT NULL REFERENCES users(id),
      api_id text NOT NULL,
      api_name text NOT NULL,
      host text NOT NULL,
      amount_cents integer NOT NULL,
      status text NOT NULL,
      reason text NOT NULL,
      transfer_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const sunikId = "11111111-1111-1111-1111-111111111111";
  const midasId = "22222222-2222-2222-2222-222222222222";
  const researchAgentId = "44444444-4444-4444-4444-444444444444";
  const codingAgentId = "55555555-5555-5555-5555-555555555555";

  await db
    .update(users)
    .set({ handle: "sunik.pay", name: "Sunik Codes", kind: "person" })
    .where(eq(users.id, sunikId));
  await db
    .update(users)
    .set({ handle: "midas.pay", name: "Midas Wang", kind: "person" })
    .where(eq(users.id, midasId));

  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length === 0) {
    const passwordHash = bcrypt.hashSync("demo", 10);
    await db.insert(users).values([
      {
        id: sunikId,
        handle: "sunik.pay",
        name: "Sunik Codes",
        passwordHash,
        balanceCents: 8240,
        kind: "person",
      },
      {
        id: midasId,
        handle: "midas.pay",
        name: "Midas Wang",
        passwordHash,
        balanceCents: 2400,
        kind: "person",
      },
    ]);
  }

  const passwordHash = bcrypt.hashSync("demo", 10);
  let vendorIdx = 0;
  for (const vendor of VENDOR_SEED) {
    vendorIdx += 1;
    const id = `33333333-3333-3333-3333-${String(vendorIdx).padStart(12, "0")}`;
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, vendor.handle))
      .limit(1);
    if (!row) {
      await db.insert(users).values({
        id,
        handle: vendor.handle,
        name: vendor.name,
        passwordHash,
        balanceCents: 0,
        kind: "vendor",
      });
    }
  }

  const [researchRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, "research-agent.pay"))
    .limit(1);
  if (!researchRow) {
    await db.insert(users).values({
      id: researchAgentId,
      handle: "research-agent.pay",
      name: "Research Agent",
      passwordHash,
      balanceCents: 8240,
      kind: "agent",
    });
    await db.insert(agents).values({
      userId: researchAgentId,
      ownerUserId: sunikId,
      status: "active",
      dailyCapCents: 1000,
      perRequestMaxCents: 100,
      allowlist: JSON.stringify([
        "api.search.com",
        "api.openai.com",
        "data.example.com",
      ]),
      spentTodayCents: 342,
      spentOn: new Date().toISOString().slice(0, 10),
      fundedCents: 10000,
      publicKey: "0x8f2a…c91e",
    });
  }

  const [codingRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, "coding-agent.pay"))
    .limit(1);
  if (!codingRow) {
    await db.insert(users).values({
      id: codingAgentId,
      handle: "coding-agent.pay",
      name: "Coding Agent",
      passwordHash,
      balanceCents: 5410,
      kind: "agent",
    });
    await db.insert(agents).values({
      userId: codingAgentId,
      ownerUserId: sunikId,
      status: "active",
      dailyCapCents: 2000,
      perRequestMaxCents: 200,
      allowlist: JSON.stringify(["api.openai.com", "api.search.com"]),
      spentTodayCents: 418,
      spentOn: new Date().toISOString().slice(0, 10),
      fundedCents: 8000,
      publicKey: "0x4b1c…9a02",
    });
  }
}

export { users, transfers, agents, agentPayments };
