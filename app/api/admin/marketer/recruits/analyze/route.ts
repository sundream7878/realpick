import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, url = "", thumb = "" } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: "분석할 텍스트가 필요합니다." }, { status: 400 });
    }

    const result = await runMarketerBridge("analyze-recruit", { 
      text: `"${text}"`,
      url: `"${url}"`,
      thumb: `"${thumb}"`
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
