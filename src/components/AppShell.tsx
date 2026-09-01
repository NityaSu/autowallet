"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Bot,
  Globe,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { CloudMark } from "@/components/CloudMark";
import { DemoBanner } from "@/components/DemoBanner";
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
  const { account, you } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="grid min-h-dvh grid-cols-1 bg-background text-foreground lg:grid-cols-[248px_1fr]">
      <aside
        className={cx(
          "flex-col border-r border-line bg-white px-3.5 pb-4 pt-5",
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
            Your Plan
          </span>
          <b className="mt-1 mb-2.5 block text-brand">Developer</b>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eceff3]">
            <i className="block h-full w-[49.6%] bg-brand" />
          </div>
          <p className="mt-2 mb-2.5 text-xs text-muted">
            {money(you.balanceUsd)} P2P · demo
          </p>
          <button type="button" className={cx(tw.btnAccent, "w-full")}>
            Upgrade
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2.5 px-1 text-[11px] text-muted">
          <span>Docs</span>
          <span>Help</span>
          <span>API Reference</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-white px-6">
          <button
            type="button"
            className="inline-flex h-[34px] cursor-pointer items-center rounded-lg border border-line bg-white px-3 text-[13px] text-foreground lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
          <label className="mx-auto hidden h-10 max-w-[420px] flex-1 items-center gap-2 rounded-xl bg-background px-3 text-muted lg:flex">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search anything..."
              className="flex-1 border-0 bg-transparent font-sans text-foreground outline-none"
            />
            <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-mono text-[11px]">
              ⌘K
            </kbd>
          </label>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              className="relative grid size-10 cursor-pointer place-items-center rounded-xl border-0 bg-background text-foreground"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-normal text-white">
                3
              </span>
            </button>
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 text-foreground no-underline"
            >
              <span className="grid size-9 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {initials}
              </span>
              <span>
                <strong className="block text-[13px] font-semibold">{you.name}</strong>
                <em className="block font-mono text-[11px] not-italic text-muted">
                  {you.handle}
                </em>
              </span>
            </Link>
            <button type="button" className={tw.btn} onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>
        <main className="min-w-0 px-4 py-5 pb-10 font-sans lg:px-7 lg:py-6 lg:pb-12">
          <DemoBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
