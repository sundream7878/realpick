import { createClient } from "@/lib/supabase/client"
import { TComment } from "@/types/t-vote/vote.types"

/**
 * 댓글 목록 가져오기
 */
export async function getComments(missionId: string, userId?: string): Promise<{ success: boolean; comments?: TComment[]; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 댓글 조회 (작성자 정보 포함)
        const { data: commentsData, error: commentsError } = await supabase
            .from("t_comments")
            .select(`
        *,
        user:t_users!f_user_id (
          f_nickname,
          f_tier
        )
      `)
            .eq("f_mission_id", missionId)
            .eq("f_is_deleted", false) // 삭제된 댓글 제외? or 포함해서 "삭제됨" 표시? -> 보통 포함
            .order("f_created_at", { ascending: true })

        if (commentsError) {
            console.error("댓글 조회 실패:", commentsError)
            return { success: false, error: "댓글을 불러올 수 없습니다." }
        }

        // 2. 댓글 ID 목록 추출
        const commentIds = commentsData.map((c: any) => c.f_id)

        // 3. 대댓글(Replies) 조회
        let repliesMap = new Map<string, TComment[]>()
        if (commentIds.length > 0) {
            const { data: repliesData, error: repliesError } = await supabase
                .from("t_replies")
                .select(`
          *,
          user:t_users!f_user_id (
            f_nickname,
            f_tier
          )
        `)
                .in("f_comment_id", commentIds)
                .order("f_created_at", { ascending: true })

            if (!repliesError && repliesData) {
                repliesData.forEach((r: any) => {
                    const reply: TComment = {
                        id: r.f_id,
                        missionId: missionId, // 대댓글은 미션 ID를 직접 가지지 않지만, 편의상 상속
                        missionType: "mission1", // 임시
                        userId: r.f_user_id,
                        userNickname: r.user?.f_nickname || "알 수 없음",
                        userTier: r.user?.f_tier || "루키",
                        content: r.f_is_deleted ? "삭제된 댓글입니다." : r.f_content,
                        parentId: r.f_comment_id,
                        createdAt: r.f_created_at,
                        likesCount: r.f_likes_count || 0,
                        repliesCount: 0,
                        isLiked: false,
                        isDeleted: r.f_is_deleted,
                        replies: []
                    }

                    const existing = repliesMap.get(r.f_comment_id) || []
                    existing.push(reply)
                    repliesMap.set(r.f_comment_id, existing)
                })
            }
        }

        // 4. 좋아요 여부 조회 (로그인한 경우)
        let likedCommentIds = new Set<string>()
        let likedReplyIds = new Set<string>()

        if (userId) {
            // 댓글 좋아요
            const { data: commentLikes } = await supabase
                .from("t_comment_likes")
                .select("f_comment_id")
                .eq("f_user_id", userId)
                .in("f_comment_id", commentIds)

            if (commentLikes) {
                commentLikes.forEach((l: any) => likedCommentIds.add(l.f_comment_id))
            }

            // 대댓글 좋아요
            // 대댓글 ID 목록이 필요함
            const replyIds: string[] = []
            repliesMap.forEach(replies => replies.forEach(r => replyIds.push(r.id)))

            if (replyIds.length > 0) {
                const { data: replyLikes } = await supabase
                    .from("t_reply_likes")
                    .select("f_reply_id")
                    .eq("f_user_id", userId)
                    .in("f_reply_id", replyIds)

                if (replyLikes) {
                    replyLikes.forEach((l: any) => likedReplyIds.add(l.f_reply_id))
                }
            }
        }

        // 5. 데이터 병합 및 반환
        const comments: TComment[] = commentsData.map((c: any) => {
            const replies = repliesMap.get(c.f_id) || []
            // 대댓글 좋아요 상태 적용
            replies.forEach(r => r.isLiked = likedReplyIds.has(r.id))

            return {
                id: c.f_id,
                missionId: c.f_mission_id,
                missionType: c.f_mission_type,
                userId: c.f_user_id,
                userNickname: c.user?.f_nickname || "알 수 없음",
                userTier: c.user?.f_tier || "루키",
                content: c.f_is_deleted ? "삭제된 댓글입니다." : c.f_content,
                parentId: null,
                createdAt: c.f_created_at,
                likesCount: c.f_likes_count || 0,
                repliesCount: c.f_replies_count || replies.length,
                isLiked: likedCommentIds.has(c.f_id),
                isDeleted: c.f_is_deleted,
                replies: replies
            }
        })

        return { success: true, comments }

    } catch (error) {
        console.error("댓글 로딩 중 오류:", error)
        return { success: false, error: "댓글 로딩 중 오류가 발생했습니다." }
    }
}

/**
 * 댓글 작성
 */
export async function createComment(
    missionId: string,
    missionType: string,
    userId: string,
    content: string
): Promise<{ success: boolean; comment?: TComment; error?: string }> {
    try {
        const supabase = createClient()

        const payload = {
            f_mission_id: missionId,
            f_mission_type: missionType,
            f_user_id: userId,
            f_content: content,
            f_parent_id: null // 최상위 댓글
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

        const newComment: TComment = {
            id: data.f_id,
            missionId: data.f_mission_id,
            missionType: data.f_mission_type,
            userId: data.f_user_id,
            userNickname: data.user?.f_nickname || "알 수 없음",
            userTier: data.user?.f_tier || "루키",
            content: data.f_content,
            parentId: null,
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
 * 대댓글 작성
 */
export async function createReply(
    commentId: string,
    userId: string,
    content: string
): Promise<{ success: boolean; reply?: TComment; error?: string }> {
    try {
        const supabase = createClient()

        const payload = {
            f_comment_id: commentId,
            f_user_id: userId,
            f_content: content
        }

        const { data, error } = await supabase
            .from("t_replies")
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
            console.error("대댓글 작성 실패:", error)
            return { success: false, error: "대댓글 작성에 실패했습니다." }
        }

        // 부모 댓글의 replies_count 증가
        await supabase.rpc('increment_replies_count', { comment_id: commentId })
        // RPC가 없다면 수동 업데이트
        // await supabase.from("t_comments").update({ f_replies_count: ... }) 
        // 여기서는 간단히 수동 업데이트 시도 (concurrency issue 가능성 있음)
        const { data: parent } = await supabase.from("t_comments").select("f_replies_count").eq("f_id", commentId).single()
        if (parent) {
            await supabase.from("t_comments").update({ f_replies_count: (parent.f_replies_count || 0) + 1 }).eq("f_id", commentId)
        }

        const newReply: TComment = {
            id: data.f_id,
            missionId: "", // 대댓글은 missionId 없음
            missionType: "",
            userId: data.f_user_id,
            userNickname: data.user?.f_nickname || "알 수 없음",
            userTier: data.user?.f_tier || "루키",
            content: data.f_content,
            parentId: commentId,
            createdAt: data.f_created_at,
            likesCount: 0,
            repliesCount: 0,
            isLiked: false,
            isDeleted: false,
            replies: []
        }

        return { success: true, reply: newReply }

    } catch (error) {
        console.error("대댓글 작성 중 오류:", error)
        return { success: false, error: "대댓글 작성 중 오류가 발생했습니다." }
    }
}

/**
 * 댓글 삭제
 */
export async function deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 본인 확인
        const { data: comment } = await supabase.from("t_comments").select("f_user_id").eq("f_id", commentId).single()
        if (!comment || comment.f_user_id !== userId) return { success: false, error: "권한이 없습니다." }

        // 2. Soft Delete
        const { error } = await supabase
            .from("t_comments")
            .update({ f_is_deleted: true })
            .eq("f_id", commentId)

        if (error) return { success: false, error: "삭제 실패" }
        return { success: true }
    } catch (error) {
        return { success: false, error: "오류 발생" }
    }
}

/**
 * 대댓글 삭제
 */
export async function deleteReply(replyId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 본인 확인
        const { data: reply } = await supabase.from("t_replies").select("f_user_id, f_comment_id").eq("f_id", replyId).single()
        if (!reply || reply.f_user_id !== userId) return { success: false, error: "권한이 없습니다." }

        // 2. Soft Delete
        const { error } = await supabase
            .from("t_replies")
            .update({ f_is_deleted: true })
            .eq("f_id", replyId)

        if (error) return { success: false, error: "삭제 실패" }

        // 부모 댓글 count 감소 (선택사항)

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

        // 1. 확인
        const { data: existing } = await supabase.from("t_comment_likes").select("f_id").eq("f_comment_id", commentId).eq("f_user_id", userId).maybeSingle()

        let isLiked = false
        if (existing) {
            await supabase.from("t_comment_likes").delete().eq("f_id", existing.f_id)
        } else {
            await supabase.from("t_comment_likes").insert([{ f_comment_id: commentId, f_user_id: userId }])
            isLiked = true
        }

        // 카운트 업데이트
        const { count } = await supabase.from("t_comment_likes").select("*", { count: 'exact', head: true }).eq("f_comment_id", commentId)

        if (count !== null) {
            await supabase.from("t_comments").update({ f_likes_count: count }).eq("f_id", commentId)
            return { success: true, isLiked, likesCount: count }
        }

        return { success: true, isLiked }
    } catch (error) {
        return { success: false, error: "오류 발생" }
    }
}

/**
 * 대댓글 좋아요 토글
 */
export async function toggleReplyLike(replyId: string, userId: string): Promise<{ success: boolean; isLiked?: boolean; likesCount?: number; error?: string }> {
    try {
        const supabase = createClient()

        // 1. 확인
        const { data: existing } = await supabase.from("t_reply_likes").select("f_id").eq("f_reply_id", replyId).eq("f_user_id", userId).maybeSingle()

        let isLiked = false
        if (existing) {
            await supabase.from("t_reply_likes").delete().eq("f_id", existing.f_id)
        } else {
            await supabase.from("t_reply_likes").insert([{ f_reply_id: replyId, f_user_id: userId }])
            isLiked = true
        }

        // 카운트 업데이트
        const { count } = await supabase.from("t_reply_likes").select("*", { count: 'exact', head: true }).eq("f_reply_id", replyId)

        if (count !== null) {
            await supabase.from("t_replies").update({ f_likes_count: count }).eq("f_id", replyId)
            return { success: true, isLiked, likesCount: count }
        }

        return { success: true, isLiked }
    } catch (error) {
        return { success: false, error: "오류 발생" }
    }
}
