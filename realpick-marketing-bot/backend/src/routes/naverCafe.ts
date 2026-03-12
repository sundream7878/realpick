import { Router } from 'express';
import admin from 'firebase-admin';
import { runMarketerBridge } from '../services/pythonBridge.js';
import crypto from 'crypto';

const router = Router();
const db = admin.firestore();

function stripUrls(text: string) {
  if (!text) return text;
  let out = text.replace(/https?:\/\/[^\s)"]+/gi, '').trim();
  out = out.replace(/\b(realpick|real-pick)\.com\b/gi, '').trim();
  out = out.replace(/\s{2,}/g, ' ').trim();
  out = out.replace(/[👉➡️]+/g, '').trim();
  out = out.replace(/[\s,.;:!?]+$/g, '').trim();
  return out;
}

function safeDocIdFromPost(post: any) {
  const url = String(post?.url || '').trim();
  const source = String(post?.source || '').trim();
  const title = String(post?.title || '').trim();
  const publishedAt = String(post?.publishedAt || '').trim();
  const seed = url
    ? `url:${url}`
    : `fallback:${source}|${title}|${publishedAt}`;
  return crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 48);
}

const POSTS_COLLECTION = 't_marketing_naver_cafe_posts';
const PROGRESS_COLLECTION = 't_marketing_naver_cafe_progress';

/**
 * GET /api/admin/marketer/naver-cafe/crawl
 * - progressId 있으면 진행상황 반환
 * - 아니면 수집된 게시글 목록 반환
 */
router.get('/crawl', async (req, res) => {
  try {
    const progressId = String(req.query.progressId || '').trim();
    if (progressId) {
      const snap = await db.collection(PROGRESS_COLLECTION).doc(progressId).get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: '진행 상황을 찾을 수 없습니다.' });
      }
      return res.json({ success: true, progress: { id: snap.id, ...(snap.data() || {}) } });
    }

    const snapshot = await db
      .collection(POSTS_COLLECTION)
      .orderBy('publishedAt', 'desc')
      .limit(50)
      .get();
    const posts = snapshot.docs.map((doc) => {
      const data: any = doc.data() || {};
      if (data.suggestedComment) {
        data.suggestedComment = stripUrls(String(data.suggestedComment));
      }
      // Firestore의 실제 문서 ID(해시값)를 id 필드로 사용하도록 보장
      return { ...data, id: doc.id };
    });
    return res.json({ success: true, posts });
  } catch (error: any) {
    console.error('[NaverCafe] GET 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/marketer/naver-cafe/crawl
 * 네이버 카페(맘카페) 크롤링 - progressId 즉시 반환 후 백그라운드 처리
 */
router.post('/crawl', async (req, res) => {
  try {
    const { keywords, limit, selectedShowIds, startDate, endDate } = req.body || {};

    const progressId = `naver_cafe_${Date.now()}`;
    const progressRef = db.collection(PROGRESS_COLLECTION).doc(progressId);
    await progressRef.set({
      status: 'running',
      current: 0,
      total: limit || 10,
      message: '맘카페 이슈 검색 시작...',
      startedAt: new Date().toISOString(),
      progressId,
      logs: [],
    });

    // progressId 즉시 반환 (크롤링은 백그라운드에서 계속)
    res.json({ success: true, progressId });

    // ---- 백그라운드 크롤링 ----
    (async () => {
      try {
        // 로그 업데이트 스로틀
        let lastLogWriteAt = 0;
        const pushLog = async (message: string) => {
          const now = Date.now();
          if (now - lastLogWriteAt < 700) return;
          lastLogWriteAt = now;
          try {
            await progressRef.update({
              message,
              logs: admin.firestore.FieldValue.arrayUnion({
                timestamp: new Date().toISOString(),
                message,
              }),
            });
          } catch (_) {}
        };

        const result: any = await runMarketerBridge('crawl-community', {
          keywords: keywords || '',
          limit: limit || 10,
          selectedShowIds: selectedShowIds || '',
          startDate: startDate || '',
          endDate: endDate || '',
          mode: 'cafe',
        }, {
          onLogLine: (line) => { void pushLog(line); }
        });

        await progressRef.update({
          status: 'processing',
          message: '수집된 게시글 저장 중...',
          current: 0,
          total: result.posts?.length || 0,
        });

        if (result.success && result.posts) {
          const collectionRef = db.collection(POSTS_COLLECTION);
          let savedCount = 0;
          let skippedCount = 0;

          for (const post of result.posts) {
            if (post?.suggestedComment) {
              post.suggestedComment = stripUrls(String(post.suggestedComment));
            }
            const docId = safeDocIdFromPost(post);
            const docRef = collectionRef.doc(docId);
            const existing = await docRef.get();
            if (existing.exists) { skippedCount++; continue; }
            await docRef.set({ ...post, updatedAt: new Date().toISOString() });
            savedCount++;
            await progressRef.update({
              current: savedCount,
              total: result.posts.length,
              message: `${savedCount}/${result.posts.length}개 저장 중...`,
            });
          }

          await progressRef.update({
            status: 'completed',
            message: `완료! ${savedCount}개 저장 (${skippedCount}개 중복 건너뜀)`,
            current: savedCount,
            total: savedCount,
            completedAt: new Date().toISOString(),
          });
        } else {
          await progressRef.update({
            status: 'failed',
            message: result.error || '크롤링 실패',
            completedAt: new Date().toISOString(),
          });
        }
      } catch (bgErr: any) {
        console.error('[NaverCafe] 백그라운드 크롤링 오류:', bgErr);
        try {
          await progressRef.update({
            status: 'failed',
            message: bgErr.message || '알 수 없는 오류',
            completedAt: new Date().toISOString(),
          });
        } catch (_) {}
      }
    })();

  } catch (error: any) {
    console.error('[NaverCafe] POST 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/marketer/naver-cafe/crawl?id=...
 */
router.delete('/crawl', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, error: 'id가 필요합니다.' });
    }
    await db.collection(POSTS_COLLECTION).doc(id).delete();
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[NaverCafe] DELETE 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

