import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
    try {
        const { newPassword } = await request.json()

        // 1. Check requester auth
        const authHeader = request.headers.get("Authorization")
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const idToken = authHeader.split("Bearer ")[1]
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        const currentUserId = decodedToken.uid

        // Check if user is admin
        const userDoc = await adminDb.collection("users").doc(currentUserId).get()
        const userData = userDoc.data()

        if (!userDoc.exists || userData?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // 2. Hash new password
        const newHash = crypto.createHash("sha256").update(newPassword).digest("hex")

        // 3. Update config in Firestore
        await adminDb.collection("config").doc("admin_password").set({
            hash: newHash,
            updatedBy: currentUserId,
            updatedAt: new Date()
        }, { merge: true })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Admin auth update error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
