import { createClient } from "@/lib/supabase/client"
import { TComment } from "@/types/t-vote/vote.types"

/**
 * 댓글 목록 가져오기
 */
export async function getComments(missionId: string, userId?: string): Promise<{ success: boolean; comments?: TComment[]; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 댓글 조회 (작성자 정보 포함)
        let query = supabase
            .from("t_comments")
            .select(`
        *,
        user:t_users!f_user_id (
          f_nickname,
          f_tier
        )
      `)
            .eq("f_mission_id", missionId)
            .order("f_created_at", { ascending: true }) // 오래된 순으로 정렬 (대화 흐름)

        const { data: commentsData, error: commentsError } = await query

        if (commentsError) {
            console.error("댓글 조회 실패:", commentsError)
            return { success: false, error: "댓글을 불러올 수 없습니다." }
        }

        // 2. 좋아요 여부 조회 (로그인한 경우)
        let likedCommentIds = new Set<string>()
        if (userId) {
            const { data: likesData, error: likesError } = await supabase
                .from("t_comment_likes")
                .select("f_comment_id")
                .eq("f_user_id", userId)

            if (!likesError && likesData) {
                likesData.forEach((like: any) => likedCommentIds.add(like.f_comment_id))
            }
        }

        // 3. 데이터 변환 (DB 컬럼 -> TComment 타입)
        const comments: TComment[] = commentsData.map((c: any) => ({
            id: c.f_id,
            missionId: c.f_mission_id,
            missionType: c.f_mission_type,
            userId: c.f_user_id,
            userNickname: c.user?.f_nickname || "알 수 없음",
            userTier: c.user?.f_tier || "루키",
            content: c.f_is_deleted ? "삭제된 댓글입니다." : c.f_content,
            parentId: c.f_parent_id,
            createdAt: c.f_created_at,
            likesCount: c.f_likes_count || 0,
            repliesCount: c.f_replies_count || 0,
            isLiked: likedCommentIds.has(c.f_id),
            isDeleted: c.f_is_deleted,
            replies: []
        }))

        // 4. 계층 구조 구성 (부모-자식 연결)
        const commentMap = new Map<string, TComment>()
        const rootComments: TComment[] = []

        // 먼저 모든 댓글을 맵에 등록
        comments.forEach(c => {
            commentMap.set(c.id, c)
            c.replies = [] // 초기화
        })

        // 부모가 있으면 부모의 replies에 추가, 없으면 root에 추가
        comments.forEach(c => {
            if (c.parentId && commentMap.has(c.parentId)) {
                const parent = commentMap.get(c.parentId)
                parent?.replies?.push(c)
            } else {
                rootComments.push(c)
            }
        })

        return { success: true, comments: rootComments }

    } catch (error) {
        console.error("댓글 로딩 중 오류:", error)
        return { success: false, error: "댓글 로딩 중 오류가 발생했습니다." }
    }
}

/**
 * 댓글 작성
 */
export async function addComment(
    missionId: string,
    missionType: string,
    userId: string,
    content: string,
    parentId?: string | null
): Promise<{ success: boolean; comment?: TComment; error?: string }> {
    try {
        const supabase = createClient()

        const payload: any = {
            f_mission_id: missionId,
            f_mission_type: missionType,
            f_user_id: userId,
            f_content: content,
            f_parent_id: parentId || null
        }

        const { data, error } = await supabase
            .from("t_comments")
            .insert([payload])
            .select(`
        *,
        user:t_users!f_user_id (
          f_nickname,
          f_tier
        )
      `)
            .single()

        if (error) {
            console.error("댓글 작성 실패:", error)
            return { success: false, error: "댓글 작성에 실패했습니다." }
        }

        // 부모 댓글이 있다면 대댓글 수 증가 (수동 업데이트)
        if (parentId) {
            const { data: pData } = await supabase
                .from("t_comments")
                .select("f_replies_count")
                .eq("f_id", parentId)
                .single()

            if (pData) {
                await supabase
                    .from("t_comments")
                    .update({ f_replies_count: (pData.f_replies_count || 0) + 1 })
                    .eq("f_id", parentId)
            }
        }

        const newComment: TComment = {
            id: data.f_id,
            missionId: data.f_mission_id,
            missionType: data.f_mission_type,
            userId: data.f_user_id,
            userNickname: data.user?.f_nickname || "알 수 없음",
            userTier: data.user?.f_tier || "루키",
            content: data.f_content,
            parentId: data.f_parent_id,
            createdAt: data.f_created_at,
            likesCount: 0,
            repliesCount: 0,
            isLiked: false,
            isDeleted: false,
            replies: []
        }

        return { success: true, comment: newComment }

    } catch (error) {
        console.error("댓글 작성 중 오류:", error)
        return { success: false, error: "댓글 작성 중 오류가 발생했습니다." }
    }
}

/**
 * 댓글 삭제 (조건부 Hard/Soft Delete)
 */
export async function deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 본인 확인
        const { data: comment, error: fetchError } = await supabase
            .from("t_comments")
            .select("f_user_id")
            .eq("f_id", commentId)
            .single()

        if (fetchError || !comment) return { success: false, error: "댓글을 찾을 수 없습니다." }
        if (comment.f_user_id !== userId) return { success: false, error: "삭제 권한이 없습니다." }

        // 2. 대댓글 존재 여부 확인
        const { count, error: countError } = await supabase
            .from("t_comments")
            .select("*", { count: 'exact', head: true })
            .eq("f_parent_id", commentId)
            .eq("f_is_deleted", false) // 삭제되지 않은 자식만 체크

        if (countError) return { success: false, error: "삭제 처리 중 오류가 발생했습니다." }

        if (count && count > 0) {
            // 3-A. 자식이 있으면 -> Soft Delete (내용만 변경)
            const { error: updateError } = await supabase
                .from("t_comments")
                .update({ f_is_deleted: true })
                .eq("f_id", commentId)

            if (updateError) return { success: false, error: "댓글 삭제 실패" }
        } else {
            // 3-B. 자식이 없으면 -> Hard Delete (완전 삭제)
            const { error: deleteError } = await supabase
                .from("t_comments")
                .delete()
                .eq("f_id", commentId)

            if (deleteError) return { success: false, error: "댓글 삭제 실패" }
        }

        return { success: true }

    } catch (error) {
        return { success: false, error: "오류 발생" }
    }
}

/**
 * 댓글 좋아요 토글
 */
export async function toggleCommentLike(commentId: string, userId: string): Promise<{ success: boolean; isLiked?: boolean; likesCount?: number; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 이미 좋아요 눌렀는지 확인
        const { data: existingLike, error: checkError } = await supabase
            .from("t_comment_likes")
            .select("f_id")
            .eq("f_comment_id", commentId)
            .eq("f_user_id", userId)
            .maybeSingle()

        if (checkError) return { success: false, error: "좋아요 확인 실패" }

        let isLiked = false

        if (existingLike) {
            // 2. 이미 눌렀으면 취소 (삭제)
            const { error: deleteError } = await supabase
                .from("t_comment_likes")
                .delete()
                .eq("f_id", existingLike.f_id)

            if (deleteError) return { success: false, error: "좋아요 취소 실패" }
            isLiked = false
        } else {
            // 3. 안 눌렀으면 추가
            const { error: insertError } = await supabase
                .from("t_comment_likes")
                .insert([{ f_comment_id: commentId, f_user_id: userId }])

            if (insertError) return { success: false, error: "좋아요 추가 실패" }
            isLiked = true
        }

        // 4. 좋아요 수 업데이트 (카운트 후 반영)
        const { count, error: countError } = await supabase
            .from("t_comment_likes")
            .select("*", { count: 'exact', head: true })
            .eq("f_comment_id", commentId)

        if (!countError && count !== null) {
            await supabase
                .from("t_comments")
                .update({ f_likes_count: count })
                .eq("f_id", commentId)

            return { success: true, isLiked, likesCount: count }
        }

        return { success: true, isLiked }

    } catch (error) {
        return { success: false, error: "오류 발생" }
    }
}
