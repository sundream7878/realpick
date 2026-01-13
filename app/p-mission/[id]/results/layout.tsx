import { Metadata, ResolvingMetadata } from 'next'
import { getMissionById } from "@/lib/firebase/missions"
import { getShowById } from "@/lib/constants/shows"

interface Props {
  params: { id: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id
  const result = await getMissionById(id)
  
  if (!result.success || !result.mission) {
    return {
      title: '결과를 찾을 수 없습니다',
    }
  }

  const mission = result.mission
  const showInfo = mission.showId ? getShowById(mission.showId) : null
  const showPrefix = showInfo ? `[${showInfo.displayName}] ` : ""
  
  const title = `[결과] ${showPrefix}${mission.title}`
  const description = `${mission.participants || 0}명이 참여한 ${showInfo?.displayName || "예능"} 투표 결과! 실시간 통계를 확인해보세요.`
  const imageUrl = `https://realpick.me/api/og/mission/${id}?type=results`

  return {
    title: title,
    description: description,
    openGraph: {
      title: `${title} | 리얼픽`,
      description: description,
      images: [imageUrl],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  }
}

export default async function ResultLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const result = await getMissionById(params.id)
  const mission = result.mission
  const showInfo = mission?.showId ? getShowById(mission.showId) : null

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
      },
      ...(showInfo ? [{
        "@type": "ListItem",
        "position": 3,
        "name": showInfo.displayName,
        "item": `https://realpick.me/?show=${showInfo.id}`
      }] : []),
      {
        "@type": "ListItem",
        "position": showInfo ? 4 : 3,
        "name": `[결과] ${mission?.title || "투표 결과"}`,
        "item": `https://realpick.me/p-mission/${params.id}/results`
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
