import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

if (process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is present")
} else {
    console.log("OPENAI_API_KEY is missing")
}
