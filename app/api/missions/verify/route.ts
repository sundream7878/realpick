import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, description, showId } = body

        if (!title) {
            return NextResponse.json({
                status: "revise",
                reasons: ["제목을 입력해주세요."],
                suggestions: []
            })
        }

        const supabase = createServiceClient()

        // 1. Exact Match Check (DB)
        const { data: exact1 } = await supabase
            .from("t_missions1")
            .select("f_title")
            .ilike("f_title", title.trim())
            .limit(1)

        const { data: exact2 } = await supabase
            .from("t_missions2")
            .select("f_title")
            .ilike("f_title", title.trim())
            .limit(1)

        if ((exact1 && exact1.length > 0) || (exact2 && exact2.length > 0)) {
            return NextResponse.json({
                status: "revise",
                reasons: ["이미 동일한 제목의 미션이 존재합니다."],
                suggestions: ["기존 미션을 검색해보세요.", "제목에 회차나 날짜를 추가하여 구별해주세요."]
            })
        }

        // 2. AI Semantic Similarity Check (Gemini 1.5 Flash)
        if (process.env.GOOGLE_API_KEY) {
            // Fetch recent titles for context (limit 40 combined)
            let query1 = supabase.from("t_missions1").select("f_title").order("created_at", { ascending: false }).limit(20)
            let query2 = supabase.from("t_missions2").select("f_title").order("created_at", { ascending: false }).limit(20)

            if (showId) {
                query1 = query1.eq("f_show_id", showId)
                query2 = query2.eq("f_show_id", showId)
            }

            const [res1, res2] = await Promise.all([query1, query2])
            const existingTitles = [
                ...(res1.data?.map(m => m.f_title) || []),
                ...(res2.data?.map(m => m.f_title) || [])
            ]

            if (existingTitles.length > 0) {
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

                const prompt = `
                You are a mission title validator. Check if the new title is semantically too similar to any existing titles.
                
                Existing Titles: ${JSON.stringify(existingTitles)}
                New Title: "${title}"
                
                If it's a duplicate or extremely similar (e.g. "I am Solo" vs "I'm Solo"), return JSON: {"isDuplicate": true, "similarTitle": "Existing Title", "reason": "Reason"}.
                If it's unique, return JSON: {"isDuplicate": false}.
                Ignore minor spacing or case differences as they are already checked.
                Return ONLY JSON.
                `

                const result = await model.generateContent(prompt)
                const response = result.response
                const text = response.text()

                // Clean up markdown code blocks if present
                const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim()
                const jsonResult = JSON.parse(jsonStr)

                if (jsonResult.isDuplicate) {
                    return NextResponse.json({
                        status: "revise",
                        reasons: [`유사한 미션이 이미 존재합니다: "${jsonResult.similarTitle}"`],
                        suggestions: [
                            "기존 미션과 다른 주제로 작성해주세요.",
                            "더 구체적인 내용을 포함하여 차별화해주세요."
                        ]
                    })
                }
            }
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
