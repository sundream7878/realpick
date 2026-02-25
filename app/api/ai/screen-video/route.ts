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
    다음 YouTube 영상 정보를 보고, "시청자들이 이 영상의 내용을 바탕으로 투표(A vs B, 찬성 vs 반대 등)를 하고 싶어할지" 판단해주세요.

    [선정 기준]
    - 투표 가치 있음 (true): 
        * 인물 간의 갈등, 삼각관계, 선택의 순간이 담긴 경우
        * 특정 행동에 대해 "잘했다 vs 못했다" 의견이 갈릴 수 있는 경우
        * "이 상황에서 당신이라면?" 같은 질문이 가능한 경우
        * 예능 프로그램의 주요 장면(결과 발표, 고백, 대결 등)
    - 가치 없음 (false):
        * 단순 광고, 공식 예고편(너무 짧음), 뉴스 보도, 관련 없는 일상 브이로그
        * 투표할 만한 '내용'이 전혀 없는 단순 자막 나열

    제목: ${title}
    설명(일부): ${(description || "").slice(0, 500)}

    반드시 아래 JSON 형식으로만 응답하세요.
    {"voteWorthy": true 또는 false, "reason": "선정 또는 제외 이유 (한 줄)"}`;

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
