import { NextRequest, NextResponse } from "next/server";
import { createGlobalNotification } from "@/lib/firebase/admin-notifications";

/**
 * 외부 시스템(마케터 앱, 자동 생성 스크립트)에서 미션 생성 후 알림을 보낼 때 사용합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { missionId, missionTitle, category, showId, creatorNickname } = body;

    if (!missionId || !missionTitle || !category) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    console.log(`[API Notification] 알림 발송 요청:`, {
      missionTitle,
      category,
      showId,
      creatorNickname
    });

    const result = await createGlobalNotification({
      missionId,
      missionTitle,
      category,
      showId: showId || 'nasolo',
      creatorId: "AI_SYSTEM",
      creatorNickname: creatorNickname || "AI 생성"
    });

    console.log(`[API Notification] 알림 발송 완료: ${result.count}명`);

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `${result.count}명의 사용자에게 알림을 발송했습니다.` 
    });
  } catch (error: any) {
    console.error("[API Notification] 오류:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
