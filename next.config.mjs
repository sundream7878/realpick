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
  
  // 마케팅 관련 API 라우트 빌드 제외 (Netlify 배포 시)
  webpack: (config, { isServer, dev }) => {
    // 프로덕션 빌드 시에만 적용 (개발 모드는 정상 작동)
    if (isServer && !dev) {
      config.externals = config.externals || [];
      
      // 마케팅 관련 라우트 제외
      const originalExternals = config.externals;
      config.externals = [
        ...originalExternals,
        // 마케팅 API 라우트 무시
        (context, request, callback) => {
          if (request.includes('app/api/admin/marketer')) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    
    return config;
  },
}

export default withPWA(nextConfig);