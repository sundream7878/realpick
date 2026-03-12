import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LAST_AUTO_OPEN_DATE_KEY_FIELD = "lastAutoOpenDateKey";

function getKstDateKey() {
  const kstMs = Date.now() + KST_OFFSET_MS;
  const d = new Date(kstMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

/**
 * 커플매칭 미션의 다음 회차를 수동으로 open 처리.
 * 생성자 또는 관리자만 호출 가능.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const missionId = params?.id;
    if (!missionId) {
      return NextResponse.json(
        { error: "Mission ID is required" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 503 }
      );
    }

    const missionRef = adminDb.collection("missions2").doc(missionId);
    const missionSnap = await missionRef.get();
    if (!missionSnap.exists) {
      return NextResponse.json(
        { error: "미션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const data = missionSnap.data()!;
    if (data.status !== "open") {
      return NextResponse.json(
        { error: "진행 중인 미션만 다음 회차를 열 수 있습니다." },
        { status: 400 }
      );
    }

    const creatorId = data.creatorId;
    const isCreator = creatorId === userId;

    const adminDoc = await adminDb.collection("users").doc(userId).get();
    const userRole = adminDoc.data()?.role;
    const isAdmin = userRole === "ADMIN" || userRole === "admin";

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: "생성자 또는 관리자만 다음 회차를 열 수 있습니다." },
        { status: 403 }
      );
    }

    const episodeStatuses: Record<number, string> = data.episodeStatuses ?? {};
    const episodeNos = Object.keys(episodeStatuses)
      .map(Number)
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a);
    const latestEp = episodeNos[0] ?? 0;
    const nextEp = latestEp + 1;

    if (episodeStatuses[nextEp] !== undefined) {
      return NextResponse.json({
        success: true,
        message: "이미 해당 회차가 열려 있습니다.",
        episode: nextEp,
      });
    }

    const kstDateKey = getKstDateKey();
    const updateData: Record<string, any> = {
      [`episodeStatuses.${nextEp}`]: "open",
      [`episodeDates.${nextEp}`]: kstDateKey,
      updatedAt: FieldValue.serverTimestamp(),
    };
    // 새 회차가 열리면 이전 회차는 settled 처리
    if (latestEp > 0) {
      updateData[`episodeStatuses.${latestEp}`] = "settled";
    }

    // 수동 오픈이 방송일/방송시간 이후에 이뤄진 경우, 자동 오픈 중복 방지를 위해 날짜키도 같이 기록
    // (방송일이 아니거나 방송시간 전이라면 기록하지 않음)
    const broadcastDay = data.broadcastDay as string | undefined;
    const broadcastTime = data.broadcastTime as string | undefined;
    if (broadcastDay && broadcastTime) {
      const kstMs = Date.now() + KST_OFFSET_MS;
      const now = new Date(kstMs);
      const day = now.getUTCDay();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      const dayMap: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
      const targetDayNum = dayMap[broadcastDay];
      if (targetDayNum !== undefined && day === targetDayNum) {
        const [hRaw, mRaw] = broadcastTime.split(":");
        const h = Number(hRaw);
        const m = Number(mRaw);
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
          const past = hour > h || (hour === h && minute >= m);
          if (past) {
            updateData[LAST_AUTO_OPEN_DATE_KEY_FIELD] = getKstDateKey();
          }
        }
      }
    }

    await missionRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `${nextEp}회차가 열렸습니다.`,
      episode: nextEp,
    });
  } catch (err: any) {
    console.error("[open-next-episode] 에러:", err);
    return NextResponse.json(
      { error: err?.message ?? "서버 오류" },
      { status: 500 }
    );
  }
}
