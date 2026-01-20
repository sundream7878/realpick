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

    const { searchParams } = new URL(request.url)
    const missionId = searchParams.get("missionId")
    const missionType = searchParams.get("missionType") || "mission1" // mission1, mission2, or ai_mission

    if (!missionId) {
      return NextResponse.json({ error: "Mission ID is required" }, { status: 400 })
    }

    // Get mission to check creator - support ai_mission
    let missionTable = "missions1"
    if (missionType === "mission2") {
      missionTable = "missions2"
    } else if (missionType === "ai_mission") {
      missionTable = "ai_mission"
    }
    
    const missionDoc = await adminDb.collection(missionTable).doc(missionId).get()
    
    if (!missionDoc.exists) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 })
    }

    const missionData = missionDoc.data()
    const creatorId = missionData?.creatorId || missionData?.userId

    // Check if user is admin or creator
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()
    const isAdmin = userData?.role?.toUpperCase() === "ADMIN"
    const isCreator = userId === creatorId

    if (!isAdmin && !isCreator) {
      console.log("권한 없음:", { userId, role: userData?.role, creatorId, isAdmin, isCreator })
      return NextResponse.json({ 
        error: "Forbidden",
        details: `관리자이거나 미션 생성자만 삭제할 수 있습니다.` 
      }, { status: 403 })
    }

    console.log("삭제 권한 확인:", { userId, role: userData?.role, creatorId, isAdmin, isCreator })

    // Delete related data first (votes, comments, etc.)
    const batch = adminDb.batch()

    // 1. Delete votes
    // AI 미션은 pickresult1에 저장됨
    const votesCollection = missionType === "mission2" ? "pickresult2" : "pickresult1"
    const votesQuery = await adminDb.collection(votesCollection).where("missionId", "==", missionId).get()
    console.log(`투표 데이터 삭제: ${votesQuery.size}개`)
    votesQuery.forEach(doc => batch.delete(doc.ref))

    // 2. Delete comments
    const commentsQuery = await adminDb.collection("comments").where("missionId", "==", missionId).get()
    console.log(`댓글 데이터 삭제: ${commentsQuery.size}개`)
    commentsQuery.forEach(doc => batch.delete(doc.ref))

    // 3. Delete point logs
    const pointLogsQuery = await adminDb.collection("pointlogs").where("missionId", "==", missionId).get()
    console.log(`포인트 로그 삭제: ${pointLogsQuery.size}개`)
    pointLogsQuery.forEach(doc => batch.delete(doc.ref))

    // 4. Delete the mission itself
    batch.delete(adminDb.collection(missionTable).doc(missionId))

    await batch.commit()

    console.log(`미션 삭제 성공: ${missionId} (테이블: ${missionTable})`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("미션 삭제 중 오류:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

