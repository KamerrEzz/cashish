import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep soft-nav RSC payloads in the Client Router Cache so revisiting
    // /app sections does not refetch + flash loading every click.
    // Mutations still call revalidatePath and bust the cache.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
