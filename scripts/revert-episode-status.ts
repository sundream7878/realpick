
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try to use Service Role Key for admin privileges (bypass RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables.");
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Using ANON KEY. This might fail due to RLS.");
} else {
    console.log("✅ Using Service Role Key (Admin Mode)");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertEpisodeStatus(missionId: string, episodeNo: number) {
    console.log(`Attempting to OPEN status for Mission ${missionId}, Episode ${episodeNo}...`);

    const payload = {
        f_mission_id: missionId,
        f_episode_no: episodeNo,
        f_status: 'open'
    };

    console.log("Upserting into t_episodes:", payload);

    const { data, error } = await supabase
        .from("t_episodes")
        .upsert(payload, { onConflict: 'f_mission_id, f_episode_no' })
        .select();

    if (error) {
        console.error("Failed to upsert t_episodes:", error);
    } else {
        console.log("✅ Successfully set episode status to 'open' in t_episodes.");
        console.log("Data:", data);
    }

    // Also ensure mission is open
    const { error: missionError } = await supabase
        .from("t_missions2")
        .update({ f_status: 'open' })
        .eq("f_id", missionId)
        .eq("f_status", "settled");

    if (!missionError) console.log("Checked mission status.");
}

// Usage example: Replace with actual ID and Episode Number
const MISSION_ID = "fbc75fed-589f-4490-b287-574bce3a34a3";
const EPISODE_NO = 2;

revertEpisodeStatus(MISSION_ID, EPISODE_NO);
