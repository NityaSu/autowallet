import type { Metadata } from "next";
import { Overview } from "@/components/screens/Overview";

export const metadata: Metadata = {
  title: { absolute: "Autowallet | Overview" },
};

export default function Home() {
  return <Overview />;
}
