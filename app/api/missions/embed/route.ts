import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, title, table } = body

        if (!id || !title || !table) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (!process.env.GOOGLE_API_KEY) {
            console.error("Missing GOOGLE_API_KEY")
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" })

        const result = await model.embedContent(title)
        const embedding = result.embedding.values

        const supabase = createServiceClient()

        // Determine the correct ID column based on table convention
        // t_missions1 uses 'f_id', t_missions2 uses 'f_id' based on previous file reads
        const idColumn = 'f_id'

        const { error } = await supabase
            .from(table)
            .update({ embedding: embedding })
            .eq(idColumn, id)

        if (error) {
            console.error(`Failed to update embedding for ${table}/${id}:`, error)
            return NextResponse.json({ error: "Database update failed" }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Embedding generation failed:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
