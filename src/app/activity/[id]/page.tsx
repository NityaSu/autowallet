import { Receipt } from "@/components/screens/Receipt";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Receipt transferId={id} />;
}
