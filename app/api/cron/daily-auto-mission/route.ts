import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { SHOWS } from "@/lib/constants/shows";
import type { TShow } from "@/lib/constants/shows";

/**
 * 매일 새벽 6시(KST) 실행: 지난 24시간 영상 수집 → 투표 가치 선정 → 선정된 영상만 미션 생성
 * 마케팅 봇 백엔드 run-daily-auto-mission 호출.
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

    const marketingBotUrl = process.env.MARKETING_BOT_API_URL || "http://localhost:3001";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const [statusDoc, visibilityDoc] = await Promise.all([
      adminDb.collection("admin_settings").doc("SHOW_STATUSES").get(),
      adminDb.collection("admin_settings").doc("SHOW_VISIBILITY").get(),
    ]);

    let statuses: Record<string, boolean> = statusDoc.exists ? (statusDoc.data()?.value as Record<string, boolean>) || {} : {};
    let visibility: Record<string, boolean> = visibilityDoc.exists ? (visibilityDoc.data()?.value as Record<string, boolean>) || {} : {};

    if (typeof statuses === "string") {
      try {
        statuses = JSON.parse(statuses);
      } catch {
        statuses = {};
      }
    }
    if (typeof visibility === "string") {
      try {
        visibility = JSON.parse(visibility);
      } catch {
        visibility = {};
      }
    }

    const keywords: string[] = [];
    const allShows = (Object.values(SHOWS) as TShow[][]).flat();
    for (const show of allShows) {
      const open = statuses[show.id] !== false;
      const visible = visibility[show.id] !== false;
      if (open && visible) {
        keywords.push(show.displayName);
      }
    }

    if (keywords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "활성 프로그램 없음",
        keywords: 0,
      });
    }

    const res = await fetch(`${marketingBotUrl.replace(/\/$/, "")}/api/youtube/run-daily-auto-mission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: cronSecret ? `Bearer ${cronSecret}` : "",
      },
      body: JSON.stringify({
        keywords,
        baseUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[daily-auto-mission] 마케팅 봇 호출 실패:", res.status, data);
      return NextResponse.json(
        { error: data.error || "Marketing bot request failed", status: res.status },
        { status: 502 }
      );
    }

    console.log(
      `[daily-auto-mission] 완료: 수집 ${data.totalCollected ?? 0} → 선정 ${data.totalScreened ?? 0} → 미션 ${data.totalMissionsCreated ?? 0}개`
    );

    return NextResponse.json({
      success: true,
      totalCollected: data.totalCollected,
      totalScreened: data.totalScreened,
      totalMissionsCreated: data.totalMissionsCreated,
      keywords: keywords.length,
    });
  } catch (error: any) {
    console.error("[daily-auto-mission] 오류:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
