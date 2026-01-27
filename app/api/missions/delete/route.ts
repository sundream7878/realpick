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

    // Get mission to check creator - check both tables if needed
    let missionTable = "missions1"
    let missionDoc = null
    
    if (missionType === "mission2") {
      missionTable = "missions2"
      missionDoc = await adminDb.collection(missionTable).doc(missionId).get()
    } else if (missionType === "ai_mission" || missionType === "mission1") {
      missionTable = "missions1" // AI missions are stored in missions1 with isAIMission flag
      missionDoc = await adminDb.collection(missionTable).doc(missionId).get()
    }
    
    // If not found in the specified table, try the other one
    if (!missionDoc?.exists) {
      const alternateTable = missionTable === "missions1" ? "missions2" : "missions1"
      const alternateDoc = await adminDb.collection(alternateTable).doc(missionId).get()
      if (alternateDoc.exists) {
        missionTable = alternateTable
        missionDoc = alternateDoc
      }
    }
    
    if (!missionDoc?.exists) {
      console.log(`미션을 찾을 수 없음: ${missionId}, missionType: ${missionType}`)
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
    // missions1은 pickresult1에, missions2는 pickresult2에 저장됨
    // ai_mission도 missions1에 저장되므로 pickresult1 사용
    const votesCollection = missionTable === "missions2" ? "pickresult2" : "pickresult1"
    const votesQuery = await adminDb.collection(votesCollection).where("missionId", "==", missionId).get()
    console.log(`투표 데이터 삭제: ${votesQuery.size}개 (collection: ${votesCollection})`)
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

    console.log(`미션 삭제 성공: ${missionId} (테이블: ${missionTable}, 타입: ${missionType})`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("미션 삭제 중 오류:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

