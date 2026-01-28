import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, desc, channelName, channelId } = body;

    if (!videoId || !title) {
      return NextResponse.json({ success: false, error: "videoId와 title이 필요합니다." }, { status: 400 });
    }

    const result = await runMarketerBridge("analyze-video", { 
      "video-id": videoId,
      title: title,
      desc: desc || ''
    });
    
    // AI 미션을 ai_mission 컬렉션에 저장 (첫 번째 미션만)
    if (result.success && result.missions && result.missions.length > 0) {
      const mission = result.missions[0];
      const missionRef = adminDb.collection('ai_missions').doc();
      const missionData = {
        title: mission.title,
        description: mission.description || '',
        category: mission.category || 'LOVE', // LOVE, VICTORY, STAR
        showId: mission.showId || 'nasolo', // 프로그램 ID
        kind: mission.kind || 'MAJORITY', // PREDICT, MAJORITY
        form: mission.form || 'multiple', // binary, multiple
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
        status: 'PENDING', // PENDING, APPROVED, REJECTED
        createdAt: new Date().toISOString(),
        createdBy: 'AI_GEMINI',
        isApproved: false
      };
      
      await missionRef.set(missionData);
      
      return NextResponse.json({
        ...result,
        missions: [{
          ...mission,
          aiMissionId: missionRef.id
        }],
        savedToDb: true,
        savedCount: 1
      });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI 미션 분석 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
