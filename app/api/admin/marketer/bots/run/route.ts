import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count, delay = 0.5, categoryVotes } = body;

    // categoryVotes가 있으면 카테고리별 투표, 없으면 기존 방식
    const params = categoryVotes 
      ? { categoryVotes, delay } 
      : { count: count || 10, delay };

    const result = await runMarketerBridge("bot-vote", params);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
