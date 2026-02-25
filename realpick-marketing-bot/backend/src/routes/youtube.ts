import { Router } from 'express';
import { runMarketerBridge } from '../services/pythonBridge.js';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

/**
 * YouTube 크롤링 API
 */
router.post('/crawl', async (req, res) => {
  try {
    const { keywords, maxResults = 5, hoursBack = 24 } = req.body;

    if (!keywords) {
      return res.status(400).json({ success: false, error: "키워드가 필요합니다." });
    }

    // 1. 만료된 영상 자동 삭제 (한 달 이상 지난 영상)
    const now = new Date();
    const expiredVideosSnapshot = await db.collection('t_marketing_videos')
      .where('expiresAt', '<=', now.toISOString())
      .get();
    
    if (!expiredVideosSnapshot.empty) {
      const deleteBatch = db.batch();
      expiredVideosSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log(`🗑️ 만료된 영상 ${expiredVideosSnapshot.size}개 삭제 완료`);
    }

    // 2. Python 브릿지로 YouTube 크롤링
    const args: Record<string, any> = {
      keywords,
      "max-results": 2,
      "hours_back": hoursBack,
    };

    const result = await runMarketerBridge("crawl-youtube", args) as any;
    
    if (result.success && result.videos) {
      // 3. 중복 영상 필터링
      const videoIds = result.videos.map((v: any) => v.video_id);
      const existingVideoIds = new Set<string>();
      
      for (let i = 0; i < videoIds.length; i += 10) {
        const chunk = videoIds.slice(i, i + 10);
        const snapshot = await db.collection('t_marketing_videos')
          .where('videoId', 'in', chunk)
          .get();
        
        snapshot.docs.forEach(doc => {
          existingVideoIds.add(doc.data().videoId);
        });
      }
      
      const newVideos = result.videos.filter((v: any) => !existingVideoIds.has(v.video_id));
      
      console.log(`📊 크롤링 결과: 총 ${result.videos.length}개, 신규 ${newVideos.length}개`);
      
      if (newVideos.length === 0) {
        return res.json({
          success: true,
          results: {
            channels: {
              [keywords]: {
                status: 'success',
                videos: []
              }
            }
          },
          message: "모든 영상이 이미 DB에 존재합니다.",
          totalCrawled: result.videos.length,
          newVideos: 0
        });
      }
      
      // 4. 채널 정보 추출 및 저장
      const channelMap = new Map<string, any>();
      
      for (const video of newVideos) {
        const channelId = video.channel_id;
        if (channelId && !channelMap.has(channelId)) {
          channelMap.set(channelId, {
            channelId: channelId,
            channelName: video.channel_title,
            subscriberCount: parseInt(video.subscriber_count || '0'),
            lastCrawledAt: new Date().toISOString(),
            keywords: [keywords],
            platform: 'youtube',
            status: 'ACTIVE',
            videoCount: 1
          });
        } else if (channelId) {
          const existing = channelMap.get(channelId);
          existing.videoCount += 1;
        }
      }

      // 5. Firestore에 저장
      const batch = db.batch();
      
      // 채널 정보 저장
      for (const [channelId, channelData] of channelMap.entries()) {
        const dealerRef = db.collection('dealers').doc(channelId);
        const dealerDoc = await dealerRef.get();
        
        if (dealerDoc.exists) {
          const existingData = dealerDoc.data();
          const existingKeywords = existingData?.keywords || [];
          const updatedKeywords = [...new Set([...existingKeywords, ...channelData.keywords])];
          
          batch.update(dealerRef, {
            lastCrawledAt: channelData.lastCrawledAt,
            subscriberCount: channelData.subscriberCount,
            keywords: updatedKeywords
          });
        } else {
          batch.set(dealerRef, channelData);
        }
      }
      
      // 영상 정보 저장
      const collectedAt = new Date();
      const expiresAtDate = new Date(collectedAt);
      expiresAtDate.setDate(expiresAtDate.getDate() + 30);
      const expiresAt = expiresAtDate.toISOString();
      
      for (const video of newVideos) {
        const videoId = video.video_id;
        const videoRef = db.collection('t_marketing_videos').doc(videoId);
        
        batch.set(videoRef, {
          videoId: videoId,
          title: video.title,
          description: video.description || '',
          channelId: video.channel_id,
          channelName: video.channel_title,
          subscriberCount: parseInt(video.subscriber_count || '0'),
          viewCount: parseInt(video.view_count || '0'),
          likeCount: parseInt(video.like_count || '0'),
          commentCount: parseInt(video.comment_count || '0'),
          publishedAt: video.published_at,
          thumbnail: video.thumbnail,
          video_url: video.video_url || `https://www.youtube.com/watch?v=${videoId}`,
          has_subtitle: video.has_subtitle || false,
          keyword: keywords,
          collectedAt: collectedAt.toISOString(),
          expiresAt: expiresAt
        });
      }
      
      await batch.commit();

      return res.json({
        success: true,
        results: {
          channels: {
            [keywords]: {
              status: 'success',
              videos: newVideos
            }
          }
        },
        savedChannels: channelMap.size,
        totalCrawled: result.videos.length,
        newVideos: newVideos.length,
        expiresAt: expiresAt
      });
    }
    
    return res.json(result);
  } catch (error: any) {
    console.error("YouTube 크롤링 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * YouTube 영상 분석 (AI 미션 생성)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { videoId, title, desc, channelName, channelId, keyword } = req.body;

    if (!videoId || !title) {
      return res.status(400).json({ success: false, error: "videoId와 title이 필요합니다." });
    }

    const result = await runMarketerBridge("analyze-video", { 
      "video-id": videoId,
      title: title,
      desc: desc || '',
      keyword: keyword || ''
    });
    
    if (result.success && result.missions && result.missions.length > 0) {
      const mission = result.missions[0];
      
      // showId 추출 (정밀 키워드 매칭)
      const extractShowId = (text: string): string => {
        const t = text.toLowerCase();
        if (t.includes('합숙맞선') || t.includes('합숙 맞선')) return 'habsuk-matseon';
        if (t.includes('쇼미더머니') || t.includes('show me the money') || t.includes('smtm') || t.includes('쇼미')) return 'show-me-the-money-12';
        if (t.includes('골때녀') || t.includes('골때리는 그녀') || t.includes('goal girls') || t.includes('골 때리는')) return 'goal-girls-8';
        if (t.includes('나솔사계') || t.includes('나는 솔로 그 후')) return 'nasolsagye';
        if (t.includes('나는솔로') || t.includes('나는 솔로') || t.includes('i am solo') || t.includes('나솔')) return 'nasolo';
        if (t.includes('환승연애') || t.includes('환연')) return 'hwanseung4';
        if (t.includes('돌싱글즈') || t.includes('돌싱')) return 'dolsingles6';
        if (t.includes('솔로지옥')) return 'solojihuk5';
        if (t.includes('끝사랑')) return 'kkeut-sarang';
        if (t.includes('연애남매')) return 'yeonae-nammae';
        if (t.includes('최강야구') || t.includes('최강 몬스터즈') || t.includes('최강몬스터즈')) return 'choegang-yagu-2025';
        if (t.includes('강철부대')) return 'steel-troops-w';
        if (t.includes('피의게임') || t.includes('피의 게임')) return 'blood-game3';
        if (t.includes('대학전쟁')) return 'univ-war2';
        if (t.includes('흑백요리사')) return 'culinary-class-wars2';
        if (t.includes('뭉쳐야찬다') || t.includes('뭉쳐야 찬다')) return 'kick-together3';
        if (t.includes('무쇠소녀단')) return 'iron-girls';
        if (t.includes('노엑싯게임룸') || t.includes('노엑싯')) return 'no-exit-gameroom';
        if (t.includes('미스터트롯') || t.includes('미스터 트롯')) return 'mr-trot3';
        if (t.includes('미스트롯')) return 'mistrot4';
        if (t.includes('현역가왕')) return 'active-king2';
        if (t.includes('프로젝트7') || t.includes('project 7')) return 'project7';
        if (t.includes('유니버스리그') || t.includes('유니버스 리그')) return 'universe-league';
        if (t.includes('싱어게인')) return 'sing-again';
        if (t.includes('랩퍼블릭') || t.includes('랩:퍼블릭')) return 'rap-public';
        return 'nasolo';
      };

      const finalShowId = extractShowId(keyword || title);
      
      // 카테고리 매핑 로직
      const showIdToCategory: Record<string, string> = {
        'nasolo': 'LOVE', 'nasolsagye': 'LOVE', 'dolsingles6': 'LOVE', 'solojihuk5': 'LOVE', 'hwanseung4': 'LOVE', 'kkeut-sarang': 'LOVE', 'yeonae-nammae': 'LOVE', 'habsuk-matseon': 'LOVE',
        'choegang-yagu-2025': 'VICTORY', 'goal-girls-8': 'VICTORY', 'steel-troops-w': 'VICTORY', 'blood-game3': 'VICTORY', 'univ-war2': 'VICTORY', 'culinary-class-wars2': 'VICTORY', 'kick-together3': 'VICTORY', 'iron-girls': 'VICTORY', 'no-exit-gameroom': 'VICTORY',
        'mr-trot3': 'STAR', 'mistrot4': 'STAR', 'active-king2': 'STAR', 'project7': 'STAR', 'universe-league': 'STAR', 'show-me-the-money-12': 'STAR', 'sing-again': 'STAR', 'rap-public': 'STAR'
      };
      
      const finalCategory = showIdToCategory[finalShowId] || 'LOVE';

      const missionRef = db.collection('t_marketing_ai_missions').doc();
      const missionData = {
        title: mission.title,
        description: mission.description || '',
        category: finalCategory,
        showId: finalShowId,
        kind: mission.kind || 'MAJORITY',
        form: mission.form || 'multiple',
        options: mission.options || [],
        sourceVideo: {
          videoId: videoId,
          title: title,
          description: desc || '',
          channelName: channelName || '',
          channelId: channelId || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        },
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        createdBy: 'AI_GEMINI',
        isApproved: false
      };
      
      await missionRef.set(missionData);
      
      return res.json({
        ...result,
        missions: [{
          ...mission,
          category: finalCategory,
          showId: finalShowId,
          aiMissionId: missionRef.id
        }],
        savedToDb: true,
        savedCount: 1
      });
    }
    
    return res.json(result);
  } catch (error: any) {
    console.error("AI 미션 분석 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 매일 새벽 6시 자동 실행: 지난 24시간 영상 수집 → 수집된 모든 영상에 대해 미션 생성
 * body: { keywords: string[], baseUrl: string } (baseUrl = 메인 앱 URL, 스크리닝 API 호출용)
 * 인증: Authorization: Bearer ${CRON_SECRET}
 */
router.post('/run-daily-auto-mission', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { keywords = [], baseUrl } = req.body as { keywords?: string[]; baseUrl?: string };
    if (!keywords.length || !baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'keywords(배열)와 baseUrl이 필요합니다.',
      });
    }

    const HOURS_BACK = 24;
    const MAX_RESULTS = 15;
    const seenIds = new Set<string>();
    const allVideos: Array<{
      video_id: string;
      title: string;
      description?: string;
      channel_id?: string;
      channel_title?: string;
      keyword?: string;
      published_at?: string;
      thumbnail?: string;
    }> = [];

    // 1. 키워드별로 지난 24시간 영상 수집 (Python 크롤만, DB 저장 없이 수집만)
    console.log(`[run-daily-auto-mission] 1단계: 유튜브 크롤링 시작 (키워드: ${keywords.length}개)`);
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      try {
        console.log(`[run-daily-auto-mission] (${i + 1}/${keywords.length}) '${kw}' 크롤링 중...`);
        const result = (await runMarketerBridge('crawl-youtube', {
          keywords: kw,
          'max-results': MAX_RESULTS,
          hours_back: HOURS_BACK,
        })) as any;
        if (result?.success && Array.isArray(result.videos)) {
          console.log(`[run-daily-auto-mission] '${kw}' 결과: ${result.videos.length}개 발견`);
          for (const v of result.videos) {
            if (v?.video_id && !seenIds.has(v.video_id)) {
              seenIds.add(v.video_id);
              allVideos.push({
                video_id: v.video_id,
                title: v.title || '',
                description: v.description || '',
                channel_id: v.channel_id,
                channel_title: v.channel_title,
                keyword: kw,
                published_at: v.published_at,
                thumbnail: v.thumbnail,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[run-daily-auto-mission] 크롤 실패 (${kw}):`, e);
      }
    }

    console.log(`[run-daily-auto-mission] 총 ${allVideos.length}개 유니크 영상 수집됨`);

    if (allVideos.length === 0) {
      return res.json({
        success: true,
        totalCollected: 0,
        totalScreened: 0,
        totalMissionsCreated: 0,
        message: '수집된 영상이 없습니다.',
      });
    }

    // 2. 수집된 모든 영상에 대해 즉시 미션 생성 (스크리닝 없이 전수 생성)
    console.log(`[run-daily-auto-mission] 2단계: 미션 생성 시작 (대상: ${allVideos.length}개 영상)`);
    let missionsCreated = 0;
    const backendUrl = process.env.MARKETING_BOT_URL || 'http://localhost:3001';
    
    for (let i = 0; i < allVideos.length; i++) {
      const video = allVideos[i];
      try {
        console.log(`[run-daily-auto-mission] (${i + 1}/${allVideos.length}) 미션 생성 중: ${video.title.slice(0, 30)}...`);
        
        const analyzeRes = await fetch(`${backendUrl}/api/youtube/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.video_id,
            title: video.title,
            desc: video.description || '',
            channelName: video.channel_title,
            channelId: video.channel_id,
            keyword: video.keyword,
          }),
        });
        
        const data = await analyzeRes.json();
        if (data.success && data.missions?.length) {
          console.log(`[run-daily-auto-mission] 🚀 미션 생성 완료!`);
          missionsCreated++;
        } else {
          console.log(`[run-daily-auto-mission] ⚠️ 미션 생성 실패: ${data.error || '알 수 없는 이유'}`);
        }
        
        // AI 분석 부하를 줄이기 위해 간격 유지
        await new Promise((r) => setTimeout(r, 2500));
      } catch (e) {
        console.warn(`[run-daily-auto-mission] 미션 생성 중 오류 (${video.video_id}):`, e);
      }
    }

    console.log(
      `[run-daily-auto-mission] 완료: 총 ${allVideos.length}개 영상 수집 → ${missionsCreated}개 미션 생성`
    );

    return res.json({
      success: true,
      totalCollected: allVideos.length,
      totalMissionsCreated: missionsCreated,
    });
  } catch (error: any) {
    console.error('run-daily-auto-mission 오류:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
