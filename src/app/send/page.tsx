import type { Metadata } from "next";
import { Suspense } from "react";
import { Send } from "@/components/screens/Send";

export const metadata: Metadata = { title: "Send" };

export default function SendPage() {
  return (
    <Suspense>
      <Send />
    </Suspense>
  );
}
