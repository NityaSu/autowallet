import type { Metadata } from "next";
import { Activity } from "@/components/screens/Activity";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return <Activity />;
}
