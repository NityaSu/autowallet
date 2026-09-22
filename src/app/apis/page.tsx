import type { Metadata } from "next";
import { Apis } from "@/components/screens/Apis";

export const metadata: Metadata = { title: "API Endpoints" };

export default function ApisPage() {
  return <Apis />;
}
