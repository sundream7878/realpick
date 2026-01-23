import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, link = "" } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: "제목과 내용이 필요합니다." }, { status: 400 });
    }

    const result = await runMarketerBridge("global-notif", { 
      title: `"${title}"`,
      content: `"${content}"`,
      link: `"${link}"`
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
