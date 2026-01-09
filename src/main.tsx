import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { setupGlobalErrorHandlers } from './lib/errorLogger'
import { registerAllRelicEffects } from './core/effects'

// 전역 에러 핸들러 등록
setupGlobalErrorHandlers()

// 상징 효과 레지스트리 초기화
registerAllRelicEffects()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
