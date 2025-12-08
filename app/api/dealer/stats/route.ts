
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        // 1. Auth check
        const supabase = createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check role
        const { data: userData, error: userError } = await supabase
            .from("t_users")
            .select("f_role")
            .eq("f_id", user.id)
            .single()

        if (userError || !userData || (userData.f_role !== 'DEALER' && userData.f_role !== 'MAIN_DEALER' && userData.f_role !== 'ADMIN')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // 2. Fetch all dealers using Service Role Key
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Fetch dealers
        const { data: dealers, error: dealersError } = await supabaseAdmin
            .from("t_users")
            .select("f_id, f_nickname, f_tier, f_role")
            .in("f_role", ["DEALER", "MAIN_DEALER"])

        if (dealersError) {
            console.error("Error fetching dealers:", dealersError)
            return NextResponse.json({ error: "Failed to fetch dealers" }, { status: 500 })
        }

        // Fetch all missions to aggregate stats
        // Note: In a production app with many missions, we would use a SQL view or RPC.
        // For now, fetching selected columns is acceptable.
        const { data: missions1, error: m1Error } = await supabaseAdmin
            .from("t_missions1")
            .select("f_creator_id, f_stats_participants")

        const { data: missions2, error: m2Error } = await supabaseAdmin
            .from("t_missions2")
            .select("f_creator_id, f_stats_participants")

        if (m1Error || m2Error) {
            console.error("Error fetching missions:", m1Error || m2Error)
            return NextResponse.json({ error: "Failed to fetch mission stats" }, { status: 500 })
        }

        const stats = dealers.map(dealer => {
            const m1 = missions1?.filter(m => m.f_creator_id === dealer.f_id) || []
            const m2 = missions2?.filter(m => m.f_creator_id === dealer.f_id) || []

            const missionCount = m1.length + m2.length
            const participants1 = m1.reduce((sum, m) => sum + (m.f_stats_participants || 0), 0)
            const participants2 = m2.reduce((sum, m) => sum + (m.f_stats_participants || 0), 0)

            return {
                id: dealer.f_id,
                nickname: dealer.f_nickname,
                tier: dealer.f_tier,
                role: dealer.f_role,
                missionCount,
                totalParticipants: participants1 + participants2
            }
        })

        // Sort by total participants desc
        stats.sort((a, b) => b.totalParticipants - a.totalParticipants)

        return NextResponse.json({ success: true, stats })

    } catch (error) {
        console.error("Error fetching dealer stats:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
