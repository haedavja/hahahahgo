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
          // 전투 데이터 분리 (battleData는 크기가 크므로 별도 청크)
          'battle-data': [
            './src/components/battle/battleData.ts',
          ],
          // 전투 유틸리티 분리
          'battle-utils': [
            './src/lib/speedQueue.ts',
            './src/lib/battleResolver.ts',
            './src/lib/etherUtils.ts',
            './src/lib/relicEffects.ts',
          ],
          // 게임 데이터 분리
          'game-data': [
            './src/data/relics.ts',
            './src/data/anomalies.ts',
            './src/data/tokens.ts',
          ],
          // 던전 시스템 분리
          'dungeon': [
            './src/data/dungeonNodes.ts',
            './src/lib/dungeonChoices.ts',
          ],
        },
      },
    },
    // 프로덕션 빌드에서 console.log 제거
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // E2E 테스트(Playwright)는 vitest에서 제외
    exclude: ['e2e/**', 'node_modules/**', '**/dist/**'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    isolate: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.test.{js,ts,tsx}',
        '**/test/**',
        '**/tests/**',
        '**/*.d.ts',
        'src/main.tsx',
        'src/App.tsx',
      ],
      // 커버리지 임계값 - CI에서 실패 조건
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
})
