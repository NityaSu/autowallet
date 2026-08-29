import { eq, sql } from "drizzle-orm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { transfers, users } from "./schema";

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

  const sunikId = "11111111-1111-1111-1111-111111111111";
  const midasId = "22222222-2222-2222-2222-222222222222";

  await db
    .update(users)
    .set({ handle: "sunik.pay", name: "Sunik Codes" })
    .where(eq(users.id, sunikId));
  await db
    .update(users)
    .set({ handle: "midas.pay", name: "Midas Wang" })
    .where(eq(users.id, midasId));

  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) return;

  const passwordHash = bcrypt.hashSync("demo", 10);
  await db.insert(users).values([
    {
      id: sunikId,
      handle: "sunik.pay",
      name: "Sunik Codes",
      passwordHash,
      balanceCents: 8240,
    },
    {
      id: midasId,
      handle: "midas.pay",
      name: "Midas Wang",
      passwordHash,
      balanceCents: 2400,
    },
  ]);
}

export { users, transfers };
