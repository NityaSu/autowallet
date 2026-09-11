import {
  index,
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
  locked: integer("locked").notNull().default(0),
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

export const agentApiKeys = pgTable("agent_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentUserId: uuid("agent_user_id")
    .notNull()
    .references(() => users.id),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
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
  (table) => [
    unique("transfers_from_idempotency").on(table.fromUserId, table.idempotencyKey),
    index("transfers_to_created").on(table.toUserId, table.createdAt),
    index("transfers_from_created").on(table.fromUserId, table.createdAt),
  ],
);

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  memo: text("memo").notNull(),
  status: text("status").notNull(),
  transferId: uuid("transfer_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type AgentRow = typeof agents.$inferSelect;
export type AgentPaymentRow = typeof agentPayments.$inferSelect;
export type TransferRow = typeof transfers.$inferSelect;
export type PaymentRequestRow = typeof paymentRequests.$inferSelect;
export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
export type AgentApiKeyRow = typeof agentApiKeys.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
