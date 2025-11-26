import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Mock AI validation logic
    // In production, this would call an actual AI service

    // Basic validation checks
    const { title, options, matchPairs } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({
        status: "revise",
        reasons: ["제목이 비어있습니다."],
        suggestions: ["미션 제목을 입력해주세요."],
      })
    }

    if (title.length < 5) {
      return NextResponse.json({
        status: "revise",
        reasons: ["제목이 너무 짧습니다."],
        suggestions: ["미션 제목은 최소 5자 이상이어야 합니다."],
      })
    }

    // Check if options are filled
    if (options && options.length > 0) {
      const emptyOptions = options.filter((opt: string) => !opt || opt.trim().length === 0)
      if (emptyOptions.length > 0) {
        return NextResponse.json({
          status: "revise",
          reasons: ["일부 선택지가 비어있습니다."],
          suggestions: ["모든 선택지를 입력해주세요."],
        })
      }
    }

    // Check match pairs
    if (matchPairs) {
      const { left, right } = matchPairs
      if (!left || left.length === 0 || !right || right.length === 0) {
        return NextResponse.json({
          status: "revise",
          reasons: ["매칭 대상이 부족합니다."],
          suggestions: ["남성과 여성 항목을 모두 입력해주세요."],
        })
      }
    }

    // If all checks pass
    return NextResponse.json({
      status: "pass",
      reasons: [],
      suggestions: [],
    })
  } catch (error) {
    console.error("[v0] AI validation error:", error)
    return NextResponse.json({ error: "AI 검증 중 오류가 발생했습니다." }, { status: 500 })
  }
}
