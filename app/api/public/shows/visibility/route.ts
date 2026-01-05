import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // 환경 변수 체크
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("[Public Show Visibility API] Supabase 환경 변수가 설정되지 않았습니다.")
            return NextResponse.json({ visibility: {} }, { status: 200 })
        }

        let supabase;
        try {
            supabase = createServiceClient()
        } catch (error: any) {
            console.error("[Public Show Visibility API] Failed to create Supabase client:", error)
            return NextResponse.json(
                { 
                    error: "Failed to initialize Supabase client",
                    details: error.message,
                    hint: "Check SUPABASE_SERVICE_ROLE_KEY environment variable"
                }, 
                { status: 500 }
            )
        }

        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_VISIBILITY")
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                // No row found, return empty visibility (all visible by default)
                return NextResponse.json({ visibility: {} }, { status: 200 })
            }

            console.error("[Public Show Visibility API] Query error:", error)
            return NextResponse.json({ visibility: {} }, { status: 200 })
        }

        let visibility = data?.value
        if (typeof visibility === 'string') {
            try {
                visibility = JSON.parse(visibility)
            } catch (e) {
                console.error("[Public Show Visibility API] Failed to parse visibility JSON:", e)
                visibility = {}
            }
        }

        return NextResponse.json(
            { visibility: visibility || {} },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                }
            }
        )
    } catch (error) {
        console.error("[Public Show Visibility API] Unexpected error:", error)
        return NextResponse.json(
            { visibility: {} },
            { status: 200 }
        )
    }
}

