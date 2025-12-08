import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
    try {
        const { password } = await request.json()
        const supabase = createClient()

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from("t_users")
            .select("f_role")
            .eq("f_id", user.id)
            .single()

        if (userData?.f_role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Get stored hash
        const { data: config } = await supabase
            .from("t_admin_config")
            .select("value")
            .eq("key", "admin_password_hash")
            .single()

        if (!config) {
            // If no password set, return special status
            return NextResponse.json({ status: "not_set" })
        }

        // Hash input password
        const inputHash = crypto.createHash("sha256").update(password).digest("hex")

        if (inputHash === config.value) {
            return NextResponse.json({ status: "success" })
        } else {
            return NextResponse.json({ status: "fail" })
        }
    } catch (error) {
        console.error("Admin auth verify error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
