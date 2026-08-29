"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { WalletProvider } from "@/context/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/login") return <>{children}</>;
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
