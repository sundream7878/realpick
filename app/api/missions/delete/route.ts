import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from("t_users")
      .select("f_role")
      .eq("f_id", user.id)
      .single()

    if (userError) {
      console.error("사용자 정보 조회 실패:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userRole = userData?.f_role?.toUpperCase()
    if (userRole !== "ADMIN") {
      console.log("권한 없음:", { userId: user.id, role: userData?.f_role })
      return NextResponse.json({ 
        error: "Forbidden",
        details: `Admin role required. Current role: ${userData?.f_role}` 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const missionId = searchParams.get("missionId")
    const missionType = searchParams.get("missionType") || "mission1" // mission1 or mission2

    if (!missionId) {
      return NextResponse.json({ error: "Mission ID is required" }, { status: 400 })
    }

    // Delete related data first (votes, comments, etc.)
    if (missionType === "mission2") {
      // Delete votes for mission2
      const { error: votesError } = await supabase
        .from("t_pickresult2")
        .delete()
        .eq("f_mission_id", missionId)
      
      if (votesError) {
        console.error("투표 데이터 삭제 실패:", votesError)
        // Continue anyway, might not have votes
      }
    } else {
      // Delete votes for mission1
      const { error: votesError } = await supabase
        .from("t_pickresult1")
        .delete()
        .eq("f_mission_id", missionId)
      
      if (votesError) {
        console.error("투표 데이터 삭제 실패:", votesError)
        // Continue anyway, might not have votes
      }
    }

    // Delete comments (if exists)
    const { error: commentsError } = await supabase
      .from("t_comments")
      .delete()
      .eq("f_mission_id", missionId)
    
    if (commentsError) {
      console.error("댓글 삭제 실패:", commentsError)
      // Continue anyway, might not have comments
    }

    // Delete point logs related to this mission
    const { error: pointLogsError } = await supabase
      .from("t_pointlogs")
      .delete()
      .eq("f_mission_id", missionId)
    
    if (pointLogsError) {
      console.error("포인트 로그 삭제 실패:", pointLogsError)
      // Continue anyway
    }

    // Delete from appropriate table
    const tableName = missionType === "mission2" ? "t_missions2" : "t_missions1"
    
    const { error, data } = await supabase
      .from(tableName)
      .delete()
      .eq("f_id", missionId)
      .select()

    if (error) {
      console.error("미션 삭제 실패:", error)
      return NextResponse.json({ 
        error: "Failed to delete mission",
        details: error.message 
      }, { status: 500 })
    }

    console.log("미션 삭제 성공:", missionId, "삭제된 레코드:", data)

    return NextResponse.json({ success: true, deleted: data })
  } catch (error) {
    console.error("미션 삭제 중 오류:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

