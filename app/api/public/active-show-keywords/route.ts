import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { SHOWS } from "@/lib/constants/shows";
import type { TShow } from "@/lib/constants/shows";

/**
 * 활성(열림+노출) 프로그램의 displayName 목록.
 * 마케팅 봇 로컬 스케줄러(6시 자동 미션)에서 키워드로 사용.
 */
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ keywords: [] }, { status: 200 });
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
      if (statuses[show.id] !== false && visibility[show.id] !== false) {
        keywords.push(show.displayName);
      }
    }
    return NextResponse.json({ keywords });
  } catch (e) {
    console.error("[active-show-keywords]", e);
    return NextResponse.json({ keywords: [] }, { status: 200 });
  }
}
