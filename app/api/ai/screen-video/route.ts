import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 영상이 "2명 중 1명이라도 투표할 만한 가치가 있는지" Gemini로 판단.
 * 매일 6시 자동 미션 생성 시 선정 단계에서 사용.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description = "" } = body as { title: string; description?: string };

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title 필요" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY 없음" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `당신은 예능/리얼리티 투표 앱의 콘텐츠 선정자입니다.
다음 YouTube 영상 정보를 보고, "2명 중 1명이라도 투표하고 싶을 만한 가치가 있는 영상인지" 판단해주세요.
- 투표 가치 있음: 논란·결정·선택·대립·감정이 있는 클립, 시청자가 의견을 나누고 싶은 주제
- 가치 없음: 단순 하이라이트, 광고, 뉴스 요약, 흥미 없는 일상 등

제목: ${title}
설명(일부): ${(description || "").slice(0, 500)}

반드시 아래 JSON만 한 줄로 출력하세요. 다른 글 없이 JSON만.
{"voteWorthy": true 또는 false, "reason": "한 줄 이유"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[screen-video] JSON 파싱 실패:", text);
      return NextResponse.json({ voteWorthy: false, reason: "파싱 실패" });
    }
    const parsed = JSON.parse(jsonMatch[0]) as { voteWorthy?: boolean; reason?: string };
    const voteWorthy = Boolean(parsed.voteWorthy);

    return NextResponse.json({
      voteWorthy,
      reason: parsed.reason || "",
    });
  } catch (error: any) {
    console.error("[screen-video] 오류:", error);
    return NextResponse.json(
      { error: error.message, voteWorthy: false },
      { status: 500 }
    );
  }
}
