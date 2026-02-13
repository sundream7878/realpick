# 리얼픽 쇼츠(TTS + Remotion) 테스트 가이드

아래 순서대로 하면 TTS와 Remotion 쇼츠를 차례로 확인할 수 있습니다.

---

## 사전 확인

- [ ] `.env.local`에 `OPENAI_API_KEY` 설정됨
- [ ] `npm install` 완료 (remotion, openai 등)
- [ ] BGM 파일 위치: `public/assets/realpick_theme_suno.mp3` (이미 있으면 OK)

---

## 1단계: TTS만 테스트 (OpenAI)

터미널에서 한 번만 실행해 보세요.

```bash
cd f:\realpick
npx tsx scripts/test-tts.ts
```

- **동작**: 샘플 문장으로 TTS MP3 생성 → `public/audio/test-tts.mp3` 저장
- **확인**: `public/audio/test-tts.mp3` 파일을 재생해서 “쇼츠용 1.2배속” 나레이션이 나오는지 확인

> `scripts/test-tts.ts`가 없으면 아래 “2. TTS 테스트 스크립트”를 추가한 뒤 다시 실행하세요.

---

## 2단계: Remotion 스튜디오로 화면/오디오 확인

```bash
cd f:\realpick
npm run remotion:studio
```

- 브라우저가 열리면 왼쪽에서 **"Shorts"** 컴포지션 선택
- 재생 버튼으로 영상 재생
- **확인할 것**
  - 상단 훅 문구, 중앙 질문, 하단 A/B 박스가 보이는지
  - BGM(`realpick_theme_suno.mp3`)이 나오는지
  - 배경은 placeholder 이미지로 나옴 (실제 장면은 API/스크립트에서 넣을 때 사용)

---

## 3단계: Remotion으로 MP4 한 번 렌더

스튜디오에서 괜찮으면, 같은 설정으로 MP4를 뽑아봅니다.

```bash
cd f:\realpick
npm run remotion:render
```

- **결과**: `out/shorts.mp4` (또는 `remotion.config.ts`에 설정한 출력 경로)
- **확인**: MP4 재생해서 화면 + BGM이 맞는지 확인

---

## 4단계: (선택) 실제 시나리오로 한 번 돌려보기

미션 시나리오 + TTS까지 묶어서 테스트하려면:

1. **SNS 바이럴 영상 생성** (기존처럼 대시보드에서 미션 선택 후 “영상 생성”)
   - 이때는 아직 **Canvas** 렌더만 사용됨
   - 생성된 결과의 **시나리오 JSON**에 `ttsScript`가 들어 있는지 확인

2. **TTS + Remotion을 API에서 쓰는 분기**는 아직 안 넣었으면,  
   `docs/SHORTS_TTS_REMOTION_SETUP.md` 7번처럼 `scenario.ttsScript` 있을 때  
   TTS 생성 → 장면 추출 → `renderRemotionShorts()` 호출하는 부분을 추가한 뒤,  
   같은 “영상 생성” 버튼으로 다시 한 번 생성해 보면 됩니다.

---

## 한 줄 요약

1. **TTS**: `npx tsx scripts/test-tts.ts` → `public/audio/test-tts.mp3` 재생  
2. **Remotion 화면+BGM**: `npm run remotion:studio` → Shorts 재생  
3. **MP4 뽑기**: `npm run remotion:render` → `out/shorts.mp4` 확인  

문제 나오면 터미널/브라우저 에러 메시지와 함께 알려주시면 됩니다.
