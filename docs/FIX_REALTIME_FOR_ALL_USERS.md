# 모든 사용자에게 실시간 알림이 보이도록 수정

## 🔍 문제

- 미션 생성자만 알림 배지가 보임
- 다른 사용자 브라우저에는 실시간 알림이 안 보임

---

## ✅ 해결 방법 (3단계)

### Step 1: SQL 실행 (가장 중요!)

**Supabase SQL Editor**에서 실행:

`scripts/fix_realtime_for_all_users.sql` 파일의 내용을 복사해서 실행하세요.

또는 아래 SQL 직접 실행:

```sql
-- RLS 정책 재생성 (모든 사용자 조회 가능)
DROP POLICY IF EXISTS "Anyone can view missions1" ON t_missions1;
DROP POLICY IF EXISTS "Anyone can view missions2" ON t_missions2;

CREATE POLICY "Anyone can view missions1" ON t_missions1
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view missions2" ON t_missions2
  FOR SELECT USING (true);

-- Realtime Publication 추가
ALTER PUBLICATION supabase_realtime ADD TABLE t_missions1;
ALTER PUBLICATION supabase_realtime ADD TABLE t_missions2;
```

---

### Step 2: Supabase Realtime 설정 확인

**Supabase Dashboard**:

1. **Database** → **Replication** 메뉴
2. `t_missions1` 찾기 → **Realtime** 켜기
3. `t_missions2` 찾기 → **Realtime** 켜기

**중요 옵션 확인**:
- ✅ **Enable realtime**: ON
- ✅ **Insert events**: 체크
- ✅ **Update events**: 체크  
- ✅ **Delete events**: 체크

**RLS 관련 옵션** (있다면):
- "Allow anonymous access" → **체크**
- "Bypass RLS for realtime" → **체크** (프로젝트 설정에 따라 다를 수 있음)

---

### Step 3: 테스트

#### 3-1. 브라우저 2개 준비

**브라우저 A (미션 생성자)**:
- Chrome에서 로그인
- F12 개발자 도구 열기

**브라우저 B (다른 사용자)**:
- Edge 또는 시크릿 모드에서 로그인
- F12 개발자 도구 열기

#### 3-2. 콘솔 확인

**브라우저 B (다른 사용자)**에서:
1. 홈 화면 접속
2. Console 탭 확인
3. 이 로그가 나와야 함:
```
[Realtime] t_missions1 구독 상태: SUBSCRIBED
[Realtime] t_missions2 구독 상태: SUBSCRIBED
```

❌ 만약 `CLOSED` 또는 `CHANNEL_ERROR`가 나온다면:
- RLS 정책 문제
- Realtime 설정 문제

#### 3-3. 미션 생성 테스트

**브라우저 A**에서:
1. 새 미션 생성
2. 카테고리 선택 (예: 로맨스)
3. 미션 게시

**브라우저 B**에서:
1. Console에 이 로그가 나와야 함:
```
[Realtime] 새 미션 생성 감지 (t_missions1): { f_id: "...", ... }
🔔 새 미션: [미션 제목]
```

2. 헤더의 ❤️ 로맨스 옆에 **빨간 점** 표시됨 ✅

---

## 🔍 디버깅

### 다른 사용자 콘솔에서 실행:

```javascript
// 1. Realtime 구독 상태 확인
const { createClient } = await import('@/lib/supabase/client')
const supabase = createClient()

const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 't_missions1' },
    payload => console.log('받음:', payload)
  )
  .subscribe(status => console.log('구독 상태:', status))

// 2. 읽지 않은 미션 확인
localStorage.getItem('rp_unread_missions')

// 3. Realtime 연결 확인
supabase.channel('heartbeat').subscribe()
```

---

## 🚨 일반적인 원인

### 1. Realtime Publication 누락
**증상**: 생성자만 알림, 다른 사용자는 안 보임

**해결**: 
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE t_missions1;
ALTER PUBLICATION supabase_realtime ADD TABLE t_missions2;
```

### 2. RLS 정책 문제
**증상**: 구독 상태가 `CHANNEL_ERROR`

**해결**:
```sql
-- 모든 사용자 조회 가능하도록
CREATE POLICY "Anyone can view missions1" ON t_missions1
  FOR SELECT USING (true);
```

### 3. 익명 사용자 제한
**증상**: 로그인 안 한 사용자만 안 보임

**해결**: 
- Supabase Dashboard → Database → Replication
- "Allow anonymous subscriptions" 체크

### 4. 브라우저 캐시
**증상**: 설정 후에도 안 보임

**해결**:
```javascript
// 두 사용자 모두 실행
localStorage.removeItem('rp_unread_missions')
location.reload()
```

---

## 🎯 성공 기준

✅ **정상 작동**:
- 브라우저 A에서 미션 생성
- 브라우저 B에서 즉시 알림 배지 표시
- 콘솔에 "[Realtime] 새 미션 생성 감지" 로그

❌ **여전히 안 됨**:
- 브라우저 B 콘솔에 로그 없음
- 구독 상태가 `SUBSCRIBED`가 아님

---

## 📋 체크리스트

```
□ SQL 실행: fix_realtime_for_all_users.sql
□ Realtime 켜기: Database → Replication
□ t_missions1, t_missions2 모두 Realtime ON
□ 브라우저 2개로 테스트
□ 다른 사용자 콘솔에 "구독 상태: SUBSCRIBED" 확인
□ 미션 생성 시 "[Realtime] 새 미션 생성 감지" 로그 확인
□ 배지 표시 확인
```

---

## 🔧 추가 설정 (필요시)

### Supabase API Settings

**Settings** → **API** → **Realtime**:
- "Enable Realtime" → **ON**
- "Max connections" → 기본값 유지

### 프로젝트 재시작 (최후 수단)

Supabase 무료 플랜은 가끔 재시작이 필요할 수 있음:
1. **Settings** → **General**
2. **Pause project**
3. **Resume project**

⚠️ 주의: 짧은 다운타임 발생 (1-2분)

---

**SQL을 실행하고 Realtime을 확인하면 모든 사용자에게 알림이 보일 것입니다!** 🎉

