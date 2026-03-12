import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components/c-ui': path.resolve(__dirname, './src/components/ui'),
      '@/hooks/h-toast': path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true,
    // 로컬에서만 접근 가능
    https: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // 프로덕션 빌드 차단
    outDir: 'dist-blocked',
  },
  define: {
    // 프로덕션 빌드 시 에러 발생
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})
