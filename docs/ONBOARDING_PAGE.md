# 온보딩 페이지 가이드

리얼픽 온보딩 페이지 구현 문서입니다.

---

## 📋 개요

비로그인 사용자가 처음 리얼픽에 접속했을 때 보여지는 온보딩 페이지입니다.
3단계 구조로 서비스를 소개하고, 핵심 가치를 전달합니다.

---

## 🎯 목표

### 3초 안에 전달
- **"예능을 보며, 실시간으로 판단하고 투표하는 곳"**
- 사용자가 즉시 서비스를 이해할 수 있도록 명확한 메시지 전달

### UX 원칙
- ✅ 한 화면에 하나의 메시지
- ✅ 긴 설명 금지
- ✅ 실제 UI 컴포넌트 미리보기
- ✅ 인터랙티브한 요소

---

## 🎨 디자인 시스템

### 메인 색상
```css
/* Primary Gradient */
from: #2C2745 (Deep Purple)
to: #3E757B (Teal)

/* 사용처 */
- 헤드라인 텍스트
- CTA 버튼
- 아이콘 배경
- 진행 바
```

### 레이아웃
- **반응형**: 모바일/태블릿/데스크톱 대응
- **스크롤 기반**: 각 섹션이 viewport 단위로 배치
- **진행 표시**: 우측 상단 점 네비게이션 (데스크톱)

---

## 📐 구조

### STEP 1: 서비스 소개
**목표**: 3초 안에 "아, 이런 앱이구나" 이해

**구성 요소**:
1. **배지**: "예능 시청의 새로운 경험"
2. **메인 메시지**: 
   ```
   예능을 보며, 
   실시간으로 판단하고 투표하는 곳
   ```
3. **서브 메시지**:
   ```
   연애, 오디션, 서바이벌 예능을
   시청자들의 선택으로 기록합니다
   ```
4. **CTA 버튼**: "시작하기"
5. **비주얼 프리뷰**: 실제 투표 카드 2개
   - 커플 매칭 예시 (나는 SOLO)
   - 우승자 예측 예시 (흑백요리사)
6. **스크롤 인디케이터**: 아래로 스크롤 유도

**특징**:
- 애니메이션: fade-in, translate-y
- 호버 효과: 카드 scale-up, border 색상 변경
- 실제 퍼센트 바와 투표 UI 미리보기

---

### STEP 2: 핵심 가치 (3가지)
**목표**: "그래서 이 앱이 나한테 뭐가 좋은데?"에 답변

**카드 1: 내 판단, 맞았을까?**
- 아이콘: CheckCircle2
- 설명: 내가 고른 선택과 실제 결과 비교
- 시각 요소: 정답률 73% 표시

**카드 2: 사람들은 이렇게 봤어요**
- 아이콘: Users
- 설명: 다수 의견과 인기 선택 확인
- 시각 요소: 진행 바 85% 표시

**카드 3: 보다 보면, 패턴이 보입니다**
- 아이콘: TrendingUp
- 설명: 픽 기록, 점수, 티어로 성향 확인
- 시각 요소: 포인트 & 티어 표시

**인터랙션**:
- 호버 시 카드 상승 효과 (translate-y)
- 아이콘 scale-up
- 그림자 확대

---

### STEP 3: 핵심 기능 요약
**목표**: 기능 나열이 아닌 경험 흐름 전달

**3단계 플로우**:

1. **장면마다 바로 투표하고**
   - 아이콘: Vote
   - 번호: 1
   - 설명: 예능을 보면서 실시간으로 투표

2. **회차별로 결과를 예측하고**
   - 아이콘: Heart
   - 번호: 2
   - 설명: 커플 매칭, 탈락자 등 예측

3. **내 선택과 전체 선택을 비교합니다**
   - 아이콘: BarChart3
   - 번호: 3
   - 설명: 다른 사람들과 비교

**Final CTA**:
- 제목: "지금 시작해보세요"
- 설명: "이메일만 있으면 3초 만에 시작 가능"
- 버튼: "무료로 시작하기"
- 부가 정보: 
  - ✓ 이메일 인증만으로 간편 가입
  - ✓ 카드 등록 불필요

---

## 🔧 기술 구현

### 파일 구조
```
components/c-onboarding/
  └── onboarding.tsx

app/
  └── page.tsx (메인 페이지에 통합)
```

### 주요 기능

#### 1. 스크롤 기반 진행 표시
```typescript
useEffect(() => {
  const handleScroll = () => {
    const scrollPosition = window.scrollY
    const windowHeight = window.innerHeight
    const step = Math.floor(scrollPosition / windowHeight)
    setCurrentStep(Math.min(step, 2))
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

#### 2. 로그인 상태 분기
```typescript
// 비로그인: 온보딩 표시
if (!isLoggedIn) {
  return <Onboarding onGetStarted={() => setShowLoginModal(true)} />
}

// 로그인: 미션 목록 표시
return <MissionList ... />
```

#### 3. 애니메이션
- **Fade-in**: opacity + translate-y
- **Bounce**: 스크롤 인디케이터
- **Pulse**: 배지 애니메이션
- **Scale**: 호버 효과
- **Rotate**: 아이콘 회전

---

## 📱 반응형 디자인

### 브레이크포인트
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### 모바일 최적화
- 그리드 레이아웃: 1열 → 3열
- 폰트 크기 조정: text-4xl → text-6xl
- 진행 표시기: 모바일에서 숨김
- 패딩/여백 조정

---

## 🎭 애니메이션 클래스

### Tailwind CSS
```css
/* Fade-in-up */
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

/* Pulse */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Bounce */
.animate-bounce {
  animation: bounce 1s infinite;
}
```

### 커스텀 애니메이션
```typescript
// Shimmer effect (카드 호버)
className="group-hover:animate-[shimmer_1.5s_infinite]"

// Scale on hover
className="transform hover:scale-105 transition-all duration-300"

// Translate on hover
className="hover:-translate-y-2 transition-all duration-300"
```

---

## 🚀 사용 방법

### 1. 로그인 전 사용자
1. 홈페이지 접속 (`/`)
2. 온보딩 페이지 자동 표시
3. "시작하기" 버튼 클릭
4. 로그인 모달 표시
5. 인증 완료 후 미션 목록으로 이동

### 2. 로그인 후 사용자
1. 홈페이지 접속 (`/`)
2. 미션 목록 바로 표시
3. 온보딩 페이지 건너뜀

---

## 📊 성과 측정

### 주요 지표
- **3초 이해도**: 사용자가 서비스를 빠르게 이해하는가?
- **CTA 클릭률**: "시작하기" 버튼 클릭 비율
- **스크롤 깊이**: 사용자가 3단계 모두 확인하는가?
- **가입 전환율**: 온보딩 → 로그인 → 가입 완료

### 개선 포인트
- A/B 테스트: 다양한 헤드라인 문구
- 히트맵 분석: 사용자가 주목하는 영역
- 스크롤 이탈률: 어느 섹션에서 이탈하는가?

---

## 🎯 베스트 프랙티스

### DO ✅
- 명확하고 간결한 메시지
- 실제 UI 컴포넌트 미리보기
- 브랜드 색상 일관성
- 부드러운 애니메이션
- 모바일 우선 디자인

### DON'T ❌
- 긴 설명 텍스트
- 추상적인 이미지
- 과도한 애니메이션
- 여러 메시지 동시 전달
- 복잡한 네비게이션

---

## 🔄 업데이트 이력

### v1.0 (2025-12-15)
- ✅ 3단계 온보딩 구조 구현
- ✅ 스크롤 기반 진행 표시
- ✅ 실제 투표 카드 미리보기
- ✅ 로그인 모달 통합
- ✅ 반응형 디자인
- ✅ 애니메이션 효과

---

## 📞 문의

온보딩 페이지 관련 문의사항이나 개선 제안이 있으시면 알려주세요!

---

**리얼픽에 오신 것을 환영합니다!** 🎉

