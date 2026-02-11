import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 로컬 접근 체크
const isLocal = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

if (!isLocal) {
  alert('⚠️ 보안 경고: 이 대시보드는 로컬에서만 접근 가능합니다.');
  document.body.innerHTML = '<h1 style="text-align:center; margin-top:50px;">접근 거부</h1>';
  throw new Error('로컬에서만 접근 가능합니다.');
}

// 프로덕션 빌드 차단
if (import.meta.env.PROD) {
  console.error('❌ 이 대시보드는 프로덕션 빌드를 지원하지 않습니다.');
  alert('⚠️ 이 대시보드는 개발 모드(npm run dev)로만 실행할 수 있습니다.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
