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

        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_STATUSES")
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                // 레코드가 없는 경우는 정상 (빈 상태 반환)
                return NextResponse.json({ statuses: {} }, { status: 200 })
            }
            
            console.error("Error fetching show statuses:", error)
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            })
            
            // API 키 오류인 경우 명확한 메시지 반환
            if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
                return NextResponse.json(
                    { 
                        error: "Invalid Supabase API key",
                        details: "SUPABASE_SERVICE_ROLE_KEY is invalid or expired",
                        hint: "Check Netlify environment variables"
                    }, 
                    { status: 500 }
                )
            }
            
            return NextResponse.json(
                { 
                    error: "Failed to fetch show statuses",
                    details: error.message,
                    code: error.code
                }, 
                { status: 500 }
            )
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
