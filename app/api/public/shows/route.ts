import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 환경 변수 체크
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("[Public Shows API] Supabase 환경 변수가 설정되지 않았습니다.")
            return NextResponse.json({ statuses: {} }, { status: 200 })
        }

        let supabase;
        try {
            supabase = createServiceClient()
        } catch (error: any) {
            console.error("[Public Shows API] Failed to create Supabase client:", error)
            return NextResponse.json(
                { 
                    error: "Failed to initialize Supabase client",
                    details: error.message,
                    hint: "Check SUPABASE_SERVICE_ROLE_KEY environment variable"
                }, 
                { status: 500 }
            )
        }

        console.log("[API] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...")

        const { data: statusData, error: statusError } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_STATUSES")
            .single()

        const { data: visibilityData, error: visibilityError } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_VISIBILITY")
            .single()

        const { data: customShowsData, error: customShowsError } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "CUSTOM_SHOWS")
            .single()

        let statuses = {}
        if (statusData?.value) {
            try {
                statuses = JSON.parse(statusData.value)
            } catch (e) {
                console.error("Error parsing show statuses:", e)
            }
        }

        let visibility = {}
        if (visibilityData?.value) {
            try {
                visibility = JSON.parse(visibilityData.value)
            } catch (e) {
                console.error("Error parsing show visibility:", e)
            }
        }

        let customShows = []
        if (customShowsData?.value) {
            try {
                customShows = JSON.parse(customShowsData.value)
            } catch (e) {
                console.error("Error parsing custom shows:", e)
            }
        }

        return NextResponse.json({ statuses, visibility, customShows })
    } catch (error) {
        console.error("Error in public shows API:", error)
        return NextResponse.json({ statuses: {}, visibility: {}, customShows: [] }, { status: 500 })
    }
}
