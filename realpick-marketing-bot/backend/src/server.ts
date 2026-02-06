import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경 변수 로드 (.env.local)
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로컬 접근만 허용하는 미들웨어
app.use((req, res, next) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  const isLocal = 
    clientIp === '127.0.0.1' || 
    clientIp === '::1' || 
    clientIp === '::ffff:127.0.0.1' ||
    clientIp?.startsWith('192.168.') ||
    clientIp?.startsWith('10.');
  
  if (!isLocal && process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ 
      success: false, 
      error: '로컬에서만 접근 가능합니다.' 
    });
  }
  
  next();
});

// 라우트 (동적 import로 나중에 추가)
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '리얼픽 마케팅 봇 백엔드 서버',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health',
      'POST /api/youtube/crawl',
      'POST /api/community/crawl',
      'POST /api/naver-cafe/crawl',
      'POST /api/youtube/analyze',
      'GET  /api/posts',
      'DELETE /api/posts/:id'
    ]
  });
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || '서버 오류가 발생했습니다.' 
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`\n🚀 마케팅 봇 백엔드 서버 시작`);
  console.log(`📍 주소: http://localhost:${PORT}`);
  console.log(`🔒 로컬 전용 모드`);
  console.log(`\n사용 가능한 엔드포인트:`);
  console.log(`  - GET  http://localhost:${PORT}/`);
  console.log(`  - GET  http://localhost:${PORT}/api/health`);
  console.log(`\n⚠️  주의: 이 서버는 로컬에서만 실행되어야 합니다.\n`);
});

export default app;
