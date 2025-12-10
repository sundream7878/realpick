import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMission() {
    // Search in both tables
    const { data: m1 } = await supabase.from("t_missions1").select("f_id, f_title, embedding").ilike("f_title", "%현숙%광수%")
    const { data: m2 } = await supabase.from("t_missions2").select("f_id, f_title, embedding").ilike("f_title", "%현숙%광수%")

    const missions = [...(m1 || []), ...(m2 || [])]

    console.log(`Found ${missions.length} missions matching '현숙%광수'`)

    missions.forEach(m => {
        const hasEmbedding = m.embedding && m.embedding.length > 0
        console.log(`- [${m.f_title}] Has Embedding: ${hasEmbedding} (Length: ${m.embedding?.length})`)
    })
}

checkMission()
