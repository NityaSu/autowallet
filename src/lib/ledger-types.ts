export type TransferInput = {
  fromHandle: string;
  toHandle: string;
  amountUsd: number;
  memo: string;
  idempotencyKey: string;
};

export type LedgerTransfer = {
  id: string;
  fromHandle: string;
  toHandle: string;
  amountUsd: number;
  memo: string;
  status: "settled";
  createdAt: string;
};

export type TransferOk = { ok: true; transfer: LedgerTransfer; replay: boolean };
export type TransferFail = { ok: false; reason: string };
export type TransferResult = TransferOk | TransferFail;

export function normalizeHandle(handle: string) {
  return handle.trim().toLowerCase();
}

const HANDLE_RE = /^[a-z][a-z0-9-]{1,22}\.pay$/;

export function validateSignupShape(input: {
  name?: string;
  handle?: string;
  password?: string;
}): { ok: true; name: string; handle: string; password: string } | { ok: false; reason: string } {
  const name = input.name?.trim() ?? "";
  const handle = normalizeHandle(input.handle ?? "");
  const password = input.password ?? "";
  if (name.length < 2 || name.length > 48) {
    return { ok: false, reason: "Enter a name (2–48 characters)." };
  }
  if (!HANDLE_RE.test(handle)) {
    return { ok: false, reason: "Handle should look like nina.pay." };
  }
  if (password.length < 4) {
    return { ok: false, reason: "Password must be at least 4 characters." };
  }
  return { ok: true, name, handle, password };
}

export function validateTransferShape(input: TransferInput): TransferFail | null {
  const from = normalizeHandle(input.fromHandle);
  const to = normalizeHandle(input.toHandle);
  const key = input.idempotencyKey.trim();
  if (!key) return { ok: false, reason: "Missing idempotency key." };
  if (!to) return { ok: false, reason: "Enter who to send to." };
  if (from === to) return { ok: false, reason: "Can't send to yourself." };
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, reason: "Enter an amount." };
  }
  return null;
}
