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
    const { data: userData } = await supabase
      .from("t_users")
      .select("f_role")
      .eq("f_id", user.id)
      .single()

    if (userData?.f_role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const missionId = searchParams.get("missionId")
    const missionType = searchParams.get("missionType") || "mission1" // mission1 or mission2

    if (!missionId) {
      return NextResponse.json({ error: "Mission ID is required" }, { status: 400 })
    }

    // Delete from appropriate table
    const tableName = missionType === "mission2" ? "t_missions2" : "t_missions1"
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("f_id", missionId)

    if (error) {
      console.error("미션 삭제 실패:", error)
      return NextResponse.json({ error: "Failed to delete mission" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("미션 삭제 중 오류:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

