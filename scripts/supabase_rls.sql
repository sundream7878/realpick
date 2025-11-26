-- ============================================
-- RealPick Supabase Row Level Security (RLS) 정책
-- 마지막 업데이트: 2025-01-13
-- 네이밍 법칙: 테이블 t_, 컬럼 f_
-- ============================================

-- ============================================
-- 1. RLS 활성화
-- ============================================
ALTER TABLE t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_missions1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_missions2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pickresult1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pickresult2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_pointlogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_mypage ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_reply_likes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Users 테이블 정책
-- ============================================
-- 모든 사용자는 다른 사용자의 기본 정보(닉네임, 티어 등) 조회 가능
CREATE POLICY "Anyone can view user profiles" ON t_users
  FOR SELECT USING (true);

-- 사용자는 자신의 데이터만 수정 가능
CREATE POLICY "Users can update their own data" ON t_users
  FOR UPDATE USING (auth.uid() = f_id);

-- 인증된 사용자는 자신의 계정 생성 가능
CREATE POLICY "Users can insert their own data" ON t_users
  FOR INSERT WITH CHECK (auth.uid() = f_id);

-- ============================================
-- 3. Missions1 테이블 정책 (Binary/Multi 미션)
-- ============================================
-- 모든 사용자가 미션 조회 가능
CREATE POLICY "Anyone can view missions1" ON t_missions1
  FOR SELECT USING (true);

-- 인증된 사용자는 미션 생성 가능
CREATE POLICY "Authenticated users can create missions1" ON t_missions1
  FOR INSERT WITH CHECK (auth.uid() = f_creator_id);

-- 미션 생성자만 수정 가능
CREATE POLICY "Mission creators can update missions1" ON t_missions1
  FOR UPDATE USING (auth.uid() = f_creator_id);

-- ============================================
-- 4. Missions2 테이블 정책 (커플 매칭 미션)
-- ============================================
-- 모든 사용자가 미션 조회 가능
CREATE POLICY "Anyone can view missions2" ON t_missions2
  FOR SELECT USING (true);

-- 인증된 사용자는 미션 생성 가능
CREATE POLICY "Authenticated users can create missions2" ON t_missions2
  FOR INSERT WITH CHECK (auth.uid() = f_creator_id);

-- 미션 생성자만 수정 가능
CREATE POLICY "Mission creators can update missions2" ON t_missions2
  FOR UPDATE USING (auth.uid() = f_creator_id);

-- ============================================
-- 5. Episodes 테이블 정책
-- ============================================
-- 모든 사용자가 회차 상태 조회 가능
CREATE POLICY "Anyone can view episodes" ON t_episodes
  FOR SELECT USING (true);

-- 미션 생성자만 회차 생성/수정 가능
CREATE POLICY "Mission creators can manage episodes" ON t_episodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM t_missions2 
      WHERE t_missions2.f_id = t_episodes.f_mission_id 
      AND t_missions2.f_creator_id = auth.uid()
    )
  );

-- ============================================
-- 6. PickResult1 테이블 정책 (Binary/Multi 투표)
-- ============================================
-- 사용자는 자신의 투표만 조회 가능
CREATE POLICY "Users can view their own pickresult1" ON t_pickresult1
  FOR SELECT USING (auth.uid() = f_user_id);

-- 사용자는 자신의 투표만 생성 가능
CREATE POLICY "Users can create their own pickresult1" ON t_pickresult1
  FOR INSERT WITH CHECK (auth.uid() = f_user_id);

-- 사용자는 자신의 투표만 수정 가능 (마감 전에만)
CREATE POLICY "Users can update their own pickresult1" ON t_pickresult1
  FOR UPDATE USING (
    auth.uid() = f_user_id 
    AND EXISTS (
      SELECT 1 FROM t_missions1 
      WHERE t_missions1.f_id = t_pickresult1.f_mission_id 
      AND t_missions1.f_status = 'open'
      AND t_missions1.f_deadline > NOW()
    )
  );

-- ============================================
-- 7. PickResult2 테이블 정책 (커플 매칭 예측)
-- ============================================
-- 사용자는 자신의 예측만 조회 가능
CREATE POLICY "Users can view their own pickresult2" ON t_pickresult2
  FOR SELECT USING (auth.uid() = f_user_id);

-- 사용자는 자신의 예측만 생성 가능
CREATE POLICY "Users can create their own pickresult2" ON t_pickresult2
  FOR INSERT WITH CHECK (auth.uid() = f_user_id);

-- 사용자는 자신의 예측만 수정 가능 (마감 전에만)
CREATE POLICY "Users can update their own pickresult2" ON t_pickresult2
  FOR UPDATE USING (
    auth.uid() = f_user_id 
    AND EXISTS (
      SELECT 1 FROM t_missions2 
      JOIN t_episodes ON t_episodes.f_mission_id = t_missions2.f_id 
      WHERE t_missions2.f_id = t_pickresult2.f_mission_id 
      AND t_episodes.f_episode_no = t_pickresult2.f_episode_no
      AND t_missions2.f_status = 'open'
      AND t_episodes.f_status = 'open'
      AND t_missions2.f_deadline > NOW()
    )
  );

-- ============================================
-- 8. PointLogs 테이블 정책
-- ============================================
-- 사용자는 자신의 포인트 로그만 조회 가능
CREATE POLICY "Users can view their own pointlogs" ON t_pointlogs
  FOR SELECT USING (auth.uid() = f_user_id);

-- 포인트 로그는 서버에서만 생성 (서비스 역할 사용)
-- INSERT 정책은 서비스 역할로만 가능하도록 설정

-- ============================================
-- 9. MyPage 테이블 정책
-- ============================================
-- 사용자는 자신의 마이페이지만 조회 가능
CREATE POLICY "Users can view their own mypage" ON t_mypage
  FOR SELECT USING (auth.uid() = f_user_id);

-- 사용자는 자신의 마이페이지만 수정 가능
CREATE POLICY "Users can update their own mypage" ON t_mypage
  FOR UPDATE USING (auth.uid() = f_user_id);

-- 마이페이지는 서버에서만 생성 (서비스 역할 사용)
-- INSERT 정책은 서비스 역할로만 가능하도록 설정

-- ============================================
-- 10. Comments 테이블 정책
-- ============================================
-- 모든 사용자가 댓글 조회 가능 (삭제되지 않은 것만)
CREATE POLICY "Anyone can view active comments" ON t_comments
  FOR SELECT USING (f_is_deleted = false);

-- 인증된 사용자는 댓글 작성 가능
CREATE POLICY "Authenticated users can create comments" ON t_comments
  FOR INSERT WITH CHECK (auth.uid() = f_user_id);

-- 작성자만 자신의 댓글 수정/삭제 가능
CREATE POLICY "Users can update their own comments" ON t_comments
  FOR UPDATE USING (auth.uid() = f_user_id);

-- ============================================
-- 11. Replies 테이블 정책
-- ============================================
-- 모든 사용자가 답글 조회 가능 (삭제되지 않은 것만)
CREATE POLICY "Anyone can view active replies" ON t_replies
  FOR SELECT USING (f_is_deleted = false);

-- 인증된 사용자는 답글 작성 가능
CREATE POLICY "Authenticated users can create replies" ON t_replies
  FOR INSERT WITH CHECK (auth.uid() = f_user_id);

-- 작성자만 자신의 답글 수정/삭제 가능
CREATE POLICY "Users can update their own replies" ON t_replies
  FOR UPDATE USING (auth.uid() = f_user_id);

-- ============================================
-- 12. Comment Likes 테이블 정책
-- ============================================
-- 사용자는 자신의 좋아요만 조회 가능
CREATE POLICY "Users can view their own comment likes" ON t_comment_likes
  FOR SELECT USING (auth.uid() = f_user_id);

-- 인증된 사용자는 좋아요 생성/삭제 가능
CREATE POLICY "Authenticated users can manage comment likes" ON t_comment_likes
  FOR ALL USING (auth.uid() = f_user_id);

-- ============================================
-- 13. Reply Likes 테이블 정책
-- ============================================
-- 사용자는 자신의 좋아요만 조회 가능
CREATE POLICY "Users can view their own reply likes" ON t_reply_likes
  FOR SELECT USING (auth.uid() = f_user_id);

-- 인증된 사용자는 좋아요 생성/삭제 가능
CREATE POLICY "Authenticated users can manage reply likes" ON t_reply_likes
  FOR ALL USING (auth.uid() = f_user_id);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RealPick RLS 정책이 성공적으로 적용되었습니다!';
END $$;
