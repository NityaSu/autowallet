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
