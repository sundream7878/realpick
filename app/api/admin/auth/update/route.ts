import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
    try {
        const { newPassword } = await request.json()
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

        // Hash new password
        const newHash = crypto.createHash("sha256").update(newPassword).digest("hex")

        // Upsert config
        const { error } = await supabase
            .from("t_admin_config")
            .upsert({
                key: "admin_password_hash",
                value: newHash,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            })

        if (error) {
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Admin auth update error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
