import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import path from "path"

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role Key for admin access
const googleApiKey = process.env.GOOGLE_API_KEY

if (!supabaseUrl || !supabaseKey || !googleApiKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const genAI = new GoogleGenerativeAI(googleApiKey)
const model = genAI.getGenerativeModel({ model: "text-embedding-004" })

async function backfillTable(tableName: string, idColumn: string) {
    console.log(`Starting backfill for ${tableName}...`)

    // Fetch missions without embeddings
    const { data: missions, error } = await supabase
        .from(tableName)
        .select(`${idColumn}, f_title`)
        .is("embedding", null)

    if (error) {
        console.error(`Error fetching ${tableName}:`, error)
        return
    }

    console.log(`Found ${missions.length} missions to process in ${tableName}`)

    let successCount = 0
    let failCount = 0

    for (const mission of missions) {
        try {
            console.log(`Processing: ${mission.f_title}`)

            const result = await model.embedContent(mission.f_title)
            const embedding = result.embedding.values

            const { error: updateError } = await supabase
                .from(tableName)
                .update({ embedding: embedding })
                .eq(idColumn, mission[idColumn])

            if (updateError) {
                console.error(`Update failed for ${mission.f_title}:`, updateError)
                failCount++
            } else {
                successCount++
            }

            // Rate limiting (simple delay)
            await new Promise(resolve => setTimeout(resolve, 200))

        } catch (e) {
            console.error(`Embedding failed for ${mission.f_title}:`, e)
            failCount++
        }
    }

    console.log(`Finished ${tableName}: ${successCount} success, ${failCount} failed`)
}

async function main() {
    await backfillTable("t_missions1", "f_id")
    await backfillTable("t_missions2", "f_id")
}

main()
