import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "랭킹 | 리얼픽 최고의 예측가들",
  description: "리얼픽의 실시간 랭킹을 확인하세요. 포인트, 정답률, 주간 활동 등 분야별 최고의 픽마스터들을 만나보실 수 있습니다.",
  openGraph: {
    title: "리얼픽 랭킹 | 최고의 인사이터는 누구?",
    description: "실시간 예능 예측 랭킹! 당신의 순위를 확인해보세요.",
    type: 'website',
  },
}

export default function RankingLayout({
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
        "name": "랭킹",
        "item": "https://realpick.me/p-ranking"
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
