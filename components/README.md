# Components 구조 가이드

## 공통 컴포넌트 분류

### 1. Layout & Navigation (레이아웃 및 네비게이션)
전역 레이아웃과 네비게이션 관련 컴포넌트

- `bottom-navigation.tsx` - 하단 네비게이션 바
- `vote-header.tsx` - 투표 페이지 헤더 (중복 제거 필요)

**위치**: `components/layout/`

---

### 2. Modal & Dialog (모달 및 다이얼로그)
다양한 모달 및 다이얼로그 컴포넌트

- `mission-creation-modal.tsx` - 미션 생성 모달
- `my-pick-view-modal.tsx` - 내 픽 보기 모달
- `my-picks-modal.tsx` - 내 픽 결과 모달
- `profile-modal.tsx` - 프로필 모달

**위치**: `components/modal/`

---

### 3. Status & Feedback (상태 표시 및 피드백)
상태 표시, 알림, 피드백 관련 컴포넌트

- `closing-progress.tsx` - 마감 진행 상태 표시
- `live-hint.tsx` - 실시간 힌트
- `comment-banner.tsx` - 댓글/피드백 배너
- `result-character-popup.tsx` - 결과 캐릭터 팝업

**위치**: `components/feedback/`

---

### 4. Form & Input (폼 및 입력)
폼 및 입력 관련 컴포넌트

- `choice-list.tsx` - 선택지 리스트 (라디오 버튼)
- `episode-selector.tsx` - 회차 선택기

**위치**: `components/form/`

---

### 5. Vote (투표 관련)
투표 기능 전용 컴포넌트

- `vote/episode-selector.tsx` - 회차 선택기 (중복 확인 필요)
- `vote/match-vote-page.tsx` - 커플 매칭 투표 페이지
- `vote/multi-vote-page.tsx` - 다중 선택 투표 페이지
- `vote/result-section.tsx` - 결과 섹션
- `vote/submission-sheet.tsx` - 제출 시트
- `vote/vote-header.tsx` - 투표 헤더

**위치**: `components/vote/` (현재 구조 유지)

---

### 6. UI Components (기본 UI 컴포넌트)
shadcn/ui 기반 기본 UI 컴포넌트

- `ui/avatar.tsx`
- `ui/badge.tsx`
- `ui/button.tsx`
- `ui/card.tsx`
- `ui/dialog.tsx`
- `ui/dropdown-menu.tsx`
- `ui/input.tsx`
- `ui/label.tsx`
- `ui/progress.tsx`
- `ui/select.tsx`
- `ui/tabs.tsx`
- `ui/toast.tsx`

**위치**: `components/ui/` (현재 구조 유지)

---

### 7. Provider (컨텍스트 프로바이더)
전역 상태 및 테마 관리

- `theme-provider.tsx` - 테마 프로바이더

**위치**: `components/providers/`

---

## 제안하는 폴더 구조

```
components/
├── layout/              # 레이아웃 및 네비게이션
│   ├── bottom-navigation.tsx
│   └── vote-header.tsx
│
├── modal/               # 모달 및 다이얼로그
│   ├── mission-creation-modal.tsx
│   ├── my-pick-view-modal.tsx
│   ├── my-picks-modal.tsx
│   └── profile-modal.tsx
│
├── feedback/            # 상태 표시 및 피드백
│   ├── closing-progress.tsx
│   ├── live-hint.tsx
│   ├── comment-banner.tsx
│   └── result-character-popup.tsx
│
├── form/                # 폼 및 입력
│   ├── choice-list.tsx
│   └── episode-selector.tsx (vote 폴더에서 이동 고려)
│
├── vote/                # 투표 관련 (현재 구조 유지)
│   ├── episode-selector.tsx
│   ├── match-vote-page.tsx
│   ├── multi-vote-page.tsx
│   ├── result-section.tsx
│   ├── submission-sheet.tsx
│   └── vote-header.tsx
│
├── ui/                  # 기본 UI 컴포넌트 (shadcn/ui)
│   └── ...
│
└── providers/           # 컨텍스트 프로바이더
    └── theme-provider.tsx
```

---

## 주의사항

1. **중복 컴포넌트 확인 필요**
   - `vote-header.tsx` (루트) vs `vote/vote-header.tsx` - 통합 필요
   - `episode-selector.tsx` (form) vs `vote/episode-selector.tsx` - 위치 결정 필요

2. **네이밍 일관성**
   - 모달 컴포넌트는 `-modal.tsx` 접미사 유지
   - 헤더 컴포넌트는 `-header.tsx` 접미사 유지

3. **재사용성 고려**
   - 공통으로 사용되는 컴포넌트는 상위 폴더에 배치
   - 특정 기능에만 사용되는 컴포넌트는 해당 기능 폴더에 배치

---

## 다음 단계

1. 중복 컴포넌트 통합
2. 폴더 구조 재구성
3. import 경로 업데이트
4. 컴포넌트 문서화


