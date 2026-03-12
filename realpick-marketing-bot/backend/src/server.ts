import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import admin from 'firebase-admin';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. 환경 변수 로드 (.env.local)
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

// 2. Firebase Admin 초기화 (라우트 임포트 전 반드시 완료되어야 함)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error('❌ Firebase 환경 변수 누락: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 확인. .env.local 경로:', envPath);
  }
  
  const privateKey = privateKeyRaw?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('✅ Firebase Admin 초기화 완료 (projectId:', projectId, ')');
}

// 3. 라우트 동적 임포트 (Firebase 초기화 이후에 실행되도록 보장)
// 상단 import 문은 호이스팅되어 초기화 전에 실행되므로, 반드시 await import를 사용해야 함
const youtubeRouter = (await import('./routes/youtube.ts')).default;
const communityRouter = (await import('./routes/community.ts')).default;
const naverCafeRouter = (await import('./routes/naverCafe.ts')).default;
const autoCommentRouter = (await import('./routes/autoComment.ts')).default;

// Firebase 연결 검증 (서버 시작 시 한 번)
const checkFirebase = async () => {
  try {
    const db = admin.firestore();
    await db.collection('admin_settings').doc('SHOW_STATUSES').get();
    console.log('✅ Firestore 연결 확인됨');
  } catch (err: any) {
    console.error('❌ Firestore 연결 실패:', err?.message || err);
  }
};

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

// 라우트 등록
app.use('/api/youtube', youtubeRouter);
app.use('/api/community', communityRouter);
app.use('/api/admin/marketer/naver-cafe', naverCafeRouter);
app.use('/api/auto-comment', autoCommentRouter);

// /api/public/shows: 대시보드 프로그램 선택용
app.get('/api/public/shows', async (req, res) => {
  console.log('[Public Shows API] GET /api/public/shows requested');
  const noCache = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  try {
    const db = admin.firestore();
    const settingsRef = db.collection('admin_settings');
    const [statusDoc, visibilityDoc, customShowsDoc] = await Promise.all([
      settingsRef.doc('SHOW_STATUSES').get(),
      settingsRef.doc('SHOW_VISIBILITY').get(),
      settingsRef.doc('CUSTOM_SHOWS').get(),
    ]);
    let statuses = statusDoc.exists ? statusDoc.data()?.value : {};
    let visibility = visibilityDoc.exists ? visibilityDoc.data()?.value : {};
    let customShows = customShowsDoc.exists ? customShowsDoc.data()?.value : [];
    try {
      if (typeof statuses === 'string' && (String(statuses).startsWith('{') || String(statuses).startsWith('['))) statuses = JSON.parse(statuses);
      if (typeof visibility === 'string' && (String(visibility).startsWith('{') || String(visibility).startsWith('['))) visibility = JSON.parse(visibility);
      if (typeof customShows === 'string' && (String(customShows).startsWith('{') || String(customShows).startsWith('['))) customShows = JSON.parse(customShows);
    } catch (_) {}
    if (!Array.isArray(customShows)) customShows = [];
    if (typeof statuses !== 'object' || statuses === null) statuses = {};
    if (typeof visibility !== 'object' || visibility === null) visibility = {};
    res.set(noCache).json({ statuses: statuses || {}, visibility: visibility || {}, customShows: customShows || [] });
  } catch (err: any) {
    console.error('[Public Shows API]', err);
    res.set(noCache).status(500).json({
      error: err?.message || '서버 오류',
      statuses: {},
      visibility: {},
      customShows: [],
    });
  }
});

// 전체 미션 목록
app.get('/api/missions/all', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit), 10) || 50, 200);
    const status = req.query.status ? String(req.query.status) : '';
    const db = admin.firestore();
    let missions1 = [];
    let missions2 = [];
    try {
      const [snap1, snap2] = await Promise.all([
        db.collection('missions1').orderBy('createdAt', 'desc').limit(limit).get(),
        db.collection('missions2').orderBy('createdAt', 'desc').limit(limit).get(),
      ]);
      missions1 = snap1.docs.map((d) => ({ id: d.id, ...d.data(), __table: 'missions1' }));
      missions2 = snap2.docs.map((d) => ({ id: d.id, ...d.data(), __table: 'missions2' }));
    } catch (orderErr) {
      const [snap1, snap2] = await Promise.all([
        db.collection('missions1').limit(limit).get(),
        db.collection('missions2').limit(limit).get(),
      ]);
      missions1 = snap1.docs.map((d) => ({ id: d.id, ...d.data(), __table: 'missions1' }));
      missions2 = snap2.docs.map((d) => ({ id: d.id, ...d.data(), __table: 'missions2' }));
    }
    const all = [...missions1, ...missions2].sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.createdAt?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    }).slice(0, limit);
    const missions = status ? all.filter((m) => m.status === status) : all;
    res.json({ success: true, missions, count: missions.length });
  } catch (err: any) {
    console.error('[missions/all]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', missions: [] });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: '리얼픽 마케팅 봇 백엔드 서버',
    version: '1.0.0',
    endpoints: [
      'GET  /api/health',
      'GET  /api/public/shows',
      'POST /api/youtube/crawl',
      'POST /api/youtube/analyze',
      'POST /api/community/crawl',
      'GET  /api/community/posts',
      'DELETE /api/community/posts/:id'
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

// 매일 6시(KST) 자동 미션 생성
function startDailyAutoMissionSchedule() {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3000';
  const botUrl = process.env.MARKETING_BOT_URL || `http://localhost:${PORT}`;
  
  cron.schedule('0 6 * * *', async () => {
    console.log('[자동 실행] 새벽 6시 자동 미션 생성 시작...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const kwRes = await fetch(`${mainAppUrl.replace(/\/$/, '')}/api/public/active-show-keywords`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const { keywords = [] } = await kwRes.json().catch(() => ({}));
      if (keywords.length === 0) {
        console.log('[6시 자동] 활성 프로그램 없음, 스킵');
        return;
      }
      
      console.log(`[6시 자동] 키워드 수집 완료: ${keywords.join(', ')}`);

      const botController = new AbortController();
      const botTimeoutId = setTimeout(() => botController.abort(), 600000);

      const res = await fetch(`${botUrl.replace(/\/$/, '')}/api/youtube/run-daily-auto-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, baseUrl: mainAppUrl, hoursBack: 24 }),
        signal: botController.signal
      });
      clearTimeout(botTimeoutId);
      
      const data = await res.json().catch(() => ({}));
      console.log('[6시 자동] 완료:', data.totalCollected ?? 0, '개 영상 수집 →', data.totalMissionsCreated ?? 0, '개 미션 생성 완료');
    } catch (e: any) {
      console.error('[6시 자동] 실패:', e);
    }
  });
  console.log('⏰ 매일 새벽 6시(KST) 자동 미션 생성 스케줄 등록됨');
}

// 서버 시작
app.listen(PORT, async () => {
  console.log(`\n🚀 마케팅 봇 백엔드 서버 시작`);
  console.log(`📍 주소: http://localhost:${PORT}`);
  console.log(`🔒 로컬 전용 모드`);
  
  await checkFirebase();
  startDailyAutoMissionSchedule();
});

export default app;
