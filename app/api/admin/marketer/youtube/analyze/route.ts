import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, desc } = body;

    if (!videoId || !title) {
      return NextResponse.json({ success: false, error: "videoId와 title이 필요합니다." }, { status: 400 });
    }

    const result = await runMarketerBridge("analyze-video", { 
      "video-id": videoId,
      title: `"${title}"`, // 공백 포함을 위해 따옴표 처리
      desc: `"${desc || ''}"`
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
