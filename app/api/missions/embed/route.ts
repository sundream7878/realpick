import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, title, table } = body

        if (!id || !title || !table) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 환경 변수 체크
        if (!process.env.GOOGLE_API_KEY) {
            console.error("[Embed] Missing GOOGLE_API_KEY")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" })

        const result = await model.embedContent(title)
        const embedding = result.embedding.values

        // Firestore collection name mapping
        const collectionName = table.startsWith('t_') ? table.substring(2) : table

        await adminDb.collection(collectionName).doc(id).update({
            embedding: embedding
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Embedding generation failed:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
