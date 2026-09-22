import type { Metadata } from "next";
import { Receipt } from "@/components/screens/Receipt";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Receipt transferId={id} />;
}
