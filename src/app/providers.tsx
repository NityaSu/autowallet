"use client";

import { AppShell } from "@/components/AppShell";
import { WalletProvider } from "@/context/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
