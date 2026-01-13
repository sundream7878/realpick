import { Metadata } from 'next'
import { RECRUITS } from "@/lib/constants/recruits"
import { getShowById } from "@/lib/constants/shows"

export const metadata: Metadata = {
  title: "리얼 캐스팅 | 예능 출연진 모집 & 방청 신청 정보",
  description: "나는 솔로, 돌싱글즈, 흑백요리사 등 인기 예능 프로그램의 출연자 모집 정보와 방청 신청 링크를 한곳에서 확인하세요. 당신의 데뷔를 응원합니다!",
  keywords: ["예능 출연 신청", "오디션 정보", "방청 신청", "나는솔로 지원", "흑백요리사 지원", "방송 출연 모집"],
  openGraph: {
    title: "리얼 캐스팅 | 당신의 데뷔를 응원합니다",
    description: "인기 예능 프로그램 출연 및 방청 정보를 가장 빠르게 확인하세요.",
    type: 'website',
  },
}

export default function CastingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 구조화된 데이터 생성 (Event & ItemList)
  const castingListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": RECRUITS.map((recruit, index) => {
      const show = getShowById(recruit.programId)
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Event",
          "name": recruit.title,
          "description": recruit.description,
          "startDate": recruit.startDate,
          "endDate": recruit.endDate,
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "eventStatus": "https://schema.org/EventScheduled",
          "location": {
            "@type": "Place",
            "name": show?.displayName || "방송국",
            "address": "대한민국"
          },
          "organizer": {
            "@type": "Organization",
            "name": show?.displayName || "리얼픽",
            "url": recruit.officialUrl || "https://realpick.me"
          }
        }
      }
    })
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "홈",
        "item": "https://realpick.me"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "리얼 캐스팅",
        "item": "https://realpick.me/p-casting"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(castingListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  )
}
