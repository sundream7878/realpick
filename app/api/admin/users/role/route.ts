
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        console.log("[API] Role update request received")

        // 1. Check if the requester is authenticated and is an admin
        const supabase = createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error("[API] Unauthorized:", authError)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check if user has admin role
        const { data: userData, error: userError } = await supabase
            .from("t_users")
            .select("f_role")
            .eq("f_id", user.id)
            .single()

        if (userError || !userData || (userData.f_role !== 'ADMIN' && userData.f_role !== 'MAIN_DEALER')) {
            console.error("[API] Forbidden - User:", user.id)
            console.error("[API] Forbidden - DB Role Data:", userData)
            console.error("[API] Forbidden - Error:", userError)
            return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
        }

        // 2. Parse request body
        const body = await request.json()
        const { userId, role } = body
        console.log("[API] Updating user:", userId, "to role:", role)

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing userId or role" }, { status: 400 })
        }

        // 3. Use Service Role key to bypass RLS and update the user
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
            console.error("[API] Missing SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { error: updateError } = await supabaseAdmin
            .from("t_users")
            .update({ f_role: role })
            .eq("f_id", userId)

        if (updateError) {
            console.error("[API] Error updating user role:", updateError)
            return NextResponse.json({ error: "Failed to update role: " + updateError.message }, { status: 500 })
        }

        console.log("[API] Role update successful")
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[API] Unexpected error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
