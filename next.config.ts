import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "bcryptjs", "@electric-sql/pglite"],
};

export default nextConfig;
