
import { getMissions } from "../lib/supabase/missions";

async function test() {
    console.log("Attempting to import and use missions.ts...");
    try {
        const result = await getMissions(1);
        console.log("getMissions result:", result);
    } catch (error) {
        console.error("Error calling getMissions:", error);
    }
}

test();
