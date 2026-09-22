import type { Metadata } from "next";
import { Settings } from "@/components/screens/Settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <Settings />;
}
