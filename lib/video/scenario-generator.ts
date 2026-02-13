// lib/video/scenario-generator.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface VideoScenario {
  duration: number
  fps: number
  scenes: VideoScene[]
  bgm?: {
    url: string
    volume: number
  }
  /** TTS 나레이션용 대본 (OpenAI TTS·Remotion 연동 시 사용) */
  ttsScript?: string
  /** Remotion 템플릿용 (훅/질문/VS 옵션) */
  hookMessage?: string
  question?: string
  optionA?: string
  optionB?: string
}

export interface VideoScene {
  startTime: number
  endTime: number
  background: {
    type: 'gradient' | 'solid' | 'blur-thumbnail'
    colors?: string[]
    thumbnailUrl?: string
  }
  elements: VideoElement[]
}

export interface VideoElement {
  type: 'text' | 'image' | 'shape'
  content: string
  position: {
    x: number
    y: number
    width?: number
    height?: number
  }
  style: {
    fontSize?: number
    fontWeight?: string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
    backgroundColor?: string
    borderRadius?: number
    padding?: number
    /** 픽셀 단위 검은 테두리 두께 (릴스 훅 스타일) */
    strokeWidth?: number
  }
  animation?: {
    type: 'fade-in' | 'slide-in' | 'scale' | 'pulse'
    duration: number
    delay?: number
  }
}

// Gemini가 생성할 순수 텍스트 시나리오 형태
interface TextScenario {
  hookMessage: string
  question: string
  optionA: string
  optionB: string
  /** TTS 나레이션용 한 문단 대본 (쇼츠 호흡에 맞게 짧게) */
  ttsScript?: string
}

interface Mission {
  id: string
  title: string
  showId: string
  optionA?: string
  optionB?: string
  options?: Array<string | { text: string }>
  thumbnailUrl?: string
  videoUrl?: string
}

interface Dealer {
  channelName: string
  instagramHandle?: string
}

function getShowDisplayName(showId: string): string {
  const shows: Record<string, string> = {
    nasolo: '나는 솔로',
    baseball: '최강야구',
    transit: '환승연애',
    dolsing: '돌싱글즈'
  }
  return shows[showId] || '리얼픽'
}

function getOptionA(mission: Mission): string {
  if (mission.optionA) return mission.optionA
  const o = mission.options?.[0]
  return (typeof o === 'object' && o?.text) ? o.text : String(o ?? 'A')
}
function getOptionB(mission: Mission): string {
  if (mission.optionB) return mission.optionB
  const o = mission.options?.[1]
  return (typeof o === 'object' && o?.text) ? o.text : String(o ?? 'B')
}

export async function generateVideoScenario(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'result'
  dealer?: Dealer
}): Promise<VideoScenario> {
  const { mission, track, dealer } = params
  const optionA = getOptionA(mission)
  const optionB = getOptionB(mission)
  const hasThumbnail = Boolean(mission.thumbnailUrl)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const trackContext = {
    auto: '일반 사용자들이 흥미를 느낄 수 있는 친근하고 궁금증을 유발하는 톤',
    dealer: `유튜버 ${dealer?.channelName}의 팬들이 좋아할 만한 톤. 딜러를 자연스럽게 언급`,
    result: '실시간 결과 공개의 긴장감과 반전을 강조하는 톤'
  }
  
  const prompt = `
당신은 숏폼 영상의 "텍스트 카피"만 만드는 카피라이터입니다.
화면 배치나 좌표, 레이아웃, JSON 구조 설계는 절대 하지 마세요.
오직 아래 네 개의 필드만 한국어로 채운 JSON을 반환해야 합니다.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowDisplayName(mission.showId)}
- 선택지 A: ${optionA}
- 선택지 B: ${optionB}
${dealer ? `- 딜러: ${dealer.channelName}` : ''}
${hasThumbnail ? `
[참고 정보]
- 이 미션에는 유튜브 썸네일이 있습니다. (URL: ${mission.thumbnailUrl})
- 실제 화면 구성은 개발자가 미리 정의한 템플릿으로 그립니다.
- 당신은 썸네일 위에 얹힐 자막 텍스트만 만듭니다.
` : ''}

[텍스트 스타일 가이드]
- 유튜브/쇼츠에서 잘 먹히는 어그로성 카피
- 말투는 예능 자막/커뮤니티 말투 느낌 (반말 허용)
- 이모지 적당히 사용 (과하지 않게)

[Track별 스타일]
${trackContext[track]}

[JSON 출력 형식]
\`\`\`json
{
  "hookMessage": "지금 난리난 영숙의 한마디",
  "question": "영숙의 발언, 사이다인가 무례인가?",
  "optionA": "완전 사이다 핵팩폭",
  "optionB": "선 좀 많이 넘은 듯",
  "ttsScript": "지금 난리난 영숙의 한마디. 영숙의 발언, 사이다인가 무례인가? 당신의 생각을 투표하세요."
}
\`\`\`

**중요**: 
1. hookMessage, question, optionA, optionB, ttsScript 다섯 개 필드를 반드시 채우세요.
2. ttsScript: 영상에 나올 **나레이션 대본** 한 문단. 훅+질문+CTA를 자연스럽게 이어서 말하듯 작성 (TTS로 읽힐 문장).
3. 레이아웃·좌표·장면 수는 작성하지 마세요.
4. JSON 형식 엄수 (주석 없이, 문자열은 반드시 큰따옴표 사용)
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    console.log('[Scenario Generator] Gemini 응답:', responseText.substring(0, 200))
    
    // JSON 파싱 (```json ``` 제거)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('텍스트 시나리오 JSON 파싱 실패')
    }
    
    const textScenario: TextScenario = JSON.parse(jsonMatch[0])
    
    // 하드코딩된 템플릿으로 실제 VideoScenario 구성
    const scenario = buildTemplateScenario(textScenario, mission)
    if (textScenario.ttsScript) scenario.ttsScript = textScenario.ttsScript

    console.log(`[Scenario Generator] 템플릿 시나리오 생성 완료 (장면 수: ${scenario.scenes.length})`)
    return scenario
  } catch (error) {
    console.error('[Scenario Generator] 실패:', error)
    const fallbackText: TextScenario = {
      hookMessage: '주목!',
      question: mission.title,
      optionA,
      optionB,
      ttsScript: `${mission.title}. 당신의 선택을 투표하세요.`,
    }
    return buildTemplateScenario(fallbackText, mission)
  }
}

// 릴스형 레이아웃 상수 (1080x1920 기준)
const REELS = {
  TOP_BAR_H: 260,
  HOOK_Y: 130,
  QUESTION_BAR_Y: 920,
  QUESTION_BAR_H: 160,
  QUESTION_BAR_W: 1000,
  OPTION_BOX_Y: 1520,
  OPTION_BOX_W: 420,
  OPTION_BOX_H: 280,
  OPTION_LEFT_X: 270,
  OPTION_RIGHT_X: 810,
  VS_X: 540,
} as const

// 템플릿 기반 VideoScenario 생성 (인스타 릴스 스타일: 상단 검은 바 + 형광 훅, 중간 자막바, 하단 A/B)
function buildTemplateScenario(text: TextScenario, mission: Mission): VideoScenario {
  const thumb = mission.thumbnailUrl
  const bg = thumb
    ? { type: 'blur-thumbnail' as const }
    : { type: 'gradient' as const, colors: ['#0a0a0a', '#1a1a1a'] }

  const hookText = text.hookMessage || mission.title
  const question = text.question || mission.title
  const optA = text.optionA || getOptionA(mission)
  const optB = text.optionB || getOptionB(mission)

  const scenes: VideoScene[] = [
    {
      startTime: 0,
      endTime: 10,
      background: bg,
      elements: [
        // 1) 상단 검은 바 (릴스 제목 영역)
        {
          type: 'shape' as const,
          content: '',
          position: { x: 540, y: REELS.TOP_BAR_H / 2, width: 1080, height: REELS.TOP_BAR_H },
          style: { backgroundColor: '#000000', borderRadius: 0 },
          animation: { type: 'fade-in', duration: 0.4 },
        },
        // 2) 훅 메시지 (형광 노랑 + 두꺼운 검은 테두리)
        {
          type: 'text' as const,
          content: hookText,
          position: { x: 540, y: REELS.HOOK_Y },
          style: {
            fontSize: 68,
            fontWeight: '900',
            color: '#E4FF00',
            textAlign: 'center',
            strokeWidth: 10,
          },
          animation: { type: 'slide-in', duration: 0.7 },
        },
        // 3) 중간 자막바 (반투명 회색, 질문 배경)
        {
          type: 'shape' as const,
          content: '',
          position: {
            x: 540,
            y: REELS.QUESTION_BAR_Y,
            width: REELS.QUESTION_BAR_W,
            height: REELS.QUESTION_BAR_H,
          },
          style: {
            backgroundColor: 'rgba(45, 45, 45, 0.85)',
            borderRadius: 28,
          },
          animation: { type: 'fade-in', duration: 0.6, delay: 0.3 },
        },
        // 4) 질문 텍스트 (흰색, 굵게)
        {
          type: 'text' as const,
          content: question,
          position: { x: 540, y: REELS.QUESTION_BAR_Y },
          style: {
            fontSize: 52,
            fontWeight: '900',
            color: '#FFFFFF',
            textAlign: 'center',
            strokeWidth: 6,
          },
          animation: { type: 'fade-in', duration: 0.6, delay: 0.4 },
        },
        // 5) A 박스 (핑크/레드 톤)
        {
          type: 'shape' as const,
          content: '',
          position: {
            x: REELS.OPTION_LEFT_X,
            y: REELS.OPTION_BOX_Y,
            width: REELS.OPTION_BOX_W,
            height: REELS.OPTION_BOX_H,
          },
          style: { backgroundColor: '#E63946', borderRadius: 32 },
          animation: { type: 'scale', duration: 0.5, delay: 0.2 },
        },
        {
          type: 'text' as const,
          content: optA,
          position: { x: REELS.OPTION_LEFT_X, y: REELS.OPTION_BOX_Y },
          style: {
            fontSize: 36,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
            strokeWidth: 4,
          },
          animation: { type: 'pulse', duration: 1.2 },
        },
        // 6) B 박스 (블루 톤)
        {
          type: 'shape' as const,
          content: '',
          position: {
            x: REELS.OPTION_RIGHT_X,
            y: REELS.OPTION_BOX_Y,
            width: REELS.OPTION_BOX_W,
            height: REELS.OPTION_BOX_H,
          },
          style: { backgroundColor: '#1D3557', borderRadius: 32 },
          animation: { type: 'scale', duration: 0.5, delay: 0.2 },
        },
        {
          type: 'text' as const,
          content: optB,
          position: { x: REELS.OPTION_RIGHT_X, y: REELS.OPTION_BOX_Y },
          style: {
            fontSize: 36,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
            strokeWidth: 4,
          },
          animation: { type: 'pulse', duration: 1.2 },
        },
        // 7) 가운데 VS
        {
          type: 'text' as const,
          content: 'VS',
          position: { x: REELS.VS_X, y: REELS.OPTION_BOX_Y },
          style: {
            fontSize: 56,
            fontWeight: '900',
            color: '#FFFFFF',
            textAlign: 'center',
            strokeWidth: 6,
          },
          animation: { type: 'scale', duration: 0.6 },
        },
      ],
    },
  ]

  const scenario: VideoScenario = {
    duration: 10,
    fps: 30,
    scenes,
    hookMessage: hookText,
    question,
    optionA: optA,
    optionB: optB,
  }
  if (text.ttsScript) scenario.ttsScript = text.ttsScript
  return scenario
}
