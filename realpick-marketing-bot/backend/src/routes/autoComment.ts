import { Router } from 'express';
import admin from 'firebase-admin';
import { runMarketerBridge } from '../services/pythonBridge.js';
import crypto from 'crypto';

const router = Router();
const db = admin.firestore();

const COLLECTIONS: Record<string, string> = {
  board: 't_marketing_viral_posts',
  cafe:  't_marketing_naver_cafe_posts',
};

/**
 * POST /api/auto-comment
 * 단건 자동 댓글 등록
 * body: { postId, collectionType }
 */
router.post('/', async (req, res) => {
  try {
    const { postId, collectionType = 'board' } = req.body || {};
    
    if (!postId) {
      return res.status(400).json({ success: false, error: 'postId가 필요합니다.' });
    }

    const collectionName = COLLECTIONS[collectionType];
    if (!collectionName) {
      return res.status(400).json({ success: false, error: '잘못된 collectionType입니다.' });
    }

    // 1. DB에서 게시글 정보 조회 (URL과 댓글을 DB에서 가져옴)
    let docRef = db.collection(collectionName).doc(postId);
    let snap = await docRef.get();

    // 만약 전달받은 ID로 찾을 수 없다면, 이전 방식(해시 변환)으로 한 번 더 시도
    if (!snap.exists) {
      const crypto = await import('crypto');
      const seedUrl = postId.startsWith('url:') ? postId : `url:${postId}`;
      const hashedIdUrl = crypto.createHash('sha256').update(seedUrl, 'utf8').digest('hex').slice(0, 48);
      const seedFallback = postId.startsWith('fallback:') ? postId : postId.replace('fallback_', 'fallback:');
      const hashedIdFallback = crypto.createHash('sha256').update(seedFallback, 'utf8').digest('hex').slice(0, 48);
      
      docRef = db.collection(collectionName).doc(hashedIdUrl);
      snap = await docRef.get();
      if (!snap.exists) {
        docRef = db.collection(collectionName).doc(hashedIdFallback);
        snap = await docRef.get();
      }
    }

    if (!snap.exists) {
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
    }

    const postData = snap.data() || {};
    const { url, suggestedComment, source } = postData;

    if (!url || !suggestedComment) {
      return res.status(400).json({ success: false, error: 'URL 또는 댓글 내용이 DB에 없습니다.' });
    }

    // 2. 상태 업데이트
    await docRef.update({ commentStatus: 'posting' });
    
    // 3. 즉시 응답 반환
    res.json({ success: true, postId: docRef.id, status: 'posting' });
    
    // 4. 백그라운드에서 자동 댓글 실행
    executeAutoComment(docRef, url, suggestedComment, source, docRef.id);

  } catch (error: any) {
    console.error('[AutoComment] 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auto-comment/manual-login
 * 수동 로그인 모드 실행 (브라우저를 띄워 사용자가 로그인하게 함)
 * body: { url, siteId }
 */
router.post('/manual-login', async (req, res) => {
  try {
    const { url, siteId, userId, userPw } = req.body || {};
    if (!url || !siteId) {
      return res.status(400).json({ success: false, error: 'url과 siteId가 필요합니다.' });
    }

    console.log(`[AutoComment] 수동 로그인 모드 시작: [${siteId}] ${url} (ID: ${userId || 'env'})`);

    const result: any = await runMarketerBridge('manual-login', {
      url,
      site_id: siteId,
      user_id: userId || '',
      user_pw: userPw || '',
      headless: 'false',
    }, {
      onLogLine: (line) => console.log(`[AutoComment] ${line}`)
    });

    if (result.success) {
      res.json({ success: true, message: result.message || '로그인 및 쿠키 저장 완료' });
    } else {
      res.status(500).json({ success: false, error: result.error || '로그인 실패' });
    }
  } catch (error: any) {
    console.error('[AutoComment] 수동 로그인 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 실제 자동 댓글 실행 함수
 */
async function executeAutoComment(docRef: admin.firestore.DocumentReference, url: string, comment: string, source: string, postId: string) {
  try {
    console.log(`[AutoComment] 시작: [${source}] ${url.substring(0, 60)}`);

    const result: any = await runMarketerBridge('auto-comment', {
      url,
      comment,
      site_id: source || '',
      headless: 'false',
    }, {
      onLogLine: (line) => console.log(`[AutoComment] ${line}`)
    });

    if (result.success) {
      await docRef.update({
        commentStatus: 'posted',
        commentedAt: new Date().toISOString(),
      }).catch(() => {});
      console.log(`[AutoComment] ✅ 성공: ${postId}`);
    } else {
      await docRef.update({
        commentStatus: 'failed',
        commentError: result.error || '알 수 없는 오류',
        commentedAt: new Date().toISOString(),
      }).catch(() => {});
      console.error(`[AutoComment] ❌ 실패: ${result.error}`);
    }
  } catch (e: any) {
    await docRef.update({
      commentStatus: 'failed',
      commentError: e.message,
      commentedAt: new Date().toISOString(),
    }).catch(() => {});
    console.error('[AutoComment] 백그라운드 오류:', e.message);
  }
}

/**
 * GET /api/auto-comment/:postId
 * 댓글 등록 상태 조회
 */
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const collectionType = String(req.query.collectionType || 'board');
    const collectionName = COLLECTIONS[collectionType] || COLLECTIONS.board;

    let docRef = db.collection(collectionName).doc(postId);
    let snap = await docRef.get();

    if (!snap.exists) {
      // postId가 해시가 아닌 경우를 대비해 해시로 변환하여 다시 찾음
      const seedUrl = postId.startsWith('url:') ? postId : `url:${postId}`;
      const hashedIdUrl = crypto.createHash('sha256').update(seedUrl, 'utf8').digest('hex').slice(0, 48);
      
      const seedFallback = postId.startsWith('fallback:') ? postId : postId.replace('fallback_', 'fallback:');
      const hashedIdFallback = crypto.createHash('sha256').update(seedFallback, 'utf8').digest('hex').slice(0, 48);
      
      docRef = db.collection(collectionName).doc(hashedIdUrl);
      snap = await docRef.get();
      
      if (!snap.exists) {
        docRef = db.collection(collectionName).doc(hashedIdFallback);
        snap = await docRef.get();
      }
      
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
      }
    }
    const data: any = snap.data() || {};
    return res.json({
      success: true,
      postId,
      commentStatus: data.commentStatus || null,
      commentedAt: data.commentedAt || null,
      commentError: data.commentError || null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
