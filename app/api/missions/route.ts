import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Creating mission:", body)

    // Mock mission creation
    // In production, this would save to a database

    const mission = {
      id: Math.random().toString(36).substring(7),
      ...body,
      createdAt: new Date().toISOString(),
      stats: {
        participants: 0,
      },
      status: "active",
    }

    return NextResponse.json(mission)
  } catch (error) {
    console.error("[v0] Mission creation error:", error)
    return NextResponse.json({ error: "미션 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}
