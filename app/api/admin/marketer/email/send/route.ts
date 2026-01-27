import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientEmail, recipientName, subject, body: emailBody } = body;

    if (!recipientEmail || !emailBody) {
      return NextResponse.json({ 
        success: false, 
        error: "수신자 이메일과 본문이 필요합니다." 
      }, { status: 400 });
    }

    const result = await runMarketerBridge("send-email", {
      "recipient-email": recipientEmail,
      "recipient-name": recipientName || "채널 운영자",
      subject: subject || "🎯 리얼픽 파트너십 제안",
      body: emailBody
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("이메일 발송 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
