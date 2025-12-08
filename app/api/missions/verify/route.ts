import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, description } = body

        // Simulate AI processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Mock Logic:
        // If title contains "fail" or "error", return 'revise' status.
        // Otherwise, return 'pass'.

        if (title.toLowerCase().includes("fail") || title.toLowerCase().includes("error") || title.toLowerCase().includes("중복")) {
            return NextResponse.json({
                status: "revise",
                reasons: [
                    "유사한 미션이 이미 존재합니다. (중복 감지)",
                    "미션 제목이 너무 모호합니다."
                ],
                suggestions: [
                    "다른 키워드를 사용하여 제목을 변경해주세요.",
                    "구체적인 시즌이나 회차를 명시해주세요."
                ]
            })
        }

        return NextResponse.json({
            status: "pass",
            reasons: [],
            suggestions: []
        })

    } catch (error) {
        console.error("Verification failed:", error)
        return NextResponse.json({ error: "Verification failed" }, { status: 500 })
    }
}
