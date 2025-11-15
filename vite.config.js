import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 로컬 실행을 위한 상대 경로 설정
  server: {
    host: true, // 네트워크의 모든 디바이스에서 접근 가능
    port: 5173,
  },
})
