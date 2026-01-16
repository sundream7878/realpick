import { adminDb } from "@/lib/firebase/admin"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        console.log('[Public Shows API] 요청 시작');
        
        // adminDb가 제대로 초기화되었는지 확인
        if (!adminDb) {
            console.error('[Public Shows API] adminDb가 초기화되지 않았습니다');
            throw new Error('Firebase Admin DB가 초기화되지 않았습니다');
        }
        
        console.log('[Public Shows API] adminDb 초기화 확인 완료');
        const settingsRef = adminDb.collection("admin_settings")
        
        console.log('[Public Shows API] 문서 조회 중...');
        const [statusDoc, visibilityDoc, customShowsDoc] = await Promise.all([
            settingsRef.doc("SHOW_STATUSES").get(),
            settingsRef.doc("SHOW_VISIBILITY").get(),
            settingsRef.doc("CUSTOM_SHOWS").get()
        ])
        
        console.log('[Public Shows API] 문서 조회 완료:', {
            statusExists: statusDoc.exists,
            visibilityExists: visibilityDoc.exists,
            customShowsExists: customShowsDoc.exists
        })

        let statuses = statusDoc.exists ? statusDoc.data()?.value : {}
        let visibility = visibilityDoc.exists ? visibilityDoc.data()?.value : {}
        let customShows = customShowsDoc.exists ? customShowsDoc.data()?.value : []

        // 만약 value가 문자열(JSON)로 저장되어 있다면 파싱
        try {
            if (typeof statuses === 'string' && (statuses.startsWith('{') || statuses.startsWith('['))) statuses = JSON.parse(statuses)
            if (typeof visibility === 'string' && (visibility.startsWith('{') || visibility.startsWith('['))) visibility = JSON.parse(visibility)
            if (typeof customShows === 'string' && (customShows.startsWith('{') || customShows.startsWith('['))) customShows = JSON.parse(customShows)
        } catch (e) {
            console.error("JSON parse error in shows API:", e)
        }

        // 최종적으로 타입 보장
        if (!Array.isArray(customShows)) customShows = []
        if (typeof statuses !== 'object' || statuses === null) statuses = {}
        if (typeof visibility !== 'object' || visibility === null) visibility = {}

        return NextResponse.json({ 
            statuses: statuses || {}, 
            visibility: visibility || {}, 
            customShows: customShows || [] 
        })
    } catch (error: any) {
        console.error("❌ Error in public shows API:", error)
        // 상세 에러 메시지를 포함하여 반환 (개발 단계에서 디버깅 용도)
        return NextResponse.json({ 
            error: error.message,
            stack: error.stack,
            statuses: {}, 
            visibility: {}, 
            customShows: [] 
        }, { status: 500 })
    }
}
