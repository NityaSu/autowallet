import { Suspense } from "react";
import { Send } from "@/components/screens/Send";

export default function SendPage() {
  return (
    <Suspense>
      <Send />
    </Suspense>
  );
}
