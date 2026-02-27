import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

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

    const episodeStatuses: Record<number, string> =
      data.episodeStatuses ?? {};
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

    await missionRef.update({
      [`episodeStatuses.${nextEp}`]: "open",
      updatedAt: FieldValue.serverTimestamp(),
    });

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
