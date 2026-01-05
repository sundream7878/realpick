import { createClient } from "./client"

const supabase = createClient()

export async function setMainMissionId(missionId: string | null) {
    try {
        const { error } = await supabase
            .from("t_admin_settings")
            .upsert({
                key: "MAIN_MISSION_ID",
                value: missionId ? JSON.stringify(missionId) : null,
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error("Error setting main mission:", error)
            return { success: false, error }
        }

        return { success: true }
    } catch (error) {
        console.error("Error in setMainMissionId:", error)
        return { success: false, error }
    }
}

export async function getMainMissionId() {
    try {
        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "MAIN_MISSION_ID")
            .single()

        if (error) {
            // If row doesn't exist, return null without error
            if (error.code === "PGRST116") return { success: true, missionId: null }
            console.error("Error getting main mission ID:", error)
            return { success: false, error }
        }

        let missionId = data?.value
        // Handle case where value might be double-stringified or just a string
        if (typeof missionId === 'string') {
            try {
                // Try parsing if it looks like a JSON string
                const parsed = JSON.parse(missionId);
                missionId = parsed;
            } catch (e) {
                // If parse fails, use as is
            }
        }

        return { success: true, missionId }
    } catch (error) {
        console.error("Error in getMainMissionId:", error)
        return { success: false, error }
    }
}

// Admin dashboard needs to fetch ALL open missions to list them
export async function getAllOpenMissions() {
    try {
        // Fetch from t_missions1
        const { data: missions1, error: error1 } = await supabase
            .from("t_missions1")
            .select("f_id, f_title, f_status, f_show_id, f_category")
            .order("f_created_at", { ascending: false })

        if (error1) throw error1

        // Fetch from t_missions2 (couple matching)
        const { data: missions2, error: error2 } = await supabase
            .from("t_missions2")
            .select("f_id, f_title, f_status, f_show_id, f_category")
            .order("f_created_at", { ascending: false })

        if (error2) throw error2

        // Combine and map
        const allMissions = [
            ...(missions1 || []).map(m => ({ ...m, type: "mission1" })),
            ...(missions2 || []).map(m => ({ ...m, type: "mission2" }))
        ]

        return { success: true, missions: allMissions }
    } catch (error) {
        console.error("Error fetching all open missions:", error)
        return { success: false, error }
    }
}

export async function getShowStatuses() {
    try {
        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_STATUSES")
            .single()

        if (error) {
            if (error.code === "PGRST116") return { success: true, statuses: {} }
            console.error("Error getting show statuses:", error)
            return { success: false, error }
        }

        let statuses = data?.value
        if (typeof statuses === 'string') {
            try {
                statuses = JSON.parse(statuses)
            } catch (e) {
                // If parse fails, use as is or empty object
            }
        }

        return { success: true, statuses: statuses || {} }
    } catch (error) {
        console.error("Error in getShowStatuses:", error)
        return { success: false, error }
    }
}

export async function updateShowStatuses(statuses: Record<string, string>) {
    try {
        const { error } = await supabase
            .from("t_admin_settings")
            .upsert({
                key: "SHOW_STATUSES",
                value: JSON.stringify(statuses),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error("Error updating show statuses:", error)
            return { success: false, error }
        }

        return { success: true }
    } catch (error) {
        console.error("Error in updateShowStatuses:", error)
        return { success: false, error }
    }
}

// 프로그램 활성화 여부 관리
export async function getShowVisibility() {
    try {
        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "SHOW_VISIBILITY")
            .single()

        if (error) {
            if (error.code === "PGRST116") return { success: true, visibility: {} }
            console.error("Error getting show visibility:", error)
            return { success: false, error }
        }

        let visibility = data?.value
        if (typeof visibility === 'string') {
            try {
                visibility = JSON.parse(visibility)
            } catch (e) {
                visibility = {}
            }
        }

        return { success: true, visibility: visibility || {} }
    } catch (error) {
        console.error("Error in getShowVisibility:", error)
        return { success: false, error }
    }
}

export async function updateShowVisibility(visibility: Record<string, boolean>) {
    try {
        const { error } = await supabase
            .from("t_admin_settings")
            .upsert({
                key: "SHOW_VISIBILITY",
                value: JSON.stringify(visibility),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error("Error updating show visibility:", error)
            return { success: false, error }
        }

        return { success: true }
    } catch (error) {
        console.error("Error in updateShowVisibility:", error)
        return { success: false, error }
    }
}