import type { Metadata } from "next";
import { AgentPaymentReceipt } from "@/components/screens/AgentPaymentReceipt";

export const metadata: Metadata = { title: "Receipt" };

export default async function AgentPaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentPaymentReceipt paymentId={id} />;
}
