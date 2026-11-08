import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // CV uploads are a few hundred KB at most; keep the limit tight.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
