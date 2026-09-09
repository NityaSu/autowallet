export type NotificationType =
  | "account.welcome"
  | "transfer.sent"
  | "transfer.received"
  | "agent.created"
  | "agent.funded"
  | "agent.paused"
  | "agent.resumed"
  | "agent.payment.settled"
  | "agent.payment.blocked"
  | "agent.key.created"
  | "agent.key.revoked"
  | "transfer.request"
  | "webhook.created";

export type NotificationKind = "account" | "money" | "agent" | "security";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function notificationKind(type: NotificationType): NotificationKind {
  if (type === "account.welcome") return "account";
  if (type.startsWith("transfer.") || type.startsWith("agent.payment.")) {
    return "money";
  }
  if (type === "agent.funded") return "money";
  if (type === "agent.key.created" || type === "agent.key.revoked") {
    return "security";
  }
  if (type === "webhook.created") return "security";
  return "agent";
}
