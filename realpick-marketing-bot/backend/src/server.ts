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

// 환경 변수 로드 (.env.local)
const envPath = path.resolve(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

// Firebase Admin 초기화
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

// /api/public/shows: 대시보드 프로그램 선택용 (다른 /api 라우트보다 먼저 등록)
app.get('/api/public/shows', async (req, res) => {
  // #region agent log
  console.log('[Public Shows API] GET /api/public/shows requested');
  // #endregion
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

// 전체 미션 목록 (missions1 + missions2, SNS Viral 등에서 사용)
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
  } catch (err) {
    console.error('[missions/all]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', missions: [] });
  }
});

// 수집된 채널 목록 (dealers, lastCrawledAt 기준)
app.get('/api/admin/dealers/videos', async (_req, res) => {
  try {
    const db = admin.firestore();
    let snapshot;
    try {
      snapshot = await db.collection('dealers').orderBy('lastCrawledAt', 'desc').limit(50).get();
    } catch (orderErr: any) {
      if (orderErr?.code === 9 || orderErr?.message?.includes('index')) {
        snapshot = await db.collection('dealers').limit(50).get();
      } else throw orderErr;
    }
    const channels = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, channels, count: channels.length });
  } catch (err: any) {
    console.error('[dealers/videos]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', channels: [] });
  }
});

// 딜러 목록 (Firestore dealers 컬렉션)
app.get('/api/admin/dealers/list', async (_req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('dealers').limit(100).get();
    const dealers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    dealers.sort((a: any, b: any) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
    res.json({ success: true, dealers, count: dealers.length });
  } catch (err: any) {
    console.error('[dealers/list]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', dealers: [] });
  }
});

// 봇 목록 (users 컬렉션에서 isBot === true)
app.get('/api/admin/marketer/bots/list', async (_req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('users').where('isBot', '==', true).limit(100).get();
    const bots = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nickname: data.nickname || '익명',
          role: data.role || 'PICKER',
          email: data.email || null,
          createdAt: data.createdAt,
          points: data.points || 0,
          _timestamp: data.createdAt?._seconds ?? 0,
        };
      })
      .sort((a, b) => b._timestamp - a._timestamp);
    res.json({ success: true, bots, count: bots.length });
  } catch (err: any) {
    console.error('[marketer/bots/list]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', bots: [], count: 0 });
  }
});

// 딜러 수집 영상 목록 (videos 또는 t_marketing_videos)
app.get('/api/admin/dealers/videos-list', async (_req, res) => {
  try {
    const db = admin.firestore();
    let snapshot;
    try {
      snapshot = await db.collection('videos').orderBy('collectedAt', 'desc').limit(100).get();
    } catch (orderErr: any) {
      if (orderErr?.code === 9 || orderErr?.message?.includes('index')) {
        snapshot = await db.collection('videos').limit(100).get();
      } else throw orderErr;
    }
    const videos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, videos, count: videos.length });
  } catch (err: any) {
    console.error('[dealers/videos-list]', err);
    res.status(500).json({ success: false, error: err?.message || '조회 실패', videos: [] });
  }
});

// SNS 바이럴 영상 렌더 요청을 메인 Next.js 서버로 프록시
app.post('/api/video/render', async (req, res) => {
  const targetBase = process.env.VITE_API_URL || 'http://localhost:3002';
  const targetUrl = `${targetBase}/api/video/render`;
  try {
    console.log('[Proxy] /api/video/render ->', targetUrl);
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    // 가능하면 JSON으로 그대로 전달
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      // JSON이 아니면 원문 그대로 전달
      res.send(text);
    }
  } catch (err: any) {
    console.error('[Proxy /api/video/render] 실패:', err);
    res.status(500).json({
      success: false,
      error: err?.message || '영상 렌더 프록시 실패',
    });
  }
});

// 승인 대기 AI 미션 목록 (Firestore t_marketing_ai_missions)
app.get('/api/admin/ai-missions/list', async (_req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('t_marketing_ai_missions')
      .where('status', '==', 'PENDING')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    const missions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, count: missions.length, missions });
  } catch (err: any) {
    console.error('[AI 미션 목록]', err);
    res.status(500).json({ success: false, error: err?.message || '목록 조회 실패', missions: [] });
  }
});

// 라우트 (동적 import)
const loadRoutes = async () => {
  const youtubeRouter = (await import('./routes/youtube.js')).default;
  const communityRouter = (await import('./routes/community.js')).default;
  
  app.use('/api/youtube', youtubeRouter);
  app.use('/api/community', communityRouter);
};

loadRoutes().catch(console.error);

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

// 매일 6시(KST) 자동 미션 생성 (로컬 스케줄러) — PC가 한국 시간이면 6시에 실행
function startDailyAutoMissionSchedule() {
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3002';
  const botUrl = process.env.MARKETING_BOT_URL || `http://localhost:${PORT}`;
  cron.schedule('0 6 * * *', async () => {
    console.log('[6시 자동] 매일 6시 자동 미션 생성 시작...');
    try {
      const kwRes = await fetch(`${mainAppUrl.replace(/\/$/, '')}/api/public/active-show-keywords`);
      const { keywords = [] } = await kwRes.json().catch(() => ({}));
      if (keywords.length === 0) {
        console.log('[6시 자동] 활성 프로그램 없음, 스킵');
        return;
      }
      const res = await fetch(`${botUrl.replace(/\/$/, '')}/api/youtube/run-daily-auto-mission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, baseUrl: mainAppUrl }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[6시 자동] 완료:', data.totalCollected ?? 0, '수집 →', data.totalScreened ?? 0, '선정 →', data.totalMissionsCreated ?? 0, '미션');
    } catch (e) {
      console.error('[6시 자동] 실패:', e);
    }
  });
  console.log('⏰ 매일 6시(KST) 자동 미션 생성 스케줄 등록됨 (로컬 시간 6시)');
}

// 서버 시작
app.listen(PORT, async () => {
  console.log(`\n🚀 마케팅 봇 백엔드 서버 시작`);
  console.log(`📍 주소: http://localhost:${PORT}`);
  console.log(`🔒 로컬 전용 모드`);
  console.log(`\n사용 가능한 엔드포인트:`);
  console.log(`  - GET  http://localhost:${PORT}/`);
  console.log(`  - GET  http://localhost:${PORT}/api/health`);
  console.log(`\n⚠️  주의: 이 서버는 로컬에서만 실행되어야 합니다.\n`);
  await checkFirebase();
  startDailyAutoMissionSchedule();
});

export default app;
