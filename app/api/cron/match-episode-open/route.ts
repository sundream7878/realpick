import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 현재 시각을 KST 기준 요일(0-6), 시, 분으로 반환 */
function getKstNow() {
  const kstMs = Date.now() + KST_OFFSET_MS;
  const d = new Date(kstMs);
  return {
    day: d.getUTCDay(), // 0=일, 6=토
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const DAY_MAP: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

/**
 * 매 시간 호출되는 cron.
 * 방송일·방송시간(KST)이 지난 커플매칭 미션에 대해 다음 회차를 자동으로 open 처리.
 * (이전 회차가 settled일 필요 없음 - 방송일이 지나면 다음 회차 오픈)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";

    if (!cronSecret && !isVercelCron) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 501 }
      );
    }
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "adminDb not initialized" },
        { status: 503 }
      );
    }

    const kst = getKstNow();

    const snapshot = await adminDb
      .collection("missions2")
      .where("status", "==", "open")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "진행 중인 커플매칭 미션 없음",
        opened: 0,
      });
    }

    let openedCount = 0;

    for (const doc of snapshot.docs) {
      const mission = doc.data();
      const { broadcastDay, broadcastTime, episodeStatuses = {} } = mission;

      if (!broadcastDay || !broadcastTime) continue;

      const targetDayNum = DAY_MAP[broadcastDay];
      if (targetDayNum === undefined) continue;

      if (kst.day !== targetDayNum) continue;

      const [hour, minute] = broadcastTime.split(":").map(Number);
      if (kst.hour < hour || (kst.hour === hour && kst.minute < minute)) continue;

      const episodeNos = Object.keys(episodeStatuses).map(Number).sort((a, b) => b - a);
      const latestEp = episodeNos[0] ?? 0;
      const nextEp = latestEp + 1;

      if (episodeStatuses[nextEp] !== undefined) continue;

      await adminDb.collection("missions2").doc(doc.id).update({
        [`episodeStatuses.${nextEp}`]: "open",
        updatedAt: FieldValue.serverTimestamp(),
      });

      openedCount++;
      console.log(`[match-episode-open] 미션 ${doc.id}: ${nextEp}회차 자동 오픈`);
    }

    return NextResponse.json({
      success: true,
      opened: openedCount,
      kst: `${kst.day}요일 ${kst.hour}:${String(kst.minute).padStart(2, "0")}`,
    });
  } catch (err: any) {
    console.error("[match-episode-open] 에러:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
