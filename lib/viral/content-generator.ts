// lib/viral/content-generator.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface SnsContent {
  caption: string
  hashtags: string
  cta: string
}

interface Mission {
  id: string
  title: string
  showId: string
  optionA: string
  optionB: string
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

export async function generateMultiPlatformContent(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'main' | 'result'
  dealer?: Dealer
  platforms: ('instagram' | 'youtube' | 'tiktok')[]
}): Promise<Record<string, SnsContent>> {
  const { mission, track, dealer, platforms } = params
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const trackContext = {
    auto: '일반 사용자들이 흥미를 느낄 수 있는 친근하고 궁금증을 유발하는 톤',
    dealer: `유튜버 ${dealer?.channelName}의 팬들이 좋아할 만한 톤. 딜러를 자연스럽게 언급`,
    main: '메인 이벤트임을 강조하는 화려하고 임팩트 있는 톤',
    result: '실시간 결과 공개의 긴장감과 반전을 강조하는 톤'
  }
  
  const prompt = `
당신은 SNS 바이럴 마케팅 전문가입니다.
다음 미션에 대해 **${platforms.join(', ')} 플랫폼용** 게시글을 한 번에 작성하세요.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowDisplayName(mission.showId)}
- 선택지 A: ${mission.optionA}
- 선택지 B: ${mission.optionB}
${dealer ? `- 딜러: ${dealer.channelName} (@${dealer.instagramHandle})` : ''}

[작성 가이드]
1. **톤앤매너**: ${trackContext[track]}
2. **핵심 목표**: 댓글/투표 유도, 앱 유입

[플랫폼별 요구사항]
${platforms.includes('instagram') ? '- Instagram: 이모지 적극 활용, 2200자 이내, 줄바꿈으로 가독성' : ''}
${platforms.includes('youtube') ? '- YouTube: #Shorts 필수, 5000자 이내, 링크 포함 가능' : ''}
${platforms.includes('tiktok') ? '- TikTok: 짧고 임팩트, 100자 권장, 이모지+해시태그 혼용' : ''}

[콘텐츠 구조]
1. 훅(Hook): 첫 줄에서 시선을 사로잡는 질문이나 충격적인 문구
2. 본문: 미션 내용을 재미있게 풀어쓰기 (2-3줄)
3. 선택지 강조: A vs B를 명확히 제시
4. CTA: 투표 참여 유도 ("당신의 선택은?", "댓글로 A/B 남겨주세요" 등)
5. 해시태그: 필수(#리얼픽 #프로그램명) + 하이재킹(경쟁채널명) + 트렌드 키워드 (총 10-15개)

[하이재킹 전략]
- 필수 해시태그: #리얼픽 #${getShowDisplayName(mission.showId)}
- 경쟁 채널 (해시태그만, @태그 금지): #촌장엔터테인먼트 #나는솔로갤러리 등
- 트렌드: #숏폼 #릴스추천 #알고리즘

[필수 제약사항]
- 절대 경쟁 유튜버를 @태그(멘션)하지 마세요 (신고 위험)
- 해시태그에만 경쟁 채널명 사용
- 자연스럽고 친근한 톤 유지

[출력 형식]
JSON 형식으로 플랫폼별로 생성하세요:
\`\`\`json
{
  ${platforms.includes('instagram') ? `"instagram": {
    "caption": "게시글 본문 (이모지 포함, 줄바꿈은 실제 줄바꿈 사용)",
    "hashtags": "#태그1 #태그2 ...",
    "cta": "CTA 문구"
  }${platforms.length > 1 ? ',' : ''}` : ''}
  ${platforms.includes('youtube') ? `"youtube": {
    "caption": "게시글 본문 (#Shorts 포함)",
    "hashtags": "#Shorts #태그2 ...",
    "cta": "CTA 문구"
  }${platforms.indexOf('youtube') < platforms.length - 1 ? ',' : ''}` : ''}
  ${platforms.includes('tiktok') ? `"tiktok": {
    "caption": "짧고 임팩트 있는 본문",
    "hashtags": "#태그1 #태그2 ...",
    "cta": "CTA 문구"
  }` : ''}
}
\`\`\`
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    
    console.log('[Content Generator] Gemini 응답 받음:', responseText.substring(0, 100))
    
    // JSON 파싱 (```json ``` 제거)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[Content Generator] JSON 파싱 실패, Fallback 사용')
      return generateFallbackContent(mission, track, dealer, platforms)
    }
    
    const allContent = JSON.parse(jsonMatch[0])
    
    // 필요한 플랫폼만 반환
    const filtered: Record<string, SnsContent> = {}
    for (const platform of platforms) {
      if (allContent[platform]) {
        filtered[platform] = allContent[platform]
      }
    }
    
    console.log(`[Content Generator] 생성 완료: ${Object.keys(filtered).length}개 플랫폼`)
    
    return filtered
  } catch (error) {
    console.error('[Content Generator] 실패:', error)
    return generateFallbackContent(mission, track, dealer, platforms)
  }
}

// Gemini 실패 시 Fallback 콘텐츠
function generateFallbackContent(
  mission: Mission,
  track: string,
  dealer: Dealer | undefined,
  platforms: string[]
): Record<string, SnsContent> {
  console.warn('[Content Generator] Fallback 콘텐츠 생성')
  
  const result: Record<string, SnsContent> = {}
  
  const baseCaption = `🔥 ${getShowDisplayName(mission.showId)} 투표\n\n${mission.title}\n\nA: ${mission.optionA}\nB: ${mission.optionB}\n\n당신의 선택은? 댓글로 A or B!`
  const baseHashtags = `#리얼픽 #${getShowDisplayName(mission.showId)} #숏폼 #릴스`
  const baseCta = '💡 리얼픽 앱에서 지금 투표하기'
  
  if (platforms.includes('instagram')) {
    result.instagram = {
      caption: baseCaption,
      hashtags: baseHashtags,
      cta: baseCta
    }
  }
  
  if (platforms.includes('youtube')) {
    result.youtube = {
      caption: baseCaption,
      hashtags: `#Shorts ${baseHashtags}`,
      cta: baseCta
    }
  }
  
  if (platforms.includes('tiktok')) {
    result.tiktok = {
      caption: `🔥 ${mission.title}\nA or B? 댓글로!`,
      hashtags: baseHashtags,
      cta: baseCta
    }
  }
  
  return result
}
