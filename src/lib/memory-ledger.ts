import { usdToCents, centsToUsd } from "@/lib/cents";
import {
  normalizeHandle,
  validateTransferShape,
  type LedgerTransfer,
  type TransferInput,
  type TransferResult,
} from "@/lib/ledger-types";

type Account = {
  id: string;
  handle: string;
  name: string;
  balanceCents: number;
};

type StoredTransfer = LedgerTransfer & {
  fromId: string;
  toId: string;
  idempotencyKey: string;
};

function mutex() {
  let chain = Promise.resolve();
  return async <T>(fn: () => Promise<T> | T) => {
    const next = chain.then(fn, fn);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}

/** In-memory ledger with a global lock — same rules as Postgres, for tests. */
export class MemoryLedger {
  private accounts: Account[];
  private transfers: StoredTransfer[] = [];
  private lock = mutex();

  constructor(accounts: Account[]) {
    this.accounts = accounts.map((a) => ({ ...a }));
  }

  snapshot() {
    return {
      accounts: this.accounts.map((a) => ({ ...a })),
      transfers: this.transfers.map((t) => ({ ...t })),
    };
  }

  async transfer(input: TransferInput): Promise<TransferResult> {
    return this.lock(() => this.transferUnlocked(input));
  }

  private transferUnlocked(input: TransferInput): TransferResult {
    const shape = validateTransferShape(input);
    if (shape) return shape;
    const cents = usdToCents(input.amountUsd);
    if (cents === null) return { ok: false, reason: "Enter an amount." };

    const fromHandle = normalizeHandle(input.fromHandle);
    const toHandle = normalizeHandle(input.toHandle);
    const key = input.idempotencyKey.trim();

    const from = this.accounts.find((a) => a.handle === fromHandle);
    const to = this.accounts.find((a) => a.handle === toHandle);
    if (!from) return { ok: false, reason: "Sender not found." };
    if (!to) return { ok: false, reason: `Nobody at ${toHandle}.` };

    const replay = this.transfers.find(
      (t) => t.fromId === from.id && t.idempotencyKey === key,
    );
    if (replay) {
      return { ok: true, replay: true, transfer: replay };
    }

    if (from.balanceCents < cents) {
      return { ok: false, reason: "Not enough balance." };
    }

    from.balanceCents -= cents;
    to.balanceCents += cents;
    const transfer: StoredTransfer = {
      id: crypto.randomUUID(),
      fromId: from.id,
      toId: to.id,
      fromHandle: from.handle,
      toHandle: to.handle,
      amountUsd: centsToUsd(cents),
      memo: input.memo.trim() || "—",
      status: "settled",
      createdAt: new Date().toISOString(),
      idempotencyKey: key,
    };
    this.transfers.unshift(transfer);
    return { ok: true, replay: false, transfer };
  }
}
