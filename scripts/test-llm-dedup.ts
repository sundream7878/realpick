import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleApiKey = process.env.GOOGLE_API_KEY

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const genAI = new GoogleGenerativeAI(googleApiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

async function check(newTitle: string, existingTitles: string[]) {
    console.log(`\nChecking: "${newTitle}" against [${existingTitles.length} existing]`)

    const prompt = `
    You are an AGGRESSIVE duplicate detector. Your goal is to BLOCK duplicate missions.
    If a new title has the SAME CORE TOPIC or OPINION as an existing title, it is a DUPLICATE.
    
    Existing Titles: ${JSON.stringify(existingTitles)}
    New Title: "${newTitle}"
    
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
    {"isDuplicate": true, "similarTitle": "The Existing Title", "reason": "Reason in Korean"}

    If it is unique and has a distinct topic, nuance, or intent, return JSON: 
    {"isDuplicate": false}

    Return ONLY JSON.
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    console.log("LLM Response:", text.replace(/```json\n?|\n?```/g, "").trim())
}

async function main() {
    const existing = ["현숙은 광수를 좋아한다"]

    await check("현숙과 광수는 잘 어울린다", existing) // Should be FALSE
    await check("현숙과 광수는 커플이 됐으면 좋겠다", existing) // Should be FALSE
    await check("현숙이 광수를 좋아하는 것 같다", existing) // Should be TRUE
}

main()
