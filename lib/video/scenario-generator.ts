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
  }
  animation?: {
    type: 'fade-in' | 'slide-in' | 'scale' | 'pulse'
    duration: number
    delay?: number
  }
}

interface Mission {
  id: string
  title: string
  showId: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
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

export async function generateVideoScenario(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'result'
  dealer?: Dealer
}): Promise<VideoScenario> {
  const { mission, track, dealer } = params
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const trackContext = {
    auto: '일반 사용자들이 흥미를 느낄 수 있는 친근하고 궁금증을 유발하는 톤',
    dealer: `유튜버 ${dealer?.channelName}의 팬들이 좋아할 만한 톤. 딜러를 자연스럽게 언급`,
    result: '실시간 결과 공개의 긴장감과 반전을 강조하는 톤'
  }
  
  const prompt = `
당신은 숏폼 영상 제작 전문가입니다.
다음 미션에 대해 9:16 세로형 숏폼 영상의 시나리오를 JSON 형식으로 작성하세요.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowDisplayName(mission.showId)}
- 선택지 A: ${mission.optionA}
- 선택지 B: ${mission.optionB}
${dealer ? `- 딜러: ${dealer.channelName}` : ''}

[영상 요구사항]
- 길이: 10초
- 해상도: 1080 x 1920 (9:16)
- FPS: 30
- 목표: 시청자의 시선을 사로잡고 투표 유도

[Track별 스타일]
${trackContext[track]}

[시나리오 구성 가이드]
1. **장면 1 (0~1초)**: 훅(Hook) - 시선을 사로잡는 텍스트
   - 예: "🔥 충격적인 결과 예상"
   - 배경: 그라디언트 (보라→핑크)
   - 애니메이션: 페이드인

2. **장면 2 (1~2초)**: 프로그램 소개
   - 프로그램명 배치
   - 애니메이션: 슬라이드인

3. **장면 3 (2~3초)**: 질문 제시
   - 미션 제목을 재해석한 자막
   - 예: "${mission.title}" → "누가 더 인기 많을까요?"
   - 폰트: 큰 굵은 글씨

4. **장면 4 (3~7초)**: A vs B 선택지 강조
   - 화면 분할: 왼쪽 A, 오른쪽 B
   - 각 선택지를 풍부한 설명으로 확장
   - 애니메이션: 점멸 효과

5. **장면 5 (7~10초)**: CTA
   - "당신의 선택은?"
   - "리얼픽 앱에서 지금 투표하기"
   - 이모지 활용

[JSON 출력 형식]
\`\`\`json
{
  "duration": 10,
  "fps": 30,
  "scenes": [
    {
      "startTime": 0,
      "endTime": 1,
      "background": {
        "type": "gradient",
        "colors": ["#667eea", "#764ba2"]
      },
      "elements": [
        {
          "type": "text",
          "content": "🔥 충격적인 결과 예상",
          "position": { "x": 540, "y": 960 },
          "style": {
            "fontSize": 70,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          },
          "animation": {
            "type": "fade-in",
            "duration": 0.5
          }
        }
      ]
    }
  ]
}
\`\`\`

**중요**: 
1. 모든 텍스트는 이모지를 적극 활용하세요
2. 자막은 짧고 임팩트 있게 (한 줄에 최대 15자)
3. 색상은 대비가 강한 조합 사용
4. 애니메이션은 부드럽게 (fade, slide 위주)
5. JSON 형식 엄수 (주석 없이)
6. position의 x, y는 화면 중심을 기준으로 (x: 540 = 가로 중앙, y: 960 = 세로 중앙)
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    console.log('[Scenario Generator] Gemini 응답:', responseText.substring(0, 200))
    
    // JSON 파싱 (```json ``` 제거)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('시나리오 JSON 파싱 실패')
    }
    
    const scenario: VideoScenario = JSON.parse(jsonMatch[0])
    
    // 기본값 설정
    if (!scenario.duration) scenario.duration = 10
    if (!scenario.fps) scenario.fps = 30
    if (!scenario.scenes || scenario.scenes.length === 0) {
      throw new Error('장면이 없습니다')
    }
    
    console.log(`[Scenario Generator] 생성 완료: ${scenario.scenes.length}개 장면`)
    
    return scenario
  } catch (error) {
    console.error('[Scenario Generator] 실패:', error)
    
    // Fallback: 기본 시나리오 생성
    return generateFallbackScenario(mission, track, dealer)
  }
}

// Gemini 실패 시 사용할 기본 시나리오
function generateFallbackScenario(
  mission: Mission,
  track: string,
  dealer?: Dealer
): VideoScenario {
  console.warn('[Scenario Generator] Fallback 시나리오 사용')
  
  return {
    duration: 10,
    fps: 30,
    scenes: [
      {
        startTime: 0,
        endTime: 1,
        background: {
          type: 'gradient',
          colors: ['#667eea', '#764ba2']
        },
        elements: [
          {
            type: 'text',
            content: '🔥 주목!',
            position: { x: 540, y: 960 },
            style: {
              fontSize: 80,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            },
            animation: {
              type: 'fade-in',
              duration: 0.5
            }
          }
        ]
      },
      {
        startTime: 1,
        endTime: 3,
        background: {
          type: 'gradient',
          colors: ['#667eea', '#764ba2']
        },
        elements: [
          {
            type: 'text',
            content: getShowDisplayName(mission.showId),
            position: { x: 540, y: 400 },
            style: {
              fontSize: 50,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            content: mission.title,
            position: { x: 540, y: 960 },
            style: {
              fontSize: 60,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            },
            animation: {
              type: 'slide-in',
              duration: 0.5
            }
          }
        ]
      },
      {
        startTime: 3,
        endTime: 7,
        background: {
          type: 'gradient',
          colors: ['#667eea', '#764ba2']
        },
        elements: [
          {
            type: 'shape',
            content: '',
            position: { x: 270, y: 950, width: 400, height: 500 },
            style: {
              backgroundColor: '#FF6B6B',
              borderRadius: 30
            }
          },
          {
            type: 'text',
            content: 'A',
            position: { x: 270, y: 850 },
            style: {
              fontSize: 100,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            content: mission.optionA,
            position: { x: 270, y: 1000 },
            style: {
              fontSize: 45,
              color: 'white',
              textAlign: 'center'
            },
            animation: {
              type: 'pulse',
              duration: 1
            }
          },
          {
            type: 'shape',
            content: '',
            position: { x: 810, y: 950, width: 400, height: 500 },
            style: {
              backgroundColor: '#4ECDC4',
              borderRadius: 30
            }
          },
          {
            type: 'text',
            content: 'B',
            position: { x: 810, y: 850 },
            style: {
              fontSize: 100,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            content: mission.optionB,
            position: { x: 810, y: 1000 },
            style: {
              fontSize: 45,
              color: 'white',
              textAlign: 'center'
            },
            animation: {
              type: 'pulse',
              duration: 1
            }
          }
        ]
      },
      {
        startTime: 7,
        endTime: 10,
        background: {
          type: 'gradient',
          colors: ['#667eea', '#764ba2']
        },
        elements: [
          {
            type: 'text',
            content: '당신의 선택은? 🤔',
            position: { x: 540, y: 800 },
            style: {
              fontSize: 65,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            content: '💡 리얼픽 앱에서\n지금 투표하기',
            position: { x: 540, y: 1100 },
            style: {
              fontSize: 50,
              fontWeight: '600',
              color: '#FFE66D',
              textAlign: 'center'
            },
            animation: {
              type: 'fade-in',
              duration: 0.5
            }
          }
        ]
      }
    ]
  }
}
