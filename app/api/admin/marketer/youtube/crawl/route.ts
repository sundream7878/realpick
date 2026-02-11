import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, maxResults = 5, startDate, endDate } = body;

    if (!keywords) {
      return NextResponse.json({ success: false, error: "키워드가 필요합니다." }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 1. 만료된 영상 자동 삭제 (한 달 이상 지난 영상)
    const now = new Date();
    const expiredVideosSnapshot = await adminDb.collection('t_marketing_videos')
      .where('expiresAt', '<=', now.toISOString())
      .get();
    
    if (!expiredVideosSnapshot.empty) {
      const deleteBatch = adminDb.batch();
      expiredVideosSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log(`🗑️ 만료된 영상 ${expiredVideosSnapshot.size}개 삭제 완료`);
    }

    // 수집 버튼을 누른 시간으로부터 24시간 이내 영상만 수집
    const args: Record<string, any> = {
      keywords,
      "max-results": 2, // 프로그램당 2개씩 추출
      "hours_back": 24, // 24시간 이내
    };

    const result = await runMarketerBridge("crawl-youtube", args) as any;
    
    // 프론트엔드가 기대하는 형식으로 변환
    if (result.success && result.videos) {
      // 2. 중복 영상 필터링 (이미 DB에 있는 영상 제외)
      const videoIds = result.videos.map((v: any) => v.video_id);
      const existingVideoIds = new Set<string>();
      
      // Firestore 'in' 쿼리는 최대 10개씩만 가능하므로 청크로 나눠서 조회
      for (let i = 0; i < videoIds.length; i += 10) {
        const chunk = videoIds.slice(i, i + 10);
        const snapshot = await adminDb.collection('t_marketing_videos')
          .where('videoId', 'in', chunk)
          .get();
        
        snapshot.docs.forEach(doc => {
          existingVideoIds.add(doc.data().videoId);
        });
      }
      
      const newVideos = result.videos.filter((v: any) => !existingVideoIds.has(v.video_id));
      
      console.log(`📊 크롤링 결과: 총 ${result.videos.length}개, 기존 ${existingVideoIds.size}개, 신규 ${newVideos.length}개`);
      
      if (newVideos.length === 0) {
        return NextResponse.json({
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
          alreadyExists: existingVideoIds.size,
          newVideos: 0
        });
      }
      
      // 채널 정보 추출 및 dealers 컬렉션에 저장
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

      // Firestore에 채널 정보 및 영상 정보 저장
      const batch = adminDb.batch();
      
      // 1. 채널 정보 저장 (dealers 컬렉션)
      for (const [channelId, channelData] of channelMap.entries()) {
        const dealerRef = adminDb.collection('dealers').doc(channelId);
        const dealerDoc = await dealerRef.get();
        
        if (dealerDoc.exists) {
          // 기존 딜러 업데이트 (키워드 추가)
          const existingData = dealerDoc.data();
          const existingKeywords = existingData?.keywords || [];
          const updatedKeywords = [...new Set([...existingKeywords, ...channelData.keywords])];
          
          batch.update(dealerRef, {
            lastCrawledAt: channelData.lastCrawledAt,
            subscriberCount: channelData.subscriberCount,
            keywords: updatedKeywords
          });
        } else {
          // 새 딜러 생성
          batch.set(dealerRef, channelData);
        }
      }
      
      // 2. 영상 정보 저장 (videos 컬렉션) - 신규 영상만
      const collectedAt = new Date();
      const expiresAtDate = new Date(collectedAt);
      expiresAtDate.setDate(expiresAtDate.getDate() + 30); // 30일 후 만료
      const expiresAt = expiresAtDate.toISOString();
      
      for (const video of newVideos) {
        const videoId = video.video_id;
        const videoRef = adminDb.collection('t_marketing_videos').doc(videoId);
        
        const videoData = {
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
          expiresAt: expiresAt // 30일 후 자동 삭제
        };
        
        batch.set(videoRef, videoData);
      }
      
      await batch.commit();

      return NextResponse.json({
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
        alreadyExists: existingVideoIds.size,
        newVideos: newVideos.length,
        expiresAt: expiresAt
      });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("YouTube 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
