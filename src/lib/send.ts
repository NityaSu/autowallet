import type { Person } from "@/data/wallets";
import { round2 } from "@/lib/money";

export type SendOk = { ok: true; people: Person[]; amount: number };
export type SendFail = { ok: false; reason: string };

export function applySend(
  people: Person[],
  fromHandle: string,
  toHandle: string,
  amount: number,
): SendOk | SendFail {
  const n = round2(amount);
  const from = fromHandle.trim().toLowerCase();
  const to = toHandle.trim().toLowerCase();

  if (!(n > 0)) return { ok: false, reason: "Enter an amount." };
  if (!to) return { ok: false, reason: "Enter who to send to." };
  if (from === to) return { ok: false, reason: "Can't send to yourself." };

  const sender = people.find((p) => p.handle === from);
  const recipient = people.find((p) => p.handle === to);
  if (!sender) return { ok: false, reason: "Sender not found." };
  if (!recipient) return { ok: false, reason: `Nobody at ${to}.` };
  if (sender.balanceUsd < n) return { ok: false, reason: "Not enough balance." };

  return {
    ok: true,
    amount: n,
    people: people.map((p) => {
      if (p.handle === from) {
        return { ...p, balanceUsd: round2(p.balanceUsd - n) };
      }
      if (p.handle === to) {
        return { ...p, balanceUsd: round2(p.balanceUsd + n) };
      }
      return p;
    }),
  };
}
