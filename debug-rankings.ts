
import { createClient } from "@supabase/supabase-js"
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function getTopVotersByMission(missionId: string, limit: number = 3) {
    console.log('[DEBUG] Fetching for mission:', missionId)

    // 1. Check t_pickresult1
    const { data: votes1, error: votesError1 } = await supabase
        .from("t_pickresult1")
        .select("f_user_id")
        .eq("f_mission_id", missionId)

    console.log('[DEBUG] Votes1 count:', votes1?.length, 'Error:', votesError1?.message)

    // 2. Check t_pickresult2
    const { data: votes2, error: votesError2 } = await supabase
        .from("t_pickresult2")
        .select("f_user_id")
        .eq("f_mission_id", missionId)

    console.log('[DEBUG] Votes2 count:', votes2?.length, 'Error:', votesError2?.message)

    const allVotes = [...(votes1 || []), ...(votes2 || [])]
    console.log('[DEBUG] Total votes:', allVotes.length)

    if (allVotes.length === 0) return []

    const userIds = allVotes.map(v => v.f_user_id)
    const uniqueUserIds = Array.from(new Set(userIds))
    console.log('[DEBUG] Unique User IDs:', uniqueUserIds)

    // 3. Fetch Users
    const { data: users, error: usersError } = await supabase
        .from("t_users")
        .select("f_nickname, f_points, f_tier")
        .in("f_id", uniqueUserIds)
        .order("f_points", { ascending: false })
        .limit(limit)

    console.log('[DEBUG] Users found:', users)
    console.log('[DEBUG] Users error:', usersError?.message)

    return users
}

async function main() {
    // 0. Find user 'chang'
    console.log("Searching for user 'chang'...")
    const { data: user, error: userError } = await supabase
        .from('t_users')
        .select('*')
        .ilike('f_nickname', '%chang%')
        .single()

    if (user) {
        console.log(`Found user: ${user.f_nickname} (${user.f_id})`)
    } else {
        console.log("User 'chang' not found or error:", userError?.message)
    }

    // 1. Find the closed couple matching mission from t_missions2
    console.log('Finding closed couple matching mission from t_missions2...')
    const { data: missions, error } = await supabase
        .from('t_missions2')
        .select('*')
        .order('f_deadline', { ascending: false })
        .limit(1)

    if (error) {
        console.error('Error fetching missions:', error)
        return
    }

    if (!missions || missions.length === 0) {
        console.log('No closed couple matching missions found in t_missions2.')
        return
    }

    const mission = missions[0]
    console.log(`Found mission: ${mission.f_title} (${mission.f_id})`)
    console.log(`Status: ${mission.f_status}, Deadline: ${mission.f_deadline}`)

    // 2. Get Top Voters
    await getTopVotersByMission(mission.f_id)

    // 3. Check specific vote for chang if found
    if (user) {
        console.log(`Checking votes for user ${user.f_nickname} in mission ${mission.f_id}...`)
        const { data: userVote, error: voteError } = await supabase
            .from('t_pickresult2')
            .select('*')
            .eq('f_user_id', user.f_id)
            .eq('f_mission_id', mission.f_id)

        console.log('User vote:', userVote)
        console.log('Vote error:', voteError?.message)
    }
}

main()
