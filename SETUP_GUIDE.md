# 리얼픽 SNS 바이럴 시스템 설치 가이드

## 🚀 빠른 시작

### 1. 필수 프로그램 설치

#### FFmpeg 설치 (필수 ⭐)

**Windows**:
```bash
# Chocolatey 사용
choco install ffmpeg

# 또는 수동 설치:
# 1. https://ffmpeg.org/download.html 방문
# 2. Windows builds from gyan.dev 다운로드
# 3. ffmpeg.exe를 PATH에 추가
```

**macOS**:
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**설치 확인**:
```bash
ffmpeg -version
```

### 2. 한글 폰트 다운로드

#### Pretendard 폰트 (권장)

1. https://github.com/orioncactus/pretendard/releases 방문
2. `Pretendard-1.3.9.zip` 다운로드
3. 압축 해제 후 `web/static/woff2/Pretendard-Bold.ttf` 파일 찾기
4. 프로젝트에 복사:

```bash
# 프로젝트 루트에서
mkdir -p assets/fonts
# 다운로드한 Pretendard-Bold.ttf를 assets/fonts/ 폴더로 복사
```

**폴더 구조**:
```
realpick/
├── assets/
│   └── fonts/
│       ├── Pretendard-Bold.ttf
│       └── Pretendard-SemiBold.ttf (옵션)
├── lib/
├── app/
└── ...
```

### 3. 패키지 설치 완료 확인

```bash
npm list canvas
npm list @google/generative-ai
```

모두 설치되어 있어야 합니다.

### 4. 환경 변수 설정

`.env.local` 파일에 Gemini API 키 추가:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Gemini API 키 발급**:
1. https://makersuite.google.com/app/apikey 방문
2. "Create API Key" 클릭
3. 무료 할당량: 월 60회 요청

### 5. 테스트 실행

```bash
# 개발 서버 실행
npm run dev

# 다른 터미널에서 테스트 API 호출
curl -X POST http://localhost:3000/api/video/render \
  -H "Content-Type: application/json" \
  -d '{"missionId": "test-mission-id", "track": "auto", "platforms": ["instagram"]}'
```

## 📁 temp 폴더 생성

렌더링된 영상이 저장될 폴더 생성:

```bash
mkdir temp
```

`.gitignore`에 추가:
```
temp/
*.mp4
*.png
```

## 🎬 첫 영상 생성 테스트

### Option 1: API 호출로 테스트

```typescript
// test-video-generation.ts
import { generateVideoScenario } from './lib/video/scenario-generator'
import { renderVideoFromScenario } from './lib/video/canvas-renderer'

const testMission = {
  id: 'test-001',
  title: '나는 솔로 영호 vs 광수',
  showId: 'nasolo',
  optionA: '영호',
  optionB: '광수'
}

async function test() {
  console.log('1. 시나리오 생성 중...')
  const scenario = await generateVideoScenario({
    mission: testMission,
    track: 'auto'
  })
  
  console.log('2. 영상 렌더링 중...')
  const videoPath = await renderVideoFromScenario({
    missionId: testMission.id,
    scenario
  })
  
  console.log('✅ 완료:', videoPath)
}

test()
```

```bash
npx tsx test-video-generation.ts
```

### Option 2: 어드민 UI에서 테스트

1. 어드민 로그인
2. 미션 관리 → 미션 승인
3. "영상 생성" 버튼 클릭
4. `temp/` 폴더에서 생성된 MP4 확인

## ⚠️ 문제 해결

### FFmpeg 오류

```
Error: FFmpeg 인코딩 실패
```

**해결**:
1. FFmpeg 설치 확인: `ffmpeg -version`
2. PATH 설정 확인
3. Windows: 재부팅 후 재시도

### Canvas 빌드 오류 (Windows)

```
Error: Cannot find module 'canvas'
```

**해결**:
```bash
# Windows Build Tools 설치
npm install --global windows-build-tools

# Canvas 재설치
npm install canvas --build-from-source
```

### 폰트 렌더링 오류

```
Warning: 폰트 파일 없음, 시스템 폰트 사용
```

**해결**:
- `assets/fonts/Pretendard-Bold.ttf` 파일 존재 확인
- 파일명 대소문자 정확히 일치해야 함

### 메모리 부족 오류

```
Error: JavaScript heap out of memory
```

**해결**:
```bash
# Node.js 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## 📊 성능 팁

### 렌더링 속도 개선

1. **프레임 스킵** (개발 중):
```typescript
// canvas-renderer.ts 수정
const skipFrames = 2  // 2프레임마다 1개만 렌더링
for (let i = 0; i < totalFrames; i += skipFrames) {
  // ...
}
```

2. **해상도 낮추기** (테스트용):
```typescript
const width = 720   // 1080 → 720
const height = 1280  // 1920 → 1280
```

### 서버 리소스 모니터링

```bash
# CPU 사용률 확인
top

# 메모리 확인
free -h
```

## 🎯 다음 단계

1. ✅ 기본 설정 완료
2. ✅ 첫 영상 생성 테스트
3. 🔄 어드민 UI 통합
4. 🔄 SNS 자동 업로드 설정
5. 🔄 스케줄링 설정

---

**문제가 발생하면 로그 확인**:
- 서버 로그: 터미널 출력
- Gemini API: `[Scenario Generator]` 또는 `[Content Generator]` 태그
- Canvas: `[Canvas Render]` 태그
- FFmpeg: `[Canvas Render] FFmpeg` 태그
