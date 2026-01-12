import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
    try {
        const { password } = await request.json()

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

        // 2. Get stored hash from Firestore (collection 'config')
        const configDoc = await adminDb.collection("config").doc("admin_password").get()
        const configData = configDoc.data()

        if (!configDoc.exists || !configData?.hash) {
            return NextResponse.json({ status: "not_set" })
        }

        // 3. Hash input and compare
        const inputHash = crypto.createHash("sha256").update(password).digest("hex")

        if (inputHash === configData.hash) {
            return NextResponse.json({ status: "success" })
        } else {
            return NextResponse.json({ status: "fail" })
        }
    } catch (error: any) {
        console.error("Admin auth verify error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
