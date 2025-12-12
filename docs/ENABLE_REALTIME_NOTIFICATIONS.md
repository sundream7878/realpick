# 실시간 알림 활성화 가이드

헤더의 카테고리 옆에 빨간 배지가 표시되도록 Supabase Realtime을 설정하는 방법입니다.

---

## 🔍 문제

- 새 미션 생성 시 헤더 카테고리 옆에 알림 배지가 안 뜸
- 실시간으로 업데이트가 안 됨

---

## ✅ 해결 방법

### Step 1: Supabase Realtime 활성화

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Database** → **Replication** 메뉴 클릭

### Step 2: 테이블 Realtime 켜기

**t_missions1 테이블**:
1. 테이블 목록에서 `t_missions1` 찾기
2. 오른쪽 **Realtime** 토글 **켜기** (ON)
3. **Enable insert**, **Enable update**, **Enable delete** 모두 체크

**t_missions2 테이블**:
1. 테이블 목록에서 `t_missions2` 찾기
2. 오른쪽 **Realtime** 토글 **켜기** (ON)
3. **Enable insert**, **Enable update**, **Enable delete** 모두 체크

### Step 3: 저장 및 확인

1. **Save** 또는 **Apply** 버튼 클릭
2. Realtime 상태가 **Active**로 변경되는지 확인

---

## 🧪 테스트

### 1️⃣ 브라우저 콘솔 확인

1. 웹사이트 접속 (F12 개발자 도구 열기)
2. **Console** 탭 확인
3. 다른 탭/브라우저에서 **미션 생성**
4. 콘솔에 이 로그가 나타나야 함:

```javascript
[Realtime] 새 미션 생성 감지 (t_missions1): { f_id: "...", f_title: "...", ... }
```

### 2️⃣ 배지 확인

새 미션 생성 후:
- ❤️ 로맨스 카테고리 옆에 **빨간 점** 표시
- 🏆 서바이벌 카테고리 옆에 **빨간 점** 표시
- ⭐ 오디션 카테고리 옆에 **빨간 점** 표시

---

## 🔧 추가 설정 (필요시)

### Realtime RLS 정책

Realtime이 작동하려면 SELECT 권한이 필요합니다.

**현재 RLS 정책 확인**:
```sql
-- t_missions1, t_missions2 정책 확인
SELECT * FROM pg_policies 
WHERE tablename IN ('t_missions1', 't_missions2');
```

**Realtime용 정책 추가** (이미 있을 것):
```sql
-- 모든 사용자가 미션 조회 가능 (Realtime 포함)
CREATE POLICY "Anyone can view missions1" ON t_missions1
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view missions2" ON t_missions2
  FOR SELECT USING (true);
```

---

## 💡 작동 원리

1. **새 미션 생성** → Supabase가 INSERT 이벤트 감지
2. **Realtime 구독** → 브라우저가 이벤트 수신
3. **localStorage 저장** → 읽지 않은 미션 ID 저장
4. **배지 표시** → 카테고리 옆에 빨간 점 표시
5. **미션 클릭** → 읽음 처리, 배지 사라짐

---

## 🎯 확인 사항

### 배지가 여전히 안 뜬다면:

**1. 콘솔 로그 확인**
```javascript
// 읽지 않은 미션 ID 확인
localStorage.getItem('rp_unread_missions')
// 결과: ["id1", "id2", ...]
```

**2. Realtime 연결 상태**
```javascript
// 콘솔에서 실행
const supabase = createClient()
supabase.channel('test').subscribe((status) => {
  console.log('Realtime status:', status)
})
```

**3. 페이지에서 missions prop 전달 확인**
- AppHeader 컴포넌트에 `missions` prop이 전달되는지
- 미션 데이터가 올바르게 로드되는지

---

## 🚨 일반적인 문제

### 1. Realtime이 활성화되지 않음
→ Database → Replication에서 토글 켜기

### 2. RLS 정책으로 인한 구독 불가
→ SELECT 정책이 `USING (true)`인지 확인

### 3. missions prop이 전달 안 됨
→ 페이지에서 미션 목록을 로드하고 AppHeader에 전달

### 4. 캐시 문제
→ localStorage 초기화:
```javascript
localStorage.removeItem('rp_unread_missions')
```

---

## 📁 관련 파일

- `hooks/useNewMissionNotifications.ts` - Realtime 구독 훅
- `components/c-layout/AppHeader.tsx` - 헤더 컴포넌트
- `components/c-common/ShowMenu.tsx` - 배지 표시
- `components/c-ui/BreathingLightBadge.tsx` - 배지 컴포넌트

---

**Realtime을 활성화하면 실시간 알림이 작동합니다!** 🎉

