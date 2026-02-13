import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { createDailyMissionBatchNotification } from "@/lib/firebase/admin-notifications";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘 KST 기준 정오(00:00~12:00) 또는 저녁(12:00~19:00) 구간의 start/end Date (UTC) */
function getKstWindow(slot: "noon" | "evening"): { start: Date; end: Date } {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  const d = kstNow.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;

  const startNoon = new Date(`${dateStr}T00:00:00+09:00`);
  const endNoon = new Date(`${dateStr}T12:00:00+09:00`);
  const endEvening = new Date(`${dateStr}T19:00:00+09:00`);

  if (slot === "noon") return { start: startNoon, end: endNoon };
  return { start: endNoon, end: endEvening };
}

/**
 * 매일 정오(12:00)·저녁(19:00) KST에 호출되는 cron.
 * 해당 구간에 생성된 미션을 모아 인앱 알림 + 이메일 1회씩 발송.
 * 인증: Authorization: Bearer ${CRON_SECRET} 또는 x-vercel-cron: 1
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";

    if (!cronSecret && !isVercelCron) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 501 });
    }
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let slot = searchParams.get("slot") as "noon" | "evening" | null;
    if (!slot || (slot !== "noon" && slot !== "evening")) {
      const kstNow = new Date(Date.now() + KST_OFFSET_MS);
      const hour = kstNow.getUTCHours();
      if (hour >= 11 && hour < 14) slot = "noon";
      else if (hour >= 18 && hour < 21) slot = "evening";
      else {
        return NextResponse.json({ success: true, message: "Not in notification window", sent: 0 });
      }
    }

    const { start, end } = getKstWindow(slot);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const [snap1, snap2] = await Promise.all([
      adminDb
        .collection("missions1")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "asc")
        .get(),
      adminDb
        .collection("missions2")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "asc")
        .get(),
    ]);

    const missions: Array<{
      id: string;
      title: string;
      category?: string;
      showId?: string;
      creatorNickname?: string;
    }> = [];

    snap1.docs.forEach((doc) => {
      const d = doc.data();
      missions.push({
        id: doc.id,
        title: d.title || "",
        category: d.category,
        showId: d.showId,
        creatorNickname: d.creatorNickname,
      });
    });
    snap2.docs.forEach((doc) => {
      const d = doc.data();
      missions.push({
        id: doc.id,
        title: d.title || "",
        category: d.category,
        showId: d.showId,
        creatorNickname: d.creatorNickname,
      });
    });

    if (missions.length === 0) {
      console.log(`[Cron Daily Notif] ${slot} 구간 미션 없음`);
      return NextResponse.json({ success: true, message: "No missions in window", sent: 0 });
    }

    const result = await createDailyMissionBatchNotification({ missions, slot });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const notifRes = await fetch(`${baseUrl.replace(/\/$/, "")}/api/send-mission-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "batch",
        slot,
        missions: missions.map((m) => ({
          missionId: m.id,
          missionTitle: m.title,
          category: m.category,
          showId: m.showId,
        })),
      }),
    });
    const notifData = await notifRes.json().catch(() => ({}));

    console.log(`[Cron Daily Notif] ${slot} 완료: 미션 ${missions.length}개, 인앱 ${result.count}명, 이메일 ${notifData.sent ?? 0}명`);

    return NextResponse.json({
      success: true,
      slot,
      missionCount: missions.length,
      inAppSent: result.count,
      emailSent: notifData.sent ?? 0,
    });
  } catch (error: any) {
    console.error("[Cron Daily Notif] 오류:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
