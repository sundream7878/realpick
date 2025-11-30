---
description: 픽 페이지(미션 상세)에 댓글, 답글, 좋아요 기능을 구현하기 위한 계획
---

# 픽 페이지 댓글/답글/좋아요 구현 계획

## 1. 개요
미션 투표 페이지(픽 페이지) 하단에 사용자 간 소통을 위한 댓글 섹션을 추가합니다.
댓글 작성, 대댓글(답글) 작성, 그리고 댓글에 대한 좋아요 기능을 포함합니다.

## 2. 데이터베이스 스키마 (Supabase)

### 2.1. `t_comments` 테이블 생성
댓글 데이터를 저장하는 테이블입니다.
- `id`: UUID (Primary Key)
- `mission_id`: UUID (미션 ID, FK는 느슨하게 연결하거나 t_missions1/2 공통 참조)
- `user_id`: UUID (작성자 ID, FK to t_users)
- `content`: Text (댓글 내용)
- `parent_id`: UUID (대댓글인 경우 부모 댓글 ID, 최상위 댓글은 null)
- `created_at`: Timestamp (작성 시간)
- `likes_count`: Integer (좋아요 수, default 0)
- `is_deleted`: Boolean (삭제 여부, soft delete)

### 2.2. `t_comment_likes` 테이블 생성
사용자가 어떤 댓글에 좋아요를 눌렀는지 저장하는 테이블입니다.
- `id`: UUID (Primary Key)
- `user_id`: UUID (사용자 ID)
- `comment_id`: UUID (댓글 ID)
- `created_at`: Timestamp

## 3. 타입 정의 (`types/t-vote/vote.types.ts`)

새로운 인터페이스를 추가합니다.
```typescript
export interface TComment {
  id: string
  missionId: string
  userId: string
  userNickname: string
  userTier: TTier
  content: string
  parentId: string | null
  createdAt: string
  likesCount: number
  isLiked: boolean // 현재 사용자가 좋아요를 눌렀는지 여부
  replies?: TComment[] // 대댓글 리스트 (프론트엔드 구성용)
  isDeleted: boolean
}
```

## 4. 백엔드 로직 (`lib/supabase/comments.ts`)

다음 함수들을 구현합니다.
1.  `getComments(missionId: string, userId?: string)`: 미션의 모든 댓글을 가져옵니다. (계층 구조로 변환은 프론트에서 하거나 여기서 처리)
2.  `addComment(missionId: string, userId: string, content: string, parentId?: string)`: 댓글/대댓글 작성
3.  `toggleCommentLike(commentId: string, userId: string)`: 좋아요 토글 (이미 눌렀으면 취소, 아니면 추가)
4.  `deleteComment(commentId: string, userId: string)`: 댓글 삭제 (본인 확인 후 soft delete)

## 5. UI 컴포넌트 (`components/c-comment`)

### 5.1. `CommentSection` (Container)
- 미션 ID를 prop으로 받음
- 댓글 목록을 fetch하고 상태 관리
- `CommentInput` (최상위) 포함
- `CommentList` 포함

### 5.2. `CommentList`
- 댓글 배열을 받아 렌더링
- 계층 구조(답글)를 시각적으로 표현

### 5.3. `CommentItem`
- 개별 댓글 표시
- 작성자 정보 (닉네임, 티어 뱃지)
- 내용, 작성 시간
- 좋아요 버튼 (하트 아이콘 + 숫자)
- 답글 달기 버튼 -> 클릭 시 `CommentInput` (답글용) 표시
- 삭제 버튼 (본인인 경우)

### 5.4. `CommentInput`
- 텍스트 입력창
- 등록 버튼

## 6. 통합
`app/p-mission/[id]/vote/page.tsx` (또는 각 투표 컴포넌트 하단)에 `CommentSection`을 추가합니다.

## 7. 실행 계획
1.  **DB 설정**: SQL 쿼리 작성 및 실행 (사용자에게 요청)
2.  **타입 추가**: `vote.types.ts` 업데이트
3.  **API 구현**: `lib/supabase/comments.ts` 생성
4.  **UI 구현**: 컴포넌트 개발
5.  **페이지 적용**: 투표 페이지에 연동
