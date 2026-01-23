import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 데이터를 JSON 문자열로 변환하여 전달
    const result = await runMarketerBridge("save-recruit", { 
      data: `'${JSON.stringify(body)}'`
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
