import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const apiKey = process.env.GOOGLE_API_KEY

async function testApi() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`

    const t1 = "현숙은 광수를 좋아한다"
    const t2 = "커플 매칭 결과"

    console.log("Testing T1:", t1)
    const r1 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: t1 }] },
            taskType: "SEMANTIC_SIMILARITY"
        })
    })
    const d1 = await r1.json()

    console.log("Testing T2:", t2)
    const r2 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: t2 }] },
            taskType: "SEMANTIC_SIMILARITY"
        })
    })
    const d2 = await r2.json()

    if (d1.embedding && d2.embedding) {
        const v1 = d1.embedding.values
        const v2 = d2.embedding.values
        console.log("V1 (first 5):", v1.slice(0, 5))
        console.log("V2 (first 5):", v2.slice(0, 5))

        const isSame = v1.every((val: number, i: number) => val === v2[i])
        console.log("Are embeddings identical?", isSame)
    } else {
        console.error("API Error:", d1, d2)
    }
}

testApi()
