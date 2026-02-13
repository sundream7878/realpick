import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // Remotion/esbuild는 Node 전용이라 Webpack이 .d.ts를 파싱하지 않도록 externals 처리
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@remotion/bundler': 'commonjs @remotion/bundler',
        '@remotion/renderer': 'commonjs @remotion/renderer',
        esbuild: 'commonjs esbuild',
      });
    }

    return config;
  },
}

export default withPWA(nextConfig);