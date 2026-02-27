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

// 미션 생성 API (메인 Next.js 서버로 프록시)
app.post('/api/missions/create', async (req, res) => {
  const targetBase = process.env.MAIN_APP_URL || 'http://localhost:3000';
  const targetUrl = `${targetBase}/api/missions/create`;
  try {
    console.log('[Proxy] /api/missions/create ->', targetUrl);
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error('[Proxy /api/missions/create] 실패:', err);
    res.status(500).json({
      success: false,
      error: err?.message || '미션 생성 프록시 실패',
    });
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
app.get('/api/admin/ai-missions/list', async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : 'PENDING';
    const db = admin.firestore();
    const snapshot = await db.collection('t_marketing_ai_missions')
      .where('status', '==', status)
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

// 영상 제목, 채널명, 설명에서 프로그램 키워드 추출 (백엔드용)
function extractShowKeyword(title: string, channelName?: string, description?: string): string | undefined {
  const text = `${title} ${channelName || ''} ${description || ''}`.toLowerCase();
  
  // 실제 시스템 ID와 매칭되도록 수정
  const keywords = [
    { patterns: ['합숙맞선', '합숙 맞선'], result: 'habsuk-matseon' },
    { patterns: ['쇼미더머니', 'show me the money', 'smtm', '쇼미'], result: 'show-me-the-money-12' },
    { patterns: ['골때녀', '골때리는 그녀', '골때리는그녀', 'goal girls', '골때리는 그녀들', 'fc탑걸', '발라드림', '액셔니스타', '구척장신', '개벤져스', '월드클라쓰'], result: 'goal-girls-8' },
    { patterns: ['나솔사계', '나는 솔로 그 후', '사랑은 계속된다'], result: 'nasolsagye' },
    { patterns: ['나는솔로', '나는 솔로', 'i am solo', '나솔'], result: 'nasolo' },
    { patterns: ['환승연애', '환연'], result: 'hwanseung4' },
    { patterns: ['돌싱글즈', '돌싱'], result: 'dolsingles6' },
    { patterns: ['솔로지옥'], result: 'solojihuk5' },
    { patterns: ['끝사랑'], result: 'kkeut-sarang' },
    { patterns: ['연애남매'], result: 'yeonae-nammae' },
    { patterns: ['최강야구', '최강 몬스터즈', '최강몬스터즈'], result: 'choegang-yagu-2025' },
    { patterns: ['강철부대'], result: 'steel-troops-w' },
    { patterns: ['피의게임', '피의 게임'], result: 'blood-game3' },
    { patterns: ['대학전쟁'], result: 'univ-war2' },
    { patterns: ['흑백요리사'], result: 'culinary-class-wars2' },
    { patterns: ['뭉쳐야찬다', '뭉쳐야 찬다'], result: 'kick-together3' },
    { patterns: ['무쇠소녀단'], result: 'iron-girls' },
    { patterns: ['노엑싯게임룸', '노엑싯'], result: 'no-exit-gameroom' },
    { patterns: ['미스터트롯', '미스터 트롯'], result: 'mr-trot3' },
    { patterns: ['미스트롯'], result: 'mistrot4' },
    { patterns: ['현역가왕'], result: 'active-king2' },
    { patterns: ['프로젝트7', 'project 7'], result: 'project7' },
    { patterns: ['유니버스리그', '유니버스 리그'], result: 'universe-league' },
    { patterns: ['싱어게인'], result: 'sing-again' },
    { patterns: ['랩퍼블릭', '랩:퍼블릭'], result: 'rap-public' },
  ];
  
  for (const { patterns, result } of keywords) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) return result;
    }
  }
  return undefined;
}

// showId 일괄 수정 API (마케팅 봇 백엔드용)
app.post('/api/admin/ai-missions/fix-show-ids', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('t_marketing_ai_missions')
      .where('status', '==', 'PENDING')
      .get();
    
    if (snapshot.empty) {
      return res.json({ success: true, message: "수정할 미션이 없습니다.", updated: 0 });
    }
    
    let updatedCount = 0;
    const updates = [];
    
    // lib/constants/shows.ts의 로직을 백엔드에서 직접 구현하거나 
    // 백엔드 프로젝트 내에 해당 상수를 복사해서 사용해야 함
    // 여기서는 정확한 카테고리 매핑 로직 사용
    const showIdToCategory: Record<string, string> = {
      // LOVE (로맨스)
      'nasolo': 'LOVE', 
      'nasolsagye': 'LOVE', 
      'dolsingles6': 'LOVE', 
      'solojihuk5': 'LOVE', 
      'hwanseung4': 'LOVE',
      'kkeut-sarang': 'LOVE',
      'yeonae-nammae': 'LOVE',
      'habsuk-matseon': 'LOVE',
      
      // VICTORY (서바이벌)
      'choegang-yagu-2025': 'VICTORY', 
      'goal-girls-8': 'VICTORY', 
      'steel-troops-w': 'VICTORY', 
      'blood-game3': 'VICTORY',
      'univ-war2': 'VICTORY',
      'culinary-class-wars2': 'VICTORY',
      'kick-together3': 'VICTORY',
      'iron-girls': 'VICTORY',
      'no-exit-gameroom': 'VICTORY',
      
      // STAR (오디션)
      'mr-trot3': 'STAR', 
      'mistrot4': 'STAR', 
      'active-king2': 'STAR', 
      'project7': 'STAR', 
      'universe-league': 'STAR',
      'show-me-the-money-12': 'STAR',
      'sing-again': 'STAR',
      'rap-public': 'STAR'
    };

    for (const doc of snapshot.docs) {
      const mission = doc.data();
      const videoTitle = mission.sourceVideo?.title || mission.title || '';
      const channelName = mission.sourceVideo?.channelName || '';
      const description = mission.sourceVideo?.description || mission.description || '';
      
      const newShowId = extractShowKeyword(videoTitle, channelName, description);
      
      if (newShowId) {
        const newCategory = showIdToCategory[newShowId] || 'LOVE';
        
        // showId가 바뀌었거나, showId는 같은데 카테고리가 잘못된 경우 모두 업데이트
        if (newShowId !== mission.showId || newCategory !== mission.category) {
          updates.push({ id: doc.id, showId: newShowId, category: newCategory });
        }
      }
    }
    
    const batch = db.batch();
    for (const update of updates) {
      batch.update(db.collection('t_marketing_ai_missions').doc(update.id), {
        showId: update.showId,
        category: update.category,
        updatedAt: new Date().toISOString()
      });
      updatedCount++;
    }
    
    if (updatedCount > 0) await batch.commit();
    
    res.json({ success: true, message: `총 ${updatedCount}개의 미션 정보를 수정했습니다.`, updated: updatedCount });
  } catch (err: any) {
    console.error('[fix-show-ids]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 미션 전체 삭제 API (t_marketing_ai_missions 컬렉션 비우기)
app.post('/api/admin/ai-missions/clear', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('t_marketing_ai_missions')
      .where('status', '==', 'PENDING')
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, message: "삭제할 대기 중인 미션이 없습니다.", deleted: 0 });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({ 
      success: true, 
      message: `총 ${snapshot.size}개의 대기 중인 미션을 삭제했습니다.`,
      deleted: snapshot.size 
    });
  } catch (err: any) {
    console.error('[AI 미션 전체 삭제]', err);
    res.status(500).json({ success: false, error: err?.message || '삭제 실패' });
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
  const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3000';
  const botUrl = process.env.MARKETING_BOT_URL || `http://localhost:${PORT}`;
  
  // 매일 새벽 6시에 실행되도록 설정합니다.
  cron.schedule('0 6 * * *', async () => {
    console.log('[자동 실행] 새벽 6시 자동 미션 생성 시작...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1분 타임아웃

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

      // run-daily-auto-mission 호출 (작업이 오래 걸릴 수 있으므로 타임아웃을 10분으로 설정)
      const botController = new AbortController();
      const botTimeoutId = setTimeout(() => botController.abort(), 600000); // 10분

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
      if (e.name === 'AbortError') {
        console.error('[6시 자동] 실패: 작업 시간 초과 (10분 초과)');
      } else {
        console.error('[6시 자동] 실패:', e);
      }
    }
  });
  console.log('⏰ 매일 새벽 6시(KST) 자동 미션 생성 스케줄 등록됨');
}

// KST 기준 현재 시각 (요일 0-6, 시, 분)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function getKstNow() {
  const kstMs = Date.now() + KST_OFFSET_MS;
  const d = new Date(kstMs);
  return { day: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

// 커플매칭 에피소드 자동 오픈 스케줄러 (매 시간 정각, KST 기준 방송일·방송시간 지나면 다음 회차 오픈)
function startMatchMissionEpisodeScheduler() {
  cron.schedule('0 * * * *', async () => {
    console.log('[에피소드 스케줄러] 커플매칭 다음 회차 자동 오픈 체크 시작...');
    try {
      const db = admin.firestore();
      const kst = getKstNow();
      const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

      const snapshot = await db.collection('missions2').where('status', '==', 'open').get();
      if (snapshot.empty) {
        console.log('[에피소드 스케줄러] 진행 중인 커플매칭 미션 없음');
        return;
      }

      for (const doc of snapshot.docs) {
        const mission = doc.data();
        const { broadcastDay, broadcastTime, episodeStatuses = {} } = mission;
        if (!broadcastDay || !broadcastTime) continue;

        const targetDayNum = dayMap[broadcastDay];
        if (targetDayNum === undefined) continue;
        if (kst.day !== targetDayNum) continue;

        const [hour, minute] = broadcastTime.split(':').map(Number);
        if (kst.hour < hour || (kst.hour === hour && kst.minute < minute)) continue;

        const episodeNos = Object.keys(episodeStatuses).map(Number).sort((a, b) => b - a);
        const latestEp = episodeNos[0] ?? 0;
        const nextEp = latestEp + 1;
        if (episodeStatuses[nextEp] !== undefined) continue;

        await db.collection('missions2').doc(doc.id).update({
          [`episodeStatuses.${nextEp}`]: 'open',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[에피소드 스케줄러] 미션 ${doc.id}: ${nextEp}회차 자동 오픈`);
      }
    } catch (err) {
      console.error('[에피소드 스케줄러] 에러:', err);
    }
  });
  console.log('⏰ 커플매칭 에피소드 자동 오픈 스케줄러 등록됨 (매 시간, KST 기준)');
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
  // 2분 뒤에 테스트 실행 (지난 10시간 영상 수집) - 테스트 재시작용 주석
  /*
  setTimeout(async () => {
    console.log('[테스트 실행] 2분 경과, 자동 미션 생성 시작 (지난 10시간 영상 대상)...');
    try {
      const mainAppUrl = process.env.MAIN_APP_URL || 'http://localhost:3000';
      const botUrl = process.env.MARKETING_BOT_URL || `http://localhost:${PORT}`;
      
      const kwRes = await fetch(`${mainAppUrl.replace(/\/$/, '')}/api/public/active-show-keywords`);
      const { keywords = [] } = await kwRes.json().catch(() => ({}));
      
      if (keywords.length > 0) {
        await fetch(`${botUrl.replace(/\/$/, '')}/api/youtube/run-daily-auto-mission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords, baseUrl: mainAppUrl, hoursBack: 10 })
        });
        console.log('[테스트 실행] 자동 미션 생성 요청 완료');
      }
    } catch (e) {
      console.error('[테스트 실행] 실패:', e);
    }
  }, 120000);
  */

  await checkFirebase();
  startDailyAutoMissionSchedule();
  startMatchMissionEpisodeScheduler();
});

export default app;
