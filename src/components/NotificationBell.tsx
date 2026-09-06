"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTxTime } from "@/lib/money";
import { NOTIFY_EVENT } from "@/lib/notify-ping";
import type { NotificationDto } from "@/lib/notification-types";
import { cx } from "@/lib/tw";

const KIND_LABEL: Record<NotificationDto["kind"], string> = {
  account: "Account",
  money: "Money",
  agent: "Agent",
  security: "Security",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    const data = (await res.json()) as {
      ok: boolean;
      items?: NotificationDto[];
      unread?: number;
    };
    if (!data.ok) return;
    setItems(data.items ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  useEffect(() => {
    void load();
    const onPing = () => {
      void load();
    };
    window.addEventListener(NOTIFY_EVENT, onPing);
    window.addEventListener("focus", onPing);
    const tick = window.setInterval(onPing, 12_000);
    return () => {
      window.removeEventListener(NOTIFY_EVENT, onPing);
      window.removeEventListener("focus", onPing);
      window.clearInterval(tick);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function mark(id?: string, all = false) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { id }),
    });
    await load();
  }

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="relative grid size-10 cursor-pointer place-items-center rounded-xl border-0 bg-background text-foreground"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-normal text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute top-12 right-0 z-30 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(28,22,18,0.12)]"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <strong className="text-[13px] font-semibold">Notifications</strong>
            {unread > 0 ? (
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent font-sans text-[12px] font-semibold text-brand"
                onClick={() => void mark(undefined, true)}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="m-0 max-h-[min(420px,60vh)] list-none overflow-y-auto p-0">
              {items.map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={n.href ?? "/"}
                    className={cx(
                      "block px-4 py-3 text-foreground no-underline hover:bg-soft",
                      !n.read && "bg-[#fffaf6]",
                    )}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) void mark(n.id);
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <em className="text-[10px] font-semibold tracking-wide text-muted not-italic uppercase">
                        {KIND_LABEL[n.kind]}
                      </em>
                      <time className="font-mono text-[10px] text-muted">
                        {formatTxTime(n.createdAt)}
                      </time>
                    </span>
                    <span className="mt-1 flex items-start gap-2">
                      {!n.read ? (
                        <i className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      ) : (
                        <i className="mt-1.5 size-1.5 shrink-0" />
                      )}
                      <span>
                        <strong className="block text-[13px] font-semibold">
                          {n.title}
                        </strong>
                        <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                          {n.body}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
