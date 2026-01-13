import { ImageResponse } from 'next/og'
import { getMissionById } from "@/lib/firebase/missions"
import { getShowById } from "@/lib/constants/shows"

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const isResult = searchParams.get('type') === 'results'
    const id = params.id
    const result = await getMissionById(id)
    
    if (!result.success || !result.mission) {
      return new Response('Mission not found', { status: 404 })
    }

    const mission = result.mission
    const showInfo = mission.showId ? getShowById(mission.showId) : null
    const participants = mission.participants || 0
    
    // 투표율 계산 (옵션이 있는 경우)
    let topOptionPercent = 0
    if (mission.optionVoteCounts && participants > 0) {
      const counts = Object.values(mission.optionVoteCounts) as number[]
      if (counts.length > 0) {
        const max = Math.max(...counts)
        topOptionPercent = Math.round((max / participants) * 100)
      }
    }
    
    // 메인 컬러 설정 (RealPick 브랜드 컬러)
    const primaryColor = isResult ? '#3E757B' : '#2C2745'
    const secondaryColor = isResult ? '#2C2745' : '#3E757B'
    const accentColor = '#F472B6' // 로즈 핑크

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* 상단 프로그램 태그 */}
          <div style={{ display: 'flex', position: 'absolute', top: '40px', left: '40px', gap: '12px' }}>
            {showInfo && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px 20px',
                  borderRadius: '50px',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  display: 'flex',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                {showInfo.displayName}
              </div>
            )}
            {isResult && (
              <div
                style={{
                  backgroundColor: accentColor,
                  padding: '8px 20px',
                  borderRadius: '50px',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  display: 'flex',
                }}
              >
                결과 발표
              </div>
            )}
            {topOptionPercent > 0 && !isResult && (
              <div
                style={{
                  backgroundColor: '#F59E0B',
                  padding: '8px 20px',
                  borderRadius: '50px',
                  color: '#fff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  display: 'flex',
                }}
              >
                압도적 {topOptionPercent}% 일치 중!
              </div>
            )}
          </div>

          {/* 중앙 미션 카드 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '30px',
              padding: '60px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: '800',
                color: '#111827',
                textAlign: 'center',
                marginBottom: '30px',
                lineHeight: 1.2,
                wordBreak: 'keep-all',
              }}
            >
              {isResult ? `[결과] ${mission.title}` : mission.title}
            </div>
            
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F3F4F6',
                padding: '12px 30px',
                borderRadius: '100px',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: '#4B5563',
                  fontWeight: '600',
                }}
              >
                {isResult ? (
                  <>총 <span style={{ color: accentColor, margin: '0 8px' }}>{participants.toLocaleString()}명</span> 투표 완료!</>
                ) : (
                  <>현재 <span style={{ color: '#3E757B', margin: '0 8px' }}>{participants.toLocaleString()}명</span> 참여 중</>
                )}
              </div>
            </div>
          </div>

          {/* 하단 리얼픽 로고 */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: 'white',
                letterSpacing: '-1px',
              }}
            >
              REAL PICK
            </div>
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: accentColor,
                borderRadius: '50%',
                marginLeft: '8px',
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 })
  }
}
