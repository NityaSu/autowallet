import type { Metadata } from "next";
import { Wallets } from "@/components/screens/Wallets";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return <Wallets />;
}
