import { Metadata, ResolvingMetadata } from 'next'
import { getUser } from "@/lib/firebase/users"
import { getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"

interface Props {
  params: { id: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id
  const user = await getUser(id)
  
  if (!user) {
    return {
      title: '사용자를 찾을 수 없습니다',
    }
  }

  const tier = getTierFromDbOrPoints(user.tier, user.points)
  const title = `[${tier.name}] ${user.nickname}님의 프로필`
  const description = `${user.nickname}님은 리얼픽에서 ${user.points.toLocaleString()}P를 획득한 ${tier.name} 등급 예측가입니다.`

  return {
    title: title,
    description: description,
    openGraph: {
      title: `${title} | 리얼픽`,
      description: description,
      type: 'profile',
    },
  }
}

export default function PublicProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
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
        "name": "랭킹",
        "item": "https://realpick.me/p-ranking"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "유저 프로필",
        "item": `https://realpick.me/p-profile/${params.id}`
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
