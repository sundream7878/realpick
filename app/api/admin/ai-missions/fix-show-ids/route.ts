import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeShowId, getShowById, getShowByName } from "@/lib/constants/shows";

export const dynamic = 'force-dynamic';

// 영상 제목, 채널명, 설명에서 프로그램 키워드 추출
function extractShowKeyword(title: string, channelName?: string, description?: string): string | undefined {
  const text = `${title} ${channelName || ''} ${description || ''}`.toLowerCase();
  
  // 1. 우선순위 기반 키워드 매칭 (오차를 줄이기 위해 더 구체적인 키워드부터 배치)
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
      if (text.includes(pattern)) {
        return result;
      }
    }
  }
  
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    // t_marketing_ai_missions 컬렉션의 모든 PENDING 미션 가져오기
    const aiMissionsRef = adminDb.collection('t_marketing_ai_missions')
      .where('status', '==', 'PENDING');
    
    const snapshot = await aiMissionsRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "수정할 미션이 없습니다.",
        updated: 0,
        skipped: 0
      });
    }
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updates: any[] = [];
    
    // 각 미션 분석
    for (const doc of snapshot.docs) {
      const mission = doc.data();
      const currentShowId = mission.showId;
      const currentCategory = mission.category;
      
      // sourceVideo 정보에서 키워드 추출
      const videoTitle = mission.sourceVideo?.title || mission.title || '';
      const channelName = mission.sourceVideo?.channelName || '';
      const description = mission.sourceVideo?.description || mission.description || '';
      
      const extractedKeyword = extractShowKeyword(videoTitle, channelName, description);
      
      if (!extractedKeyword) {
        console.log(`[SKIP] ${doc.id}: 키워드를 추출할 수 없음 (제목: ${videoTitle})`);
        skippedCount++;
        continue;
      }
      
      // 키워드를 정규화된 showId로 변환
      const newShowId = normalizeShowId(extractedKeyword);
      
      if (!newShowId) {
        console.log(`[SKIP] ${doc.id}: showId 변환 실패 (키워드: ${extractedKeyword})`);
        skippedCount++;
        continue;
      }

      // 새로운 showId에 해당하는 카테고리 찾기
      const showInfo = getShowById(newShowId);
      const newCategory = showInfo?.category || 'LOVE';
      
      // 이미 올바른 showId와 category면 스킵
      if (currentShowId === newShowId && currentCategory === newCategory) {
        console.log(`[SKIP] ${doc.id}: 이미 올바른 정보임 (${newShowId}, ${newCategory})`);
        skippedCount++;
        continue;
      }
      
      // 업데이트 필요
      updates.push({
        id: doc.id,
        oldShowId: currentShowId,
        newShowId: newShowId,
        oldCategory: currentCategory,
        newCategory: newCategory,
        keyword: extractedKeyword,
        title: videoTitle
      });
    }
    
    // 실제 업데이트 수행
    const batch = adminDb.batch();
    
    for (const update of updates) {
      const docRef = adminDb.collection('t_marketing_ai_missions').doc(update.id);
      batch.update(docRef, { 
        showId: update.newShowId,
        category: update.newCategory,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`[UPDATE] ${update.id}: "${update.oldShowId}" → "${update.newShowId}", "${update.oldCategory}" → "${update.newCategory}"`);
      updatedCount++;
    }
    
    if (updates.length > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({
      success: true,
      message: `총 ${updatedCount}개의 미션 정보를 수정했습니다.`,
      updated: updatedCount,
      skipped: skippedCount,
      details: updates.map(u => ({
        title: u.title,
        oldShowId: u.oldShowId,
        newShowId: u.newShowId,
        oldCategory: u.oldCategory,
        newCategory: u.newCategory
      }))
    });
    
  } catch (error: any) {
    console.error("미션 정보 일괄 수정 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
