import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, maxResults = 5, startDate, endDate } = body;

    if (!keywords) {
      return NextResponse.json({ success: false, error: "키워드가 필요합니다." }, { status: 400 });
    }

    const args: Record<string, any> = {
      keywords,
      "max-results": maxResults,
    };

    if (startDate) args["start-date"] = startDate;
    if (endDate) args["end-date"] = endDate;

    const result = await runMarketerBridge("crawl-youtube", args);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
