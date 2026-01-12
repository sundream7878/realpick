import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Check if user is admin
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    if (userData?.role?.toUpperCase() !== "ADMIN") {
      console.log("권한 없음:", { userId, role: userData?.role })
      return NextResponse.json({ 
        error: "Forbidden",
        details: `Admin role required. Current role: ${userData?.role}` 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const missionId = searchParams.get("missionId")
    const missionType = searchParams.get("missionType") || "mission1" // mission1 or mission2

    if (!missionId) {
      return NextResponse.json({ error: "Mission ID is required" }, { status: 400 })
    }

    // Delete related data first (votes, comments, etc.)
    const batch = adminDb.batch()

    // 1. Delete votes
    const votesCollection = missionType === "mission2" ? "pickresult2" : "pickresult1"
    const votesQuery = await adminDb.collection(votesCollection).where("missionId", "==", missionId).get()
    votesQuery.forEach(doc => batch.delete(doc.ref))

    // 2. Delete comments
    const commentsQuery = await adminDb.collection("comments").where("missionId", "==", missionId).get()
    commentsQuery.forEach(doc => batch.delete(doc.ref))

    // 3. Delete point logs
    const pointLogsQuery = await adminDb.collection("pointlogs").where("missionId", "==", missionId).get()
    pointLogsQuery.forEach(doc => batch.delete(doc.ref))

    // 4. Delete the mission itself
    const missionTable = missionType === "mission2" ? "missions2" : "missions1"
    batch.delete(adminDb.collection(missionTable).doc(missionId))

    await batch.commit()

    console.log("미션 삭제 성공:", missionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("미션 삭제 중 오류:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

