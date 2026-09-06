import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb, notifications, users } from "@/db";
import { SIGNUP_BALANCE_CENTS, centsToUsd } from "@/lib/cents";
import type { LedgerTransfer } from "@/lib/ledger-types";
import { money } from "@/lib/money";
import {
  notificationKind,
  type NotificationDto,
  type NotificationType,
} from "@/lib/notification-types";

export const NOTIFICATION_LIMIT = 40;
export type {
  NotificationDto,
  NotificationKind,
  NotificationType,
} from "@/lib/notification-types";
export { notificationKind } from "@/lib/notification-types";

export type NotificationList = {
  items: NotificationDto[];
  unread: number;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function toDto(row: typeof notifications.$inferSelect): NotificationDto {
  return {
    id: row.id,
    type: row.type as NotificationType,
    kind: notificationKind(row.type as NotificationType),
    title: row.title,
    body: row.body,
    href: row.href,
    read: Boolean(row.readAt),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })
    .returning();
  return row ? toDto(row) : null;
}

export async function listNotificationsForUser(
  userId: string,
  limit = NOTIFICATION_LIMIT,
): Promise<NotificationList> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  const [unreadRow] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return {
    items: rows.map(toDto),
    unread: Number(unreadRow?.n ?? 0),
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const db = getDb();
  const [owned] = await db
    .select({ id: notifications.id, readAt: notifications.readAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .limit(1);
  if (!owned) return { ok: false as const };
  if (!owned.readAt) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }
  return { ok: true as const };
}

export async function markAllNotificationsRead(userId: string) {
  const db = getDb();
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    )
    .returning();
  return { ok: true as const, marked: updated.length };
}

export async function notifyWelcome(userId: string, name: string) {
  const balance = money(centsToUsd(SIGNUP_BALANCE_CENTS));
  return createNotification({
    userId,
    type: "account.welcome",
    title: `Welcome, ${firstName(name)}`,
    body: `Your wallet is live with ${balance} demo balance.`,
    href: "/",
  });
}

export async function notifyPersonTransfer(transfer: LedgerTransfer) {
  const db = getDb();
  const parties = await db
    .select({
      id: users.id,
      handle: users.handle,
      kind: users.kind,
    })
    .from(users)
    .where(eq(users.handle, transfer.fromHandle));
  const [from] = parties;
  const [to] = await db
    .select({
      id: users.id,
      handle: users.handle,
      kind: users.kind,
    })
    .from(users)
    .where(eq(users.handle, transfer.toHandle));
  if (!from || !to) return;
  if (from.kind !== "person" || to.kind !== "person") return;

  const amount = money(transfer.amountUsd);
  const memo =
    transfer.memo && transfer.memo !== "—" ? ` · ${transfer.memo}` : "";
  const href = `/activity/${transfer.id}`;
  await Promise.all([
    createNotification({
      userId: from.id,
      type: "transfer.sent",
      title: `Sent ${amount}`,
      body: `To ${to.handle}${memo}`,
      href,
    }),
    createNotification({
      userId: to.id,
      type: "transfer.received",
      title: `Received ${amount}`,
      body: `From ${from.handle}${memo}`,
      href,
    }),
  ]);
}

export async function notifyAgentCreated(input: {
  ownerUserId: string;
  agentId: string;
  agentName: string;
}) {
  return createNotification({
    userId: input.ownerUserId,
    type: "agent.created",
    title: `${input.agentName} is live`,
    body: "New agent wallet issued. Fund it before it can pay APIs.",
    href: `/agents/${input.agentId}`,
  });
}

export async function notifyAgentFunded(input: {
  ownerUserId: string;
  agentId: string;
  agentName: string;
  amountUsd: number;
}) {
  return createNotification({
    userId: input.ownerUserId,
    type: "agent.funded",
    title: `Funded ${input.agentName}`,
    body: `${money(input.amountUsd)} moved into the agent wallet.`,
    href: `/agents/${input.agentId}`,
  });
}

export async function notifyAgentStatus(input: {
  ownerUserId: string;
  agentId: string;
  agentName: string;
  status: string;
}) {
  const paused = input.status === "paused";
  return createNotification({
    userId: input.ownerUserId,
    type: paused ? "agent.paused" : "agent.resumed",
    title: paused
      ? `${input.agentName} paused`
      : `${input.agentName} is active again`,
    body: paused
      ? "The agent cannot spend until you resume it."
      : "Policy checks are on. The agent can pay allowed APIs again.",
    href: `/agents/${input.agentId}`,
  });
}

export async function notifyAgentPayment(input: {
  ownerUserId: string;
  agentId: string;
  agentName: string;
  paymentId: string;
  apiName: string;
  amountCents: number;
  status: "settled" | "blocked";
  reason: string;
}) {
  const amount = money(centsToUsd(input.amountCents));
  const settled = input.status === "settled";
  return createNotification({
    userId: input.ownerUserId,
    type: settled ? "agent.payment.settled" : "agent.payment.blocked",
    title: settled
      ? `${input.agentName} paid ${amount}`
      : `${input.agentName} was blocked`,
    body: settled
      ? `${input.apiName} · ${input.reason}`
      : `${input.apiName} · ${input.reason}`,
    href: `/payments/${input.paymentId}`,
  });
}

export async function notifyAgentKey(input: {
  ownerUserId: string;
  agentId: string;
  agentName: string;
  keyName: string;
  revoked?: boolean;
}) {
  const revoked = Boolean(input.revoked);
  return createNotification({
    userId: input.ownerUserId,
    type: revoked ? "agent.key.revoked" : "agent.key.created",
    title: revoked
      ? `API key revoked · ${input.agentName}`
      : `New API key · ${input.agentName}`,
    body: revoked
      ? `“${input.keyName}” can no longer call AutoWallet.`
      : `“${input.keyName}” was issued. Copy the token now — it is shown once.`,
    href: `/agents/${input.agentId}`,
  });
}

export async function notifyWebhookCreated(input: {
  ownerUserId: string;
  url: string;
}) {
  return createNotification({
    userId: input.ownerUserId,
    type: "webhook.created",
    title: "Webhook endpoint added",
    body: `Payment events will POST to ${hostOf(input.url)}.`,
    href: "/settings",
  });
}
