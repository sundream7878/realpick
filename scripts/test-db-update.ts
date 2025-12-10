import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
console.log("Script Supabase URL:", supabaseUrl.substring(0, 20) + "...")

async function testUpdate() {
    console.log("Fetching current statuses...")
    const { data, error } = await supabase
        .from("t_admin_settings")
        .select("value")
        .eq("key", "SHOW_STATUSES")
        .single()

    if (error) {
        console.error("Fetch error:", error)
        return
    }

    let statuses = {}
    if (data?.value) {
        try {
            statuses = JSON.parse(data.value)
        } catch (e) {
            console.error("Parse error:", e)
        }
    }
    console.log("Current statuses:", statuses)

    // Update univ-war2 to UPCOMING
    const newStatuses = { ...statuses, "univ-war2": "UPCOMING" }
    console.log("Updating with:", newStatuses)

    const { error: updateError } = await supabase
        .from("t_admin_settings")
        .upsert({
            key: "SHOW_STATUSES",
            value: JSON.stringify(newStatuses),
            updated_at: new Date().toISOString()
        })

    if (updateError) {
        console.error("Update error:", updateError)
    } else {
        console.log("Update success!")
    }
}

testUpdate()
