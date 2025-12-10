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
const model = genAI.getGenerativeModel({ model: "text-embedding-004" })

async function main() {
    const text = "현숙은 광수에게 마음이 있다"
    console.log(`Generating embedding for: ${text}`)

    const result = await model.embedContent(text)
    const embedding = result.embedding.values

    console.log("Calling match_missions RPC...")
    const { data, error } = await supabase.rpc('match_missions', {
        query_embedding: embedding,
        match_threshold: 0.8,
        match_count: 10
    })

    if (error) {
        console.error("RPC Error:", error)
    } else {
        console.log("RPC Results:", data)
    }
}

main()
