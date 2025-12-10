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

        // 2. AI Semantic Similarity Check (LLM Only - gemini-2.0-flash-exp)
        if (process.env.GOOGLE_API_KEY) {
            try {
                // Fetch recent missions for context (limit 25 from each table)
                // We rely on LLM with recent context because vector search API is unreliable.
                let query1 = supabase.from("t_missions1").select("f_title").order("f_created_at", { ascending: false }).limit(25)
                let query2 = supabase.from("t_missions2").select("f_title").order("f_created_at", { ascending: false }).limit(25)

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
                    console.log("[Verify] Checking against", existingTitles.length, "recent titles")

                    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
                    // Use gemini-2.0-flash-exp as it is confirmed working
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

                    const prompt = `
                    You are an AGGRESSIVE duplicate detector. Your goal is to BLOCK duplicate missions.
                    If a new title has the SAME CORE TOPIC or OPINION as an existing title, it is a DUPLICATE.
                    
                    Existing Titles: ${JSON.stringify(existingTitles)}
                    New Title: "${title}"
                    
                    CRITERIA FOR DUPLICATE (BE STRICT):
                    1. Same core meaning (e.g., "옥순의 이름은 이쁜 것 같다" == "옥순의 이름 이쁨")
                    2. Same question with different grammar (e.g., "Who is the best?" == "The best person is?")
                    3. Abbreviations vs Full names (e.g., "I am Solo" == "I'm Solo", "나솔" == "나는 솔로")
                    4. Minor variations in spacing, particles, or punctuation.
                    5. Question vs Statement about the same topic (e.g., "Is she pretty?" == "She seems pretty")
                    6. Modifiers or Emphasis (e.g., "누가봐도 현숙은 광수를 좋아한다" == "현숙은 광수를 좋아한다") - IGNORE prefixes like "Honestly", "I think", "Everyone knows".

                    IMPORTANT EXCEPTIONS (TREATED AS DIFFERENT):
                    1. Observation ("A likes B") vs Wish ("I hope A and B date") vs Compatibility ("A and B look good together"). These are DISTINCT.
                    2. Specific vs General (e.g., "Hyun-sook's dress is pretty" != "Hyun-sook is pretty").
                    3. "Matching well" (어울린다) does NOT mean "Liking" (좋아한다). Treat them as SEPARATE topics.

                    If it is a duplicate or semantically very similar, return JSON: 
                    {"isDuplicate": true, "similarTitle": "The Existing Title", "reason": "한글로 구체적인 중복 사유를 적어주세요 (예: 의미가 동일한 문장입니다)."}

                    If it is unique and has a distinct topic, nuance, or intent, return JSON: 
                    {"isDuplicate": false}

                    Return ONLY JSON.
                    `

                    const result = await model.generateContent(prompt)
                    const response = result.response
                    const text = response.text()
                    console.log("[Verify] AI Raw Response:", text)

                    // Clean up markdown code blocks if present
                    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim()

                    try {
                        const jsonResult = JSON.parse(jsonStr)
                        console.log("[Verify] Parsed Result:", jsonResult)

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
                    } catch (parseError) {
                        console.error("[Verify] Failed to parse LLM JSON:", parseError)
                    }
                } else {
                    console.log("[Verify] No recent titles found for comparison.")
                }

            } catch (e) {
                console.error("[Verify] LLM check failed:", e)
                // Fallback: allow if LLM fails to avoid blocking user
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
