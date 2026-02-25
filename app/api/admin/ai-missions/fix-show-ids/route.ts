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
    { patterns: ['쇼미더머니', 'show me the money', 'smtm', '쇼미'], result: '쇼미더머니12' },
    { patterns: ['골때녀', '골때리는 그녀', '골때리는그녀', 'goal girls', '골때리는 그녀들', 'fc탑걸', '발라드림', '액셔니스타', '구척장신', '개벤져스', '월드클라쓰'], result: '골때녀8' },
    { patterns: ['나솔사계', '나는 솔로 그 후', '사랑은 계속된다'], result: '나솔사계' },
    { patterns: ['나는솔로', '나는 솔로', 'i am solo', '나솔'], result: 'nasolo' },
    { patterns: ['환승연애', '환연'], result: '환승연애4' },
    { patterns: ['돌싱글즈', '돌싱'], result: 'dolsingles6' },
    { patterns: ['솔로지옥'], result: 'solojihuk5' },
    { patterns: ['끝사랑'], result: 'kkeut-sarang' },
    { patterns: ['연애남매'], result: 'yeonae-nammae' },
    { patterns: ['최강야구', '최강 몬스터즈', '최강몬스터즈'], result: 'choegang-yagu-2025' },
    { patterns: ['강철부대'], result: 'steel-troops-w' },
    { patterns: ['피의게임', '피의 게임'], result: 'blood-game3' },
    { patterns: ['대학전쟁'], result: 'univ-war2' },
    { patterns: ['흑백요리사'], result: 'culinary-class-wars2' },
    { patterns: ['뭉쳐야찬다', '뭉쳐야 찬다'], result: 'kick-together3' },
    { patterns: ['무쇠소녀단'], result: 'iron-girls' },
    { patterns: ['노엑싯게임룸', '노엑싯'], result: 'no-exit-gameroom' },
    { patterns: ['미스터트롯', '미스터 트롯'], result: 'mr-trot3' },
    { patterns: ['미스트롯'], result: 'mistrot4' },
    { patterns: ['현역가왕'], result: 'active-king2' },
    { patterns: ['프로젝트7', 'project 7'], result: 'project7' },
    { patterns: ['유니버스리그', '유니버스 리그'], result: 'universe-league' },
    { patterns: ['싱어게인'], result: 'sing-again' },
    { patterns: ['랩퍼블릭', '랩:퍼블릭'], result: 'rap-public' },
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
    // 오직 t_marketing_ai_missions 컬렉션의 PENDING 상태인 미션만 수정
    const collections = ['t_marketing_ai_missions'];
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allDetails: any[] = [];

    for (const collectionName of collections) {
      console.log(`[FIX] Processing collection: ${collectionName} (PENDING only)`);
      
      const snapshot = await adminDb.collection(collectionName)
        .where('status', '==', 'PENDING')
        .get();
      
      if (snapshot.empty) {
        console.log(`[FIX] No missions found in ${collectionName}`);
        continue;
      }
      
      const updates: any[] = [];
      
      for (const doc of snapshot.docs) {
        const mission = doc.data();
        const currentShowId = mission.showId;
        const currentCategory = mission.category;
        
        // sourceVideo 정보 또는 제목/설명에서 키워드 추출
        const videoTitle = mission.sourceVideo?.title || mission.title || '';
        const channelName = mission.sourceVideo?.channelName || '';
        const description = mission.sourceVideo?.description || mission.description || '';
        
        const extractedKeyword = extractShowKeyword(videoTitle, channelName, description);
        
        if (!extractedKeyword) {
          totalSkipped++;
          continue;
        }
        
        // 키워드를 정규화된 showId로 변환
        const newShowId = normalizeShowId(extractedKeyword);
        
        if (!newShowId) {
          totalSkipped++;
          continue;
        }

        // 새로운 showId에 해당하는 카테고리 찾기
        const showInfo = getShowById(newShowId);
        const newCategory = showInfo?.category || 'LOVE';
        
        // 이미 올바른 showId와 category면 스킵
        if (currentShowId === newShowId && currentCategory === newCategory) {
          totalSkipped++;
          continue;
        }
        
        updates.push({
          id: doc.id,
          collection: collectionName,
          oldShowId: currentShowId,
          newShowId: newShowId,
          oldCategory: currentCategory,
          newCategory: newCategory,
          title: videoTitle
        });
      }
      
      // 배치 업데이트 (Firestore 배치는 최대 500개까지 가능)
      if (updates.length > 0) {
        const chunks = [];
        for (let i = 0; i < updates.length; i += 500) {
          chunks.push(updates.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = adminDb.batch();
          for (const update of chunk) {
            const docRef = adminDb.collection(update.collection).doc(update.id);
            batch.update(docRef, { 
              showId: update.newShowId,
              category: update.newCategory,
              updatedAt: new Date().toISOString()
            });
            totalUpdated++;
            allDetails.push(update);
          }
          await batch.commit();
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `총 ${totalUpdated}개의 미션 정보를 수정했습니다. (건너뜀: ${totalSkipped})`,
      updated: totalUpdated,
      skipped: totalSkipped,
      details: allDetails.slice(0, 100) // 너무 많을 수 있으므로 일부만 반환
    });
    
  } catch (error: any) {
    console.error("미션 정보 일괄 수정 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
