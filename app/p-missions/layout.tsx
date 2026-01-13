import { Metadata, ResolvingMetadata } from 'next'
import { getShowById } from "@/lib/constants/shows"

interface Props {
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
  { searchParams }: { searchParams: { show?: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const showId = searchParams.show
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
