import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 로컬 네트워크(iPad 등)에서 접속 가능하도록 모든 인터페이스 바인드
    port: 5173,
  },
})
