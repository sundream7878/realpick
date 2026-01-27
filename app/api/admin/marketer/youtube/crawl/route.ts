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

    const args: Record<string, any> = {
      keywords,
      "max-results": maxResults,
    };

    if (startDate) args["start-date"] = startDate;
    if (endDate) args["end-date"] = endDate;

    const result = await runMarketerBridge("crawl-youtube", args);
    
    // 프론트엔드가 기대하는 형식으로 변환
    if (result.success && result.videos) {
      // 채널 정보 추출 및 dealers 컬렉션에 저장
      const channelMap = new Map<string, any>();
      
      for (const video of result.videos) {
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

      // Firestore에 채널 정보 저장
      const batch = adminDb.batch();
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
      
      await batch.commit();

      return NextResponse.json({
        success: true,
        results: {
          channels: {
            [keywords]: {
              status: 'success',
              videos: result.videos
            }
          }
        },
        savedChannels: channelMap.size
      });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("YouTube 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
