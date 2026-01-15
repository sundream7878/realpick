import { Metadata, ResolvingMetadata } from 'next'
import { getShowById } from "@/lib/constants/shows"

interface Props {
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
  { searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const showId = typeof searchParams?.show === 'string' ? searchParams.show : null
  
  // DB에 저장된 프로그램 정보를 우선적으로 고려하기 위해 캐시된 데이터나 별도 로직 필요
  // 여기서는 기존 getShowById를 사용하되, 나중에 DB에서 가져오는 로직으로 확장 가능
  const showInfo = showId ? getShowById(showId) : null
  
  const title = showInfo ? `${showInfo.displayName} 미션 목록` : "미션 목록 | 리얼픽"
  const description = showInfo 
    ? `${showInfo.displayName}의 최신 투표와 예측 미션에 참여해보세요. 실시간 시청자 반응을 확인할 수 있습니다.`
    : "리얼픽의 다양한 예능 프로그램 투표와 예측 미션에 참여해보세요."

  return {
    title: title,
    description: description,
    openGraph: {
      title: `${title} | 리얼픽`,
      description: description,
      type: 'website',
    },
  }
}

export default function MissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        "name": "미션 목록",
        "item": "https://realpick.me/p-missions"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  )
}
