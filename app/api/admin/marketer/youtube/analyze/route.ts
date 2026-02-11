import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, desc, channelName, channelId, keyword } = body;

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
      
      // 영상 정보에서 프로그램 키워드 추출 (세밀한 분석)
      const extractShowKeyword = (title: string, channelName?: string, description?: string): string | undefined => {
        const text = `${title} ${channelName || ''} ${description || ''}`.toLowerCase();
        const keywords = [
          { patterns: ['합숙맞선', '합숙 맞선'], result: '합숙맞선' },
          { patterns: ['쇼미더머니', 'show me the money', 'smtm'], result: '쇼미더머니' },
          { patterns: ['골때녀', '골때리는 그녀', '골때리는그녀', 'goal girls', '골때리는 그녀들', 'fc탑걸', '발라드림', '액셔니스타', '구척장신', '개벤져스', '월드클라쓰'], result: '골때녀' },
          { patterns: ['나솔사계', '나는 솔로 그 후', '사랑은 계속된다'], result: '나솔사계' },
          { patterns: ['나는솔로', '나는 솔로', 'i am solo'], result: '나는솔로' },
          { patterns: ['환승연애', '환연'], result: '환승연애' },
          { patterns: ['돌싱글즈', '돌싱'], result: '돌싱글즈' },
          { patterns: ['솔로지옥'], result: '솔로지옥' },
          { patterns: ['끝사랑'], result: '끝사랑' },
          { patterns: ['연애남매'], result: '연애남매' },
          { patterns: ['최강야구', '최강 몬스터즈'], result: '최강야구' },
          { patterns: ['강철부대'], result: '강철부대' },
          { patterns: ['피의게임', '피의 게임'], result: '피의게임' },
          { patterns: ['대학전쟁'], result: '대학전쟁' },
          { patterns: ['흑백요리사'], result: '흑백요리사' },
          { patterns: ['뭉쳐야찬다', '뭉쳐야 찬다'], result: '뭉쳐야찬다' },
          { patterns: ['무쇠소녀단'], result: '무쇠소녀단' },
          { patterns: ['노엑싯게임룸', '노엑싯'], result: '노엑싯게임룸' },
          { patterns: ['미스터트롯', '미스터 트롯'], result: '미스터트롯' },
          { patterns: ['미스트롯'], result: '미스트롯' },
          { patterns: ['현역가왕'], result: '현역가왕' },
          { patterns: ['프로젝트7', 'project 7'], result: '프로젝트7' },
          { patterns: ['유니버스리그', '유니버스 리그'], result: '유니버스리그' },
          { patterns: ['싱어게인'], result: '싱어게인' },
          { patterns: ['랩퍼블릭', '랩:퍼블릭'], result: '랩퍼블릭' },
        ];
        for (const { patterns, result } of keywords) {
          for (const pattern of patterns) {
            if (text.includes(pattern)) return result;
          }
        }
        return undefined;
      };

      const { normalizeShowId, getShowById } = await import("@/lib/constants/shows");
      // 1순위: 명시적으로 전달된 키워드, 2순위: 텍스트 분석 결과
      const extractedKeyword = keyword || extractShowKeyword(title, channelName, desc);
      const finalShowId = normalizeShowId(extractedKeyword) || 'nasolo';
      const showInfo = getShowById(finalShowId);
      const finalCategory = showInfo?.category || 'LOVE';

      const missionRef = adminDb.collection('t_marketing_ai_missions').doc();
      const missionData = {
        title: mission.title,
        description: mission.description || '',
        category: finalCategory,
        showId: finalShowId,
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
          category: finalCategory,
          showId: finalShowId,
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
