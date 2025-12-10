import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const googleApiKey = process.env.GOOGLE_API_KEY
if (!googleApiKey) { console.error("Missing API Key"); process.exit(1); }

async function main() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${googleApiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.models) {
        console.log("Available Models:")
        data.models.forEach((m: any) => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(", ")})`)
        })
    } else {
        console.error("Error listing models:", data)
    }
}

main()
