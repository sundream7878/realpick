import { NextRequest, NextResponse } from "next/server"

/**
 * AI 해시태그 자동 생성 API
 * POST /api/admin/marketer/instagram/generate-hashtags
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { missionId, title, showId, channelName } = body

    if (!title) {
      return NextResponse.json(
        { success: false, error: "미션 제목이 필요합니다." },
        { status: 400 }
      )
    }

    // Gemini API를 사용하여 해시태그 생성
    const { GoogleGenerativeAI } = await import("@google/generative-ai")
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
당신은 인스타그램 마케팅 전문가입니다.
다음 정보를 바탕으로 인스타그램 릴스/쇼츠 업로드에 최적화된 해시태그를 생성해주세요.

**미션 정보:**
- 제목: ${title}
- 프로그램: ${showId || "알 수 없음"}
- 채널명: ${channelName || "알 수 없음"}

**해시태그 생성 규칙:**
1. 방송명, 출연자명을 필수로 포함
2. 검색 유입을 위한 연관 키워드 3-5개 추가
3. 경쟁 채널명이나 유사 프로그램명을 해시태그로 추가 (태그(@)가 아닌 해시태그(#))
4. 총 10-15개의 해시태그 생성
5. 각 해시태그는 '#'으로 시작
6. 공백 없이 연결 (예: #나는솔로 O, #나는 솔로 X)

**출력 형식:**
해시태그만 한 줄로 공백으로 구분하여 출력
예: #리얼픽 #나는솔로 #나솔22기 #영숙 #데이트 #연애 #매칭 #커플 #솔로 #솔로지옥

해시태그를 생성해주세요:
`

    const result = await model.generateContent(prompt)
    const hashtags = result.response.text().trim()

    return NextResponse.json({
      success: true,
      hashtags,
      missionId
    })
  } catch (error: any) {
    console.error("[Instagram Hashtags API] 오류:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "해시태그 생성 중 오류가 발생했습니다." 
      },
      { status: 500 }
    )
  }
}
