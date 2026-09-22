import type { Metadata } from "next";
import { RequestPay } from "@/components/screens/RequestPay";

export const metadata: Metadata = { title: "Request" };

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestPay requestId={id} />;
}
