import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword } = body;

    if (!keyword) {
      return NextResponse.json({ success: false, error: "키워드가 필요합니다." }, { status: 400 });
    }

    console.log(`[테스트 수집] 키워드: ${keyword}, 개수: 3개`);

    // 1. YouTube 크롤링 (3개만)
    const crawlResult = await runMarketerBridge("crawl-youtube", {
      keywords: keyword,
      "max-results": 3,
      "start-date": new Date().toISOString().split('T')[0],
      "end-date": new Date().toISOString().split('T')[0]
    });

    console.log("[테스트 수집] 크롤링 결과:", JSON.stringify(crawlResult, null, 2));

    if (!crawlResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: crawlResult.error || "크롤링 실패", 
        details: crawlResult 
      });
    }

    if (!crawlResult.videos || crawlResult.videos.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "영상을 찾을 수 없습니다.", 
        details: crawlResult 
      });
    }

    const collectedVideos: any[] = [];
    const collectedChannels: any[] = [];
    const generatedMissions: any[] = [];

    // 채널별로 영상 그룹화
    const channelMap = new Map<string, any>();
    
    for (const video of crawlResult.videos) {
      const channelId = video.channel_id;
      
      // channelId가 없거나 비어있으면 스킵
      if (!channelId || channelId.trim() === '') {
        console.warn("[테스트 수집] 채널 ID가 없는 영상 스킵:", video.title);
        continue;
      }
      
      if (!channelMap.has(channelId)) {
        channelMap.set(channelId, {
          channelId: channelId,
          channelName: video.channel_title || 'Unknown Channel',
          subscriberCount: parseInt(video.subscriber_count || '0'),
          videos: []
        });
      }
      channelMap.get(channelId).videos.push(video);
    }

    // 채널이 없으면 종료
    if (channelMap.size === 0) {
      return NextResponse.json({
        success: false,
        error: "유효한 채널 정보를 찾을 수 없습니다.",
        details: "채널 ID가 비어있거나 유효하지 않습니다."
      });
    }

    // 2. 채널 및 영상 정보 저장
    for (const [channelId, channel] of channelMap.entries()) {
      // 채널 정보 저장 (dealers 컬렉션)
      const channelRef = adminDb.collection('dealers').doc(channel.channelId);
      const channelData = {
        channelId: channel.channelId,
        channelName: channel.channelName,
        subscriberCount: channel.subscriberCount || 0,
        videoCount: channel.videos?.length || 0,
        keywords: [keyword],
        lastCrawledAt: new Date().toISOString(),
        email: channel.email || null,
        platform: 'youtube'
      };
      
      await channelRef.set(channelData, { merge: true });
      collectedChannels.push(channelData);

      // 영상 정보 저장 및 AI 분석
      if (channel.videos && channel.videos.length > 0) {
        for (const video of channel.videos) {
          const videoId = video.video_id || video.videoId;
          const viewCount = parseInt(video.view_count || video.viewCount || '0');
          const likeCount = parseInt(video.like_count || video.likeCount || '0');
          const commentCount = parseInt(video.comment_count || video.commentCount || '0');
          
          // 영상 정보 저장 (videos 컬렉션)
          const videoRef = adminDb.collection('videos').doc(videoId);
          const videoData = {
            videoId: videoId,
            title: video.title,
            description: video.description || '',
            channelId: channel.channelId,
            channelName: channel.channelName,
            subscriberCount: channel.subscriberCount || 0,
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount,
            publishedAt: video.published_at || video.publishedAt || new Date().toISOString(),
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            video_url: video.video_url || `https://www.youtube.com/watch?v=${videoId}`,
            has_subtitle: video.has_subtitle || false,
            keyword: keyword,
            collectedAt: new Date().toISOString()
          };
          
          await videoRef.set(videoData);
          collectedVideos.push(videoData);

          // AI 미션 생성 (자막이 있는 경우에만)
          if (video.has_subtitle) {
            try {
              const analyzeResult = await runMarketerBridge("analyze-video", {
                "video-id": videoId,
                title: video.title,
                desc: video.description || ''
              });

              if (analyzeResult.success && analyzeResult.missions) {
                // AI 미션 저장
                for (const mission of analyzeResult.missions) {
                  const missionRef = adminDb.collection('ai_missions').doc();
                  const missionData = {
                    title: mission.title,
                    description: mission.description || '',
                    category: mission.category || 'LOVE',
                    showId: mission.showId || 'nasolo',
                    kind: mission.kind || 'MAJORITY',
                    form: mission.form || 'multiple',
                    options: mission.options || [],
                    sourceVideo: {
                      videoId: videoId,
                      title: video.title,
                      description: video.description || '',
                      channelName: channel.channelName,
                      channelId: channel.channelId,
                      url: video.video_url || `https://www.youtube.com/watch?v=${videoId}`,
                      thumbnailUrl: video.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                    },
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    createdBy: 'AI_GEMINI',
                    isApproved: false
                  };
                  
                  await missionRef.set(missionData);
                  generatedMissions.push({
                    ...missionData,
                    id: missionRef.id
                  });
                }
              }
            } catch (analyzeError) {
              console.error(`[AI 분석 실패] ${video.videoId}:`, analyzeError);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        videos: collectedVideos.length,
        channels: collectedChannels.length,
        missions: generatedMissions.length
      },
      collectedVideos,
      collectedChannels,
      generatedMissions
    });
  } catch (error: any) {
    console.error("테스트 수집 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
