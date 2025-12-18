import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 환경 변수 체크
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("[Public Shows API] Supabase 환경 변수가 설정되지 않았습니다.")
            return NextResponse.json({ statuses: {} })
        }

        const supabase = createServiceClient()
        console.log("[API] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...")

        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_STATUSES")
            .single()

        if (error && error.code !== "PGRST116") {
            console.error("Error fetching show statuses:", error)
            return NextResponse.json({ statuses: {} }, { status: 500 })
        }

        let statuses = {}
        if (data?.value) {
            try {
                statuses = JSON.parse(data.value)
            } catch (e) {
                console.error("Error parsing show statuses:", e)
            }
        }

        return NextResponse.json({ statuses })
    } catch (error) {
        console.error("Error in public shows API:", error)
        return NextResponse.json({ statuses: {} }, { status: 500 })
    }
}
