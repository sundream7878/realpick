import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const googleApiKey = process.env.GOOGLE_API_KEY
if (!googleApiKey) { console.error("Missing API Key"); process.exit(1); }

const genAI = new GoogleGenerativeAI(googleApiKey)
const model = genAI.getGenerativeModel({ model: "embedding-001" })

async function main() {
    const t1 = "현숙은 광수를 좋아한다"
    const t2 = "커플 매칭 결과"

    console.log("T1:", t1)
    console.log("T2:", t2)

    const r1 = await model.embedContent({
        content: { parts: [{ text: t1 }] }
    })
    const v1 = r1.embedding.values
    console.log("V1 (first 5):", v1.slice(0, 5))

    const r2 = await model.embedContent({
        content: { parts: [{ text: t2 }] }
    })
    const v2 = r2.embedding.values
    console.log("V2 (first 5):", v2.slice(0, 5))

    // Manual Cosine Sim
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
        dot += v1[i] * v2[i]
        mag1 += v1[i] * v1[i]
        mag2 += v2[i] * v2[i]
    }
    const sim = dot / (Math.sqrt(mag1) * Math.sqrt(mag2))
    console.log("Similarity:", sim)
}

main()
