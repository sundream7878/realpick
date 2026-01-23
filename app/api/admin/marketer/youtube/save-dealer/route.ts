import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelName, channelId, keywords } = body;

    const result = await runMarketerBridge("save-dealer", { 
      "channel-name": `"${channelName}"`,
      "channel-id": channelId,
      keywords: `"${keywords}"`
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
