import { Metadata, ResolvingMetadata } from 'next'
import { getMissionById } from "@/lib/firebase/missions"
import { getShowById } from "@/lib/constants/shows"
import { generateSlug } from "@/lib/utils/u-seo/slug.util"

interface Props {
  params: { id: string, slug?: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id
  const result = await getMissionById(id)
  
  if (!result.success || !result.mission) {
    return {
      title: '미션을 찾을 수 없습니다',
    }
  }

  const mission = result.mission
  const showInfo = mission.showId ? getShowById(mission.showId) : null
  const showPrefix = showInfo ? `[${showInfo.displayName}] ` : ""
  
  const title = `${showPrefix}${mission.title}`
  const description = mission.description || `${mission.participants || 0}명이 참여 중인 ${showInfo?.displayName || "예능"} 투표! 지금 바로 참여해보세요.`
  const imageUrl = `https://realpick.me/api/og/mission/${id}`
  const slug = generateSlug(mission.title || "")

  return {
    title: title,
    description: description,
    alternates: {
      canonical: `https://realpick.me/p-mission/${id}/${slug}/vote`,
    },
    openGraph: {
      title: `${title} | 리얼픽`,
      description: description,
      images: [imageUrl],
      type: 'article',
      url: `https://realpick.me/p-mission/${id}/${slug}/vote`,
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  }
}

export default async function MissionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const result = await getMissionById(params.id)
  const mission = result.mission
  const showInfo = mission?.showId ? getShowById(mission.showId) : null

  // 구조화된 데이터 생성
  const jsonLd = mission ? {
    "@context": "https://schema.org",
    "@type": "Question",
    "name": mission.title,
    "text": mission.description || `${mission.title} 투표에 참여하세요.`,
    "answerCount": mission.participants || 0,
    "datePublished": mission.createdAt,
    "author": {
      "@type": "Organization",
      "name": "리얼픽"
    },
    "suggestedAnswer": (() => {
      if (!mission.options) return []
      if (Array.isArray(mission.options)) {
        return mission.options.map((opt: any) => ({
          "@type": "Answer",
          "text": typeof opt === 'string' ? opt : opt.name || "선택지"
        }))
      }
      // 커플 매칭 (left, right candidates)
      if (mission.options.left && mission.options.right) {
        const candidates = [...mission.options.left, ...mission.options.right]
        return candidates.map((name: string) => ({
          "@type": "Answer",
          "text": name
        }))
      }
      return []
    })()
  } : null

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
        "name": mission?.title || "투표",
        "item": `https://realpick.me/p-mission/${params.id}/vote`
      }
    ]
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  )
}
