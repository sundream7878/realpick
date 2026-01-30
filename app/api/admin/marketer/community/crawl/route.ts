import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords } = body;

    const result = await runMarketerBridge("crawl-community", { 
      keywords: keywords || "나는솔로,최강야구,나솔사계,돌싱글즈"
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("커뮤니티 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
