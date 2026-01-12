import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        console.log("[API] Role update request received")

        // 1. Check if the requester is authenticated and is an admin
        const authHeader = request.headers.get("Authorization")
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        const currentUserId = decodedToken.uid

        // Check if user has admin role in Firestore
        const userDoc = await adminDb.collection("users").doc(currentUserId).get()
        const userData = userDoc.data()

        if (!userDoc.exists || !userData || (userData.role !== 'ADMIN' && userData.role !== 'MAIN_DEALER')) {
            console.error("[API] Forbidden - User:", currentUserId)
            return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 })
        }

        // 2. Parse request body
        const body = await request.json()
        const { userId, role } = body
        console.log("[API] Updating user:", userId, "to role:", role)

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing userId or role" }, { status: 400 })
        }

        // 3. Update user role in Firestore
        await adminDb.collection("users").doc(userId).update({
            role: role,
            updatedAt: new Date()
        })

        console.log("[API] Role update successful")
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("[API] Unexpected error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
