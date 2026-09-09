import { RequestPay } from "@/components/screens/RequestPay";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestPay requestId={id} />;
}
