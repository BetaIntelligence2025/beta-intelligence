import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb'
    },
  },
  // Configurações de API
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '8mb'
    }
  },
  // Configurações de servidor
  serverRuntimeConfig: {
    // Aumentar timeout para 30 segundos
    apiTimeout: 30000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS, PUT, DELETE",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
