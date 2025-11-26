# 커플 매칭 조회 에러 정리

## 🔴 발생 중인 주요 에러들

### 1. **406 에러 (Not Acceptable) - t_missions1 조회 시도**

**에러 메시지:**
```
Failed to load resource: the server responded with a status of 406
yqfvlgwfqclsutjtluja.supabase.co/rest/v1/t_missions1?select=*&f_id=eq.{missionId}
```

**원인:**
- 커플매칭 미션은 `t_missions2` 테이블에만 존재함
- `getMission()` 함수가 `t_missions1`에서만 조회를 시도
- 커플매칭 미션 ID로 `t_missions1`을 조회하면 406 에러 발생

**현재 해결 상태:**
- ✅ `app/p-mission/[id]/vote/page.tsx`: `getMission2`를 먼저 호출하도록 수정됨
- ✅ `app/p-mission/[id]/results/page.tsx`: `getMission2`를 먼저 호출하도록 수정됨
- ⚠️ `getMission2` 함수에서 406 에러를 명시적으로 처리하지 않음

**문제 코드 위치:**
```typescript
// lib/supabase/missions.ts - getMission2()
// 현재 406 에러를 처리하지 않음
if (error.code === "PGRST116") {
  return { success: false }
}
// 406 에러도 추가 필요
```

---

### 2. **406 에러 - t_pickresult1 조회 시도**

**에러 메시지:**
```
Failed to load resource: the server responded with a status of 406
yqfvlgwfqclsutjtluja.supabase.co/rest/v1/t_pickresult1?select=*&f_user_id=eq.{userId}&f_mission_id=eq.{missionId}
```

**원인:**
- 커플매칭 미션의 투표는 `t_pickresult2`에 저장됨
- `getVote1()` 함수가 `t_pickresult1`에서 조회를 시도
- 커플매칭 미션 ID로 `t_pickresult1`을 조회하면 406 에러 발생

**현재 해결 상태:**
- ✅ `getVote1()` 함수에 406 에러 처리 추가됨 (무시하고 null 반환)
- ⚠️ `hasUserVoted()` 함수가 커플매칭 미션인지 확인하지 않고 무조건 `getVote1()`을 먼저 호출
- ⚠️ `app/p-mission/[id]/results/page.tsx`에서 조건문이 있지만, 다른 곳에서도 호출될 수 있음

**문제 코드 위치:**
```typescript
// lib/supabase/votes.ts - hasUserVoted()
export async function hasUserVoted(userId: string, missionId: string): Promise<boolean> {
  // ❌ 문제: 커플매칭 미션인지 확인하지 않고 무조건 getVote1() 호출
  const vote1 = await getVote1(userId, missionId)  // 406 에러 발생 가능
  if (vote1) return true

  // t_pickresult2 확인
  const supabase = createClient()
  const { data } = await supabase
    .from("t_pickresult2")
    .select("f_id")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .limit(1)

  return (data?.length || 0) > 0
}
```

**호출 위치:**
- `app/page.tsx`: `checkUserVoted(userId, mission.id)` - 모든 미션에 대해 호출
- `app/p-missions/page.tsx`: `checkUserVoted(userId, mission.id)` - 모든 미션에 대해 호출

---

### 3. **미션 타입 확인 로직 부재**

**문제:**
- 미션이 커플매칭인지 확인하는 로직이 일관되지 않음
- 미션 ID만으로는 `t_missions1`인지 `t_missions2`인지 알 수 없음
- 따라서 모든 함수에서 두 테이블을 모두 확인해야 함

**현재 상태:**
- ✅ `vote/page.tsx`: `getMission2` 먼저 시도 → 실패 시 `getMission` 시도
- ✅ `results/page.tsx`: `getMission2` 먼저 시도 → 실패 시 `getMission` 시도
- ❌ `hasUserVoted()`: 미션 타입 확인 없이 `getVote1` 먼저 호출

---

## 📋 해결 방안

### 1. `getMission2` 함수에 406 에러 처리 추가

```typescript
// lib/supabase/missions.ts
export async function getMission2(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("t_missions2")
      .select("*")
      .eq("f_id", missionId)
      .single()

    if (error) {
      // PGRST116: No rows returned (정상 - 해당 테이블에 없음)
      // 406: Not Acceptable (RLS 정책 또는 테이블 접근 불가)
      if (error.code === "PGRST116" || error.code === "406") {
        return { success: false } // 에러가 아니고 단순히 없음
      }
      console.error("커플매칭 미션 조회 실패:", error)
      return { success: false, error: "커플매칭 미션을 찾을 수 없습니다." }
    }

    return { success: true, mission: data }
  } catch (error) {
    console.error("커플매칭 미션 조회 중 오류:", error)
    return { success: false, error: "커플매칭 미션 조회 중 오류가 발생했습니다." }
  }
}
```

### 2. `hasUserVoted` 함수 개선

**방안 A: 미션 타입을 파라미터로 받기**
```typescript
export async function hasUserVoted(
  userId: string, 
  missionId: string, 
  missionForm?: "binary" | "multi" | "subjective" | "match"
): Promise<boolean> {
  // 커플매칭인 경우 t_pickresult2만 확인
  if (missionForm === "match") {
    const supabase = createClient()
    const { data } = await supabase
      .from("t_pickresult2")
      .select("f_id")
      .eq("f_user_id", userId)
      .eq("f_mission_id", missionId)
      .limit(1)
    return (data?.length || 0) > 0
  }

  // 그 외의 경우 t_pickresult1 확인
  const vote1 = await getVote1(userId, missionId)
  if (vote1) return true

  // t_pickresult2도 확인 (혹시 모를 경우 대비)
  const supabase = createClient()
  const { data } = await supabase
    .from("t_pickresult2")
    .select("f_id")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .limit(1)

  return (data?.length || 0) > 0
}
```

**방안 B: 두 테이블 모두 확인하되 에러 무시**
```typescript
export async function hasUserVoted(userId: string, missionId: string): Promise<boolean> {
  // t_pickresult1 확인 (406 에러는 무시)
  try {
    const vote1 = await getVote1(userId, missionId)
    if (vote1) return true
  } catch (error) {
    // 406 에러는 무시 (커플매칭 미션일 수 있음)
  }

  // t_pickresult2 확인
  const supabase = createClient()
  const { data } = await supabase
    .from("t_pickresult2")
    .select("f_id")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .limit(1)

  return (data?.length || 0) > 0
}
```

**방안 C: 미션 조회 후 타입 확인**
```typescript
export async function hasUserVoted(userId: string, missionId: string): Promise<boolean> {
  // 먼저 미션 타입 확인
  const mission2Result = await getMission2(missionId)
  if (mission2Result.success) {
    // 커플매칭 미션인 경우 t_pickresult2만 확인
    const supabase = createClient()
    const { data } = await supabase
      .from("t_pickresult2")
      .select("f_id")
      .eq("f_user_id", userId)
      .eq("f_mission_id", missionId)
      .limit(1)
    return (data?.length || 0) > 0
  }

  // 일반 미션인 경우 t_pickresult1 확인
  const vote1 = await getVote1(userId, missionId)
  return vote1 !== null
}
```

### 3. 통합 미션 조회 함수 생성 (선택사항)

```typescript
// lib/supabase/missions.ts
export async function getMissionUnified(missionId: string): Promise<{ 
  success: boolean; 
  mission?: TMission; 
  source?: "t_missions1" | "t_missions2";
  error?: string 
}> {
  // 먼저 t_missions2에서 시도
  const mission2Result = await getMission2(missionId)
  if (mission2Result.success && mission2Result.mission) {
    return {
      success: true,
      mission: transformMission2ToTMission(mission2Result.mission),
      source: "t_missions2"
    }
  }

  // t_missions2에 없으면 t_missions1에서 시도
  const mission1Result = await getMission(missionId)
  if (mission1Result.success && mission1Result.mission) {
    return {
      success: true,
      mission: transformMission1ToTMission(mission1Result.mission),
      source: "t_missions1"
    }
  }

  return { success: false, error: "미션을 찾을 수 없습니다." }
}
```

---

## 🎯 우선순위별 해결 계획

### 즉시 해결 필요 (High Priority)
1. ✅ `getMission2`에 406 에러 처리 추가
2. ✅ `hasUserVoted` 함수 개선 (방안 B 추천 - 가장 안전함)

### 중기 개선 (Medium Priority)
3. 모든 미션 조회 로직을 `getMission2` 먼저 시도하도록 통일
4. 에러 로깅 개선 (406 에러는 정상 케이스로 처리)

### 장기 개선 (Low Priority)
5. 통합 미션 조회 함수 생성
6. 미션 타입 캐싱으로 불필요한 조회 방지

---

## 📝 참고사항

- **406 에러는 정상 케이스일 수 있음**: 커플매칭 미션을 `t_missions1`에서 조회하려고 하면 406이 발생하는 것이 정상
- **RLS 정책 확인 필요**: Supabase RLS 정책이 올바르게 설정되어 있는지 확인
- **에러 로깅**: 406 에러는 콘솔에 에러로 로깅하지 말고, 정상적인 fallback 로직으로 처리



