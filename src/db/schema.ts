import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  balanceCents: integer("balance_cents").notNull(),
  kind: text("kind").notNull().default("person"),
});

export const agents = pgTable("agents", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(),
  dailyCapCents: integer("daily_cap_cents").notNull(),
  perRequestMaxCents: integer("per_request_max_cents").notNull(),
  allowlist: text("allowlist").notNull(),
  spentTodayCents: integer("spent_today_cents").notNull().default(0),
  spentOn: text("spent_on").notNull().default(""),
  fundedCents: integer("funded_cents").notNull().default(0),
  publicKey: text("public_key").notNull().default(""),
});

export const agentPayments = pgTable("agent_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentUserId: uuid("agent_user_id")
    .notNull()
    .references(() => users.id),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  apiId: text("api_id").notNull(),
  apiName: text("api_name").notNull(),
  host: text("host").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  transferId: uuid("transfer_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("webhook_endpoints_owner_url").on(table.ownerUserId, table.url),
  ],
);

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    memo: text("memo").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("transfers_from_idempotency").on(table.fromUserId, table.idempotencyKey)],
);

export type UserRow = typeof users.$inferSelect;
export type AgentRow = typeof agents.$inferSelect;
export type AgentPaymentRow = typeof agentPayments.$inferSelect;
export type TransferRow = typeof transfers.$inferSelect;
export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
