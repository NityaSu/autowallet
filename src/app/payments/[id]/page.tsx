import { AgentPaymentReceipt } from "@/components/screens/AgentPaymentReceipt";

export default async function AgentPaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentPaymentReceipt paymentId={id} />;
}
