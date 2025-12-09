import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createServiceClient()
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
