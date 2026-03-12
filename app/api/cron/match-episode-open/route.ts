import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const LAST_AUTO_OPEN_DATE_KEY_FIELD = "lastAutoOpenDateKey";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** 현재 시각을 KST 기준 요일(0-6), 시, 분으로 반환 */
function getKstNow() {
  const kstMs = Date.now() + KST_OFFSET_MS;
  const d = new Date(kstMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();
  return {
    day: d.getUTCDay(), // 0=일, 6=토
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dateKey: `${year}-${pad2(month)}-${pad2(date)}`,
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
 * 15분마다 호출되는 cron (또는 수동 호출).
 * 방송일·방송시간(KST)이 지난 커플매칭 미션에 대해 다음 회차를 자동으로 open 처리.
 * 로컬 개발 시 인증 없이 GET 호출 가능 (쿼리 ?dev=1).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const isDevManual =
      process.env.NODE_ENV === "development" &&
      request.nextUrl.searchParams.get("dev") === "1";

    if (!isDevManual) {
      if (!cronSecret && !isVercelCron) {
        return NextResponse.json(
          { error: "CRON_SECRET not configured" },
          { status: 501 }
        );
      }
      if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
      const missionRef = adminDb.collection("missions2").doc(doc.id);

      const txResult = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(missionRef);
        if (!snap.exists) return { opened: false as const, reason: "missing" as const };

        const mission = snap.data() as any;
        const broadcastDay = mission.broadcastDay as string | undefined;
        const broadcastTime = mission.broadcastTime as string | undefined;
        const episodeStatuses = (mission.episodeStatuses ?? {}) as Record<string, string>;
        const lastAutoOpenDateKey = mission[LAST_AUTO_OPEN_DATE_KEY_FIELD] as string | undefined;

        if (!broadcastDay || !broadcastTime) return { opened: false as const, reason: "no_schedule" as const };

        const targetDayNum = DAY_MAP[broadcastDay];
        if (targetDayNum === undefined) return { opened: false as const, reason: "bad_day" as const };
        if (kst.day !== targetDayNum) return { opened: false as const, reason: "not_today" as const };

        const [hourRaw, minuteRaw] = broadcastTime.split(":");
        const hour = Number(hourRaw);
        const minute = Number(minuteRaw);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
          return { opened: false as const, reason: "bad_time" as const };
        }
        if (kst.hour < hour || (kst.hour === hour && kst.minute < minute)) {
          return { opened: false as const, reason: "too_early" as const };
        }

        // 핵심: 방송일(오늘)에는 하루 1번만 자동 오픈 (중복 호출/여러 스케줄러에도 안전)
        if (lastAutoOpenDateKey === kst.dateKey) {
          return { opened: false as const, reason: "already_opened_today" as const };
        }

        const episodeNos = Object.keys(episodeStatuses)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => b - a);
        const latestEp = episodeNos[0] ?? 0;
        const nextEp = latestEp + 1;

        const updateData: Record<string, any> = {
          [`episodeStatuses.${nextEp}`]: "open",
          [`episodeDates.${nextEp}`]: kst.dateKey,
          updatedAt: FieldValue.serverTimestamp(),
          [LAST_AUTO_OPEN_DATE_KEY_FIELD]: kst.dateKey,
        };

        // 새 회차가 열리면 이전 회차는 마감(settled) 처리
        if (latestEp > 0) {
          updateData[`episodeStatuses.${latestEp}`] = "settled";
        }

        tx.update(missionRef, updateData);
        return { opened: true as const, nextEp, latestEp };
      });

      if (txResult.opened) {
        openedCount++;
        console.log(
          `[match-episode-open] 미션 ${doc.id}: ${txResult.nextEp}회차 자동 오픈 (이전 ${txResult.latestEp}회차 settled)`
        );
      }
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
