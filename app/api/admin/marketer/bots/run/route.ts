import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 10, delay = 0.5 } = body;

    const result = await runMarketerBridge("bot-vote", { count, delay });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
