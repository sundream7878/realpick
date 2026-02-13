import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      kind, 
      form, 
      options, 
      deadline, 
      showId, 
      category, 
      referenceUrl, 
      thumbnailUrl,
      isAIMission = false,
      aiMissionId = null,
      channelName,
      creatorNickname = "AI 생성"
    } = body;

    // AI 미션인 경우 channelName을 우선적으로 사용
    const finalCreatorNickname = isAIMission && channelName ? channelName : creatorNickname;

    // 미션 데이터 구성
    const missionData = {
      title,
      kind: kind || (category === 'PREDICT' ? 'predict' : 'majority'),
      form: form || 'multi',
      options: options || [],
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showId: showId || 'nasolo',
      category: category || 'LOVE',
      referenceUrl: referenceUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      isAIMission,
      channelName: channelName || null,
      creatorNickname: finalCreatorNickname,
      creatorTier: isAIMission ? "AI" : "루키",
      creatorProfileImage: isAIMission ? "/tier-rookie.png" : "/tier-rookie.png", // 기본 루키 프로필 이미지
      status: "open",
      participants: 0,
      stats: { totalVotes: 0 },
      optionVoteCounts: options ? Object.fromEntries(options.map((o: string) => [o, 0])) : {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // 모든 미션은 missions1에 저장 (AI 미션 여부는 isAIMission 필드로 구분)
    const docRef = await adminDb.collection("missions1").add(missionData);

    // AI 미션 원본 상태 업데이트 (t_marketing_ai_missions 컬렉션)
    if (isAIMission && aiMissionId) {
      try {
        await adminDb.collection("t_marketing_ai_missions").doc(aiMissionId).update({
          status: 'APPROVED',
          isApproved: true,
          approvedAt: FieldValue.serverTimestamp(),
          publishedMissionId: docRef.id
        });
        console.log(`[Mission Create API] t_marketing_ai_missions/${aiMissionId} 상태를 APPROVED로 업데이트`);
      } catch (updateError) {
        console.error("[Mission Create API] t_marketing_ai_missions 업데이트 실패:", updateError);
      }
    }

    // 알림은 매일 정오(12시)·저녁(19시) 배치로만 발송 (즉시 발송 없음)

    return NextResponse.json({ 
      success: true, 
      missionId: docRef.id 
    });

  } catch (error: any) {
    console.error("[Mission Create API] 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
