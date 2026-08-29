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
import { useWallet } from "@/context/WalletProvider";
import { money } from "@/lib/money";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/send", label: "Send", icon: ArrowLeftRight },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/policies", label: "Policies", icon: Shield },
  { href: "/apis", label: "API Endpoints", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isOn(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { account } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = account.owner
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="aw">
      <aside
        className={`aw-side${menuOpen ? " is-open" : ""}`}
        aria-label="App"
      >
        <Link
          href="/"
          className="aw-brand"
          onClick={() => setMenuOpen(false)}
        >
          <CloudMark width={38} height={25} />
          <span>
            <strong>AutoWallet</strong>
            <em>Virtual wallets</em>
          </span>
        </Link>

        <nav className="aw-side-nav">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`aw-side-link${isOn(link.href, path) ? " is-on" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={16} aria-hidden />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="aw-plan">
          <span>Your Plan</span>
          <b>Developer</b>
          <div className="aw-plan-bar">
            <i />
          </div>
          <p>
            {money(account.balanceUsd)} / $500.00 limit
          </p>
          <button type="button" className="aw-btn">
            Upgrade
          </button>
        </div>
        <div className="aw-side-foot">
          <span>Docs</span>
          <span>Help</span>
          <span>API Reference</span>
        </div>
      </aside>

      <div className="aw-body">
        <header className="aw-top">
          <button
            type="button"
            className="aw-burger"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Menu
          </button>
          <label className="aw-search">
            <Search size={15} />
            <input type="search" placeholder="Search anything..." />
            <kbd>⌘K</kbd>
          </label>
          <div className="aw-top-right">
            <button type="button" className="aw-bell" aria-label="Notifications">
              <Bell size={18} />
              <i>3</i>
            </button>
            <Link href="/settings" className="aw-user">
              <span className="aw-user-av">{initials}</span>
              <span>
                <strong>{account.owner}</strong>
                <em>Owner</em>
              </span>
            </Link>
          </div>
        </header>
        <main className="aw-main">{children}</main>
      </div>
    </div>
  );
}
