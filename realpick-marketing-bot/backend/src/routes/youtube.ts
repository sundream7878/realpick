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
      desc: desc || ''
    });
    
    if (result.success && result.missions && result.missions.length > 0) {
      const mission = result.missions[0];
      
      // showId 추출 (간단한 키워드 매칭)
      const extractShowId = (text: string): string => {
        const t = text.toLowerCase();
        if (t.includes('나는솔로') || t.includes('나솔')) return 'nasolo';
        if (t.includes('최강야구')) return 'choegang-yagu-2025';
        if (t.includes('나솔사계')) return 'nasolsagye';
        if (t.includes('돌싱글즈')) return 'dolsingles6';
        if (t.includes('환승연애')) return 'hwanseung4';
        if (t.includes('솔로지옥')) return 'solojihuk5';
        if (t.includes('흑백요리사')) return 'culinary-class-wars2';
        if (t.includes('골때녀') || t.includes('골 때리는')) return 'goal-girls-8';
        return 'nasolo';
      };

      const finalShowId = extractShowId(keyword || title);
      const finalCategory = finalShowId.includes('yagu') ? 'SPORTS' : 'LOVE';

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

export default router;
