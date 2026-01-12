import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        // 1. Auth check
        const authHeader = request.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        const userId = decodedToken.uid

        // Check role
        const userDoc = await adminDb.collection("users").doc(userId).get()
        const userData = userDoc.data()

        if (!userData || (userData.role !== 'DEALER' && userData.role !== 'MAIN_DEALER' && userData.role !== 'ADMIN')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // 2. Fetch all dealers
        const dealersQuery = await adminDb.collection("users")
            .where("role", "in", ["DEALER", "MAIN_DEALER", "ADMIN"])
            .get()

        const dealers = dealersQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        // Fetch all missions to aggregate stats
        const [missions1Query, missions2Query] = await Promise.all([
            adminDb.collection("missions1").get(),
            adminDb.collection("missions2").get()
        ])

        const missions1 = missions1Query.docs.map(doc => doc.data())
        const missions2 = missions2Query.docs.map(doc => doc.data())

        const stats = dealers.map((dealer: any) => {
            const m1 = missions1.filter(m => m.creatorId === dealer.id)
            const m2 = missions2.filter(m => m.creatorId === dealer.id)

            const missionCount = m1.length + m2.length
            const participants1 = m1.reduce((sum, m) => sum + (m.participants || 0), 0)
            const participants2 = m2.reduce((sum, m) => sum + (m.participants || 0), 0)

            return {
                id: dealer.id,
                nickname: dealer.nickname,
                tier: dealer.tier,
                role: dealer.role,
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
