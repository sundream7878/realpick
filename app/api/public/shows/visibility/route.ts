import { adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const doc = await adminDb.collection("admin_settings").doc("SHOW_VISIBILITY").get()
        
        let visibility = doc.exists ? doc.data()?.value : {}
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
    } catch (error: any) {
        console.error("[Public Show Visibility API] Unexpected error:", error)
        return NextResponse.json(
            { visibility: {} },
            { status: 200 }
        )
    }
}
