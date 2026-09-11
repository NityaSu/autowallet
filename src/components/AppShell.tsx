"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Bot,
  Globe,
  LayoutDashboard,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CloudMark } from "@/components/CloudMark";
import { DemoBanner } from "@/components/DemoBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { ScanPayQr } from "@/components/ScanPayQr";
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";
import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard, inNav: true },
  { href: "/send", label: "Send", icon: ArrowLeftRight, inNav: true },
  { href: "/activity", label: "Activity", icon: Activity, inNav: true },
  { href: "/settings", label: "Settings", icon: Settings, inNav: true },
  { href: "/agents", label: "Agents", icon: Bot, inNav: true },
  { href: "/wallets", label: "Wallets", icon: Wallet, inNav: true },
  { href: "/policies", label: "Policies", icon: Shield, inNav: true },
  { href: "/apis", label: "API Endpoints", icon: Globe, inNav: true },
] as const;

function isOn(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { account, you } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const initials = (you?.name ?? account.owner)
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="grid min-h-svh min-w-0 grid-cols-1 bg-background text-foreground lg:grid-cols-[248px_1fr]">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={cx(
          "w-[248px] flex-col border-r border-line bg-white px-3.5 pt-5 pb-4",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40",
          menuOpen ? "flex" : "hidden lg:flex",
        )}
        aria-label="App"
      >
        <Link
          href="/"
          className={cx(tw.brand, "mx-1.5 mb-[18px]")}
          onClick={() => setMenuOpen(false)}
        >
          <CloudMark width={38} height={25} />
          <span>
            <strong className={tw.brandName}>AutoWallet</strong>
            <em className={tw.brandTag}>Virtual wallets</em>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {links
            .filter((link) => link.inNav)
            .map((link) => {
              const Icon = link.icon;
              const on = isOn(link.href, path);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-[9px] font-sans text-[13.5px] font-medium no-underline",
                    on
                      ? "bg-soft text-brand"
                      : "text-muted hover:bg-soft hover:text-foreground",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={16} aria-hidden />
                  {link.label}
                </Link>
              );
            })}
        </nav>

        <div className="mt-3 rounded-xl border border-line bg-[#fafbfc] p-3">
          <span className="text-[11px] tracking-wider text-muted uppercase">
            Balance
          </span>
          <b className="mt-1 block text-brand">{money(you.balanceUsd)}</b>
          <p className="mt-1 mb-0 text-xs text-muted">{you.handle}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="fixed top-0 right-0 left-0 z-20 border-b border-line bg-white pt-[env(safe-area-inset-top,0px)] lg:sticky lg:left-auto lg:right-auto lg:pt-0">
          <div className="flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-4 sm:px-6">
          <button
            type="button"
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center rounded-lg border border-line bg-white px-3 text-[13px] text-foreground lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-2.5">
            <NotificationBell />
            <ScanPayQr
              variant="icon"
              disabled={Boolean(you.locked)}
              onFound={(handle) =>
                router.push(`/send?to=${encodeURIComponent(handle)}`)
              }
            />
            <Link
              href="/settings"
              className="flex min-w-0 items-center gap-2 rounded-xl py-1 pr-1 pl-1 text-foreground no-underline sm:gap-2.5 sm:pr-2"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden min-w-0 sm:block">
                <strong className="block truncate text-[13px] font-semibold">
                  {you.name}
                </strong>
                <em className="block truncate font-mono text-[11px] not-italic text-muted">
                  {you.handle}
                </em>
              </span>
            </Link>
            <button
              type="button"
              className={cx(tw.btn, "shrink-0")}
              onClick={() => void logout()}
            >
              Log out
            </button>
          </div>
          </div>
        </header>
        <div
          className="h-[calc(4rem+env(safe-area-inset-top,0px))] shrink-0 lg:hidden"
          aria-hidden
        />
        <main className="min-w-0 px-4 py-5 pb-10 font-sans lg:px-7 lg:py-6 lg:pb-12">
          <DemoBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
