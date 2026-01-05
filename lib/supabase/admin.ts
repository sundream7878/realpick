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

// 커스텀 프로그램 관리
export async function getCustomShows() {
    try {
        const { data, error } = await supabase
            .from("t_admin_settings")
            .select("value")
            .eq("key", "CUSTOM_SHOWS")
            .single()

        if (error) {
            if (error.code === "PGRST116") return { success: true, shows: [] }
            console.error("Error getting custom shows:", error)
            return { success: false, error }
        }

        let shows = data?.value
        if (typeof shows === 'string') {
            try {
                shows = JSON.parse(shows)
            } catch (e) {
                shows = []
            }
        }

        return { success: true, shows: Array.isArray(shows) ? shows : [] }
    } catch (error) {
        console.error("Error in getCustomShows:", error)
        return { success: false, error }
    }
}

export async function addCustomShow(show: {
    id: string
    name: string
    displayName: string
    category: string
    officialUrl?: string
}) {
    try {
        // 기존 커스텀 프로그램 가져오기
        const { success, shows } = await getCustomShows()
        if (!success) {
            return { success: false, error: "Failed to fetch existing shows" }
        }

        // 중복 체크
        if (shows.some((s: any) => s.id === show.id)) {
            return { success: false, error: "프로그램 ID가 이미 존재합니다." }
        }

        // 새 프로그램 추가
        const updatedShows = [...shows, show]

        const { error } = await supabase
            .from("t_admin_settings")
            .upsert({
                key: "CUSTOM_SHOWS",
                value: JSON.stringify(updatedShows),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error("Error adding custom show:", error)
            return { success: false, error }
        }

        return { success: true }
    } catch (error) {
        console.error("Error in addCustomShow:", error)
        return { success: false, error }
    }
}

export async function deleteCustomShow(showId: string) {
    try {
        // 기존 커스텀 프로그램 가져오기
        const { success, shows } = await getCustomShows()
        if (!success) {
            return { success: false, error: "Failed to fetch existing shows" }
        }

        // 프로그램 제거
        const updatedShows = shows.filter((s: any) => s.id !== showId)

        const { error } = await supabase
            .from("t_admin_settings")
            .upsert({
                key: "CUSTOM_SHOWS",
                value: JSON.stringify(updatedShows),
                updated_at: new Date().toISOString()
            })

        if (error) {
            console.error("Error deleting custom show:", error)
            return { success: false, error }
        }

        return { success: true }
    } catch (error) {
        console.error("Error in deleteCustomShow:", error)
        return { success: false, error }
    }
}