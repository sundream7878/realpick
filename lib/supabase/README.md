# Supabase 데이터베이스 유틸리티 함수

이 폴더에는 Supabase 데이터베이스에서 데이터를 읽고 수정하는 함수들이 포함되어 있습니다.

## 📁 파일 구조

- `client.ts` - Supabase 클라이언트 생성
- `users.ts` - 사용자 데이터 CRUD
- `missions.ts` - 미션 데이터 CRUD (missions1, missions2)
- `votes.ts` - 투표 데이터 CRUD (pickresult1, pickresult2)
- `episodes.ts` - 에피소드 데이터 CRUD
- `points.ts` - 포인트 로그 CRUD

## 🚀 사용 예제

### 사용자 데이터

```typescript
import { getUser, updateUserPoints, getUserRanking } from '@/lib/supabase'

// 사용자 정보 조회
const user = await getUser('user-id-123')
console.log(user?.nickname, user?.points)

// 포인트 업데이트
await updateUserPoints('user-id-123', 1500)

// 랭킹 조회
const topUsers = await getUserRanking(10)
```

### 미션 데이터

```typescript
import { getMission, getAllMissions, createMission1 } from '@/lib/supabase/missions'

// 미션 조회
const mission = await getMission('mission-id-123')

// 모든 미션 조회
const allMissions = await getAllMissions()

// Binary/Multi 미션 생성
const newMission = await createMission1({
  title: '새로운 미션',
  kind: 'predict',
  form: 'binary',
  options: ['옵션1', '옵션2'],
  deadline: new Date().toISOString(),
  // ...
})
```

### 투표 데이터

```typescript
import { submitVote1, submitVote2, hasUserVoted } from '@/lib/supabase/votes'

// Binary/Multi 투표 제출
await submitVote1({
  userId: 'user-id-123',
  missionId: 'mission-id-123',
  choice: '옵션1',
  submittedAt: new Date().toISOString(),
})

// 커플 매칭 투표 제출
await submitVote2({
  userId: 'user-id-123',
  missionId: 'mission-id-123',
  episodeNo: 1,
  pairs: [
    { left: '남성1', right: '여성1' },
    { left: '남성2', right: '여성2' },
  ],
  submittedAt: new Date().toISOString(),
})

// 투표 여부 확인
const voted = await hasUserVoted('user-id-123', 'mission-id-123')
```

### 에피소드 데이터

```typescript
import { getEpisode, updateEpisodeStatus } from '@/lib/supabase/episodes'

// 에피소드 조회
const episode = await getEpisode('mission-id-123', 1)

// 에피소드 상태 업데이트
await updateEpisodeStatus('mission-id-123', 1, 'open')
```

### 포인트 로그

```typescript
import { addPointLog, getUserPointLogs } from '@/lib/supabase/points'

// 포인트 로그 추가
await addPointLog(
  'user-id-123',
  100, // 획득 포인트
  '미션 정답 보상',
  'mission-id-123',
  'mission1'
)

// 사용자 포인트 로그 조회
const logs = await getUserPointLogs('user-id-123', 50)
```

## 🔄 서버 컴포넌트에서 사용

서버 컴포넌트에서는 `server.ts`의 클라이언트를 사용해야 합니다:

```typescript
// app/missions/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'
import { getAllMissions } from '@/lib/supabase/missions'

export default async function MissionsPage() {
  const missions = await getAllMissions()
  
  return (
    <div>
      {missions.map(mission => (
        <div key={mission.id}>{mission.title}</div>
      ))}
    </div>
  )
}
```

## 🔄 클라이언트 컴포넌트에서 사용

클라이언트 컴포넌트에서는 `client.ts`의 클라이언트를 사용합니다:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getMission } from '@/lib/supabase/missions'
import type { TMission } from '@/types/t-vote/vote.types'

export default function MissionDetail({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<TMission | null>(null)

  useEffect(() => {
    async function fetchMission() {
      const data = await getMission(missionId)
      setMission(data)
    }
    fetchMission()
  }, [missionId])

  if (!mission) return <div>Loading...</div>

  return <div>{mission.title}</div>
}
```

## ⚠️ 주의사항

1. **RLS 정책**: Supabase의 Row Level Security 정책에 따라 사용자 권한에 따라 접근이 제한될 수 있습니다.

2. **에러 처리**: 모든 함수는 에러 발생 시 `null` 또는 빈 배열을 반환합니다. 프로덕션에서는 더 상세한 에러 처리가 필요할 수 있습니다.

3. **타입 안정성**: TypeScript 타입을 사용하여 타입 안정성을 보장합니다.

4. **환경 변수**: `.env.local` 파일에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 설정되어 있어야 합니다.

## 📚 더 알아보기

- [Supabase 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript/introduction)










