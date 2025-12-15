import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 로컬 네트워크(iPad 등)에서 접속 가능하도록 모든 인터페이스 바인드
    port: 80,        // 포트 없이 http://<PC_IP>/ 로 접근 가능
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 관련 라이브러리 분리
          'vendor-react': ['react', 'react-dom'],
          // Zustand 상태 관리
          'vendor-state': ['zustand'],
          // 전투 시스템 분리
          'battle': [
            './src/components/battle/battleData.js',
            './src/lib/speedQueue.js',
            './src/lib/battleResolver.js',
          ],
          // 던전 시스템 분리
          'dungeon': [
            './src/data/dungeonNodes.js',
            './src/lib/dungeonChoices.js',
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
