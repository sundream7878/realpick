import { createClient } from "./client"
import type { TVoteSubmission } from "@/types/t-vote/vote.types"

/**
 * 특정 미션의 상위 투표자 조회 (포인트 기준)
 */
export async function getTopVotersByMission(missionId: string, limit: number = 3): Promise<Array<{
    nickname: string
    points: number
    tier: string
}>> {
    const supabase = createClient()

    console.log('[TOP VOTERS] Fetching for mission:', missionId)

    // t_pickresult1에서 해당 미션에 투표한 유저 ID 목록 가져오기 (Binary/Multi 미션)
    const { data: votes1, error: votesError1 } = await supabase
        .from("t_pickresult1")
        .select("f_user_id")
        .eq("f_mission_id", missionId)

    console.log('[TOP VOTERS] Votes1 data:', votes1, 'Error:', votesError1)

    // t_pickresult2에서 해당 미션에 투표한 유저 ID 목록 가져오기 (커플 매칭 미션)
    const { data: votes2, error: votesError2 } = await supabase
        .from("t_pickresult2")
        .select("f_user_id")
        .eq("f_mission_id", missionId)

    console.log('[TOP VOTERS] Votes2 data:', votes2, 'Error:', votesError2)

    // 두 테이블의 결과를 합치기
    const allVotes = [...(votes1 || []), ...(votes2 || [])]

    if (allVotes.length === 0) {
        console.log('[TOP VOTERS] No votes found in either table')
        return []
    }

    const userIds = allVotes.map(v => v.f_user_id)
    // 중복 제거
    const uniqueUserIds = Array.from(new Set(userIds))
    console.log('[TOP VOTERS] Unique User IDs:', uniqueUserIds)

    // 해당 유저들의 정보를 포인트 순으로 조회
    const { data: users, error: usersError } = await supabase
        .from("t_users")
        .select("f_nickname, f_points, f_tier")
        .in("f_id", uniqueUserIds)
        .order("f_points", { ascending: false })
        .limit(limit)

    console.log('[TOP VOTERS] Users data:', users, 'Error:', usersError)

    if (usersError || !users) {
        console.log('[TOP VOTERS] No users found or error occurred')
        return []
    }

    const result = users.map(u => ({
        nickname: u.f_nickname,
        points: u.f_points,
        tier: u.f_tier
    }))

    console.log('[TOP VOTERS] Final result:', result)
    return result
}
