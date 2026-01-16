import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/c-ui/toaster"
import { KakaoSDK } from "@/components/c-common/KakaoSDK"
import { SeoFooter } from "@/components/c-layout/SeoFooter"
import "./globals.css"
// Force CSS rebuild

export const metadata: Metadata = {
  title: {
    default: "리얼픽 | 리얼 예능 투표 & 결과 예측 플랫폼",
    template: "%s | 리얼픽"
  },
  description: "나는솔로, 돌싱글즈, 서바이벌 예능의 결과를 내 손으로 직접 예측하세요. 실시간 시청자 반응과 투표 통계를 제공합니다.",
  applicationName: "리얼픽",
  authors: [{ name: "리얼픽 팀" }],
  generator: "Next.js",
  keywords: [
    "나는 솔로", "나솔사계", "환승연애 4", "합숙맞선", "솔로지옥 5", "끝사랑", "연애남매", "돌싱글즈 6",
    "흑백요리사 2", "최강야구 2025", "노엑싯게임룸", "뭉쳐야 찬다 3", "골 때리는 그녀들 8", "피의 게임 3",
    "대학전쟁 2", "강철부대 W", "무쇠소녀단", "미스트롯 4", "프로젝트 7", "쇼미더머니 12", "현역가왕 2",
    "미스터트롯 3", "랩:퍼블릭", "유니버스 리그", "싱어게인",
    "예능 투표", "결과 예측", "연애예능 커뮤니티", "리얼픽"
  ],
  referrer: "origin-when-cross-origin",
  creator: "리얼픽",
  publisher: "리얼픽",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-100x100.png", sizes: "100x100", type: "image/png" },
      { url: "/favicon-100x100.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-100x100.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-512x512.png",
    apple: "/icons/icon-512x512.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "리얼픽 | 리얼 예능 투표 & 결과 예측 플랫폼",
    description: "나는솔로, 돌싱글즈, 서바이벌 예능의 결과를 내 손으로 직접 예측하세요. 실시간 시청자 반응과 투표 통계를 제공합니다.",
    url: "https://realpick.me",
    siteName: "리얼픽",
    images: [
      {
        url: "/og-main.png", // 실제 존재하는 이미지 경로여야 함
        width: 1200,
        height: 630,
        alt: "리얼픽 메인 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "리얼픽 | 리얼 예능 투표 & 결과 예측 플랫폼",
    description: "나는솔로, 돌싱글즈, 서바이벌 예능의 결과를 내 손으로 직접 예측하세요. 실시간 시청자 반응과 투표 통계를 제공합니다.",
    images: ["/og-main.png"],
    creator: "@realpick",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {/* 구조화된 데이터 (Organization & WebSite) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "리얼픽",
              "url": "https://realpick.me",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://realpick.me/?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "리얼픽",
              "url": "https://realpick.me",
              "logo": "https://realpick.me/realpick-logo-new.png",
              "sameAs": [
                "https://www.instagram.com/realpick",
                "https://twitter.com/realpick"
              ]
            })
          }}
        />
        {/* 카카오 SDK */}
        <KakaoSDK />

        <Suspense fallback={<div>Loading...</div>}>
          <div className="min-h-screen bg-background">{children}</div>
        </Suspense>
        <SeoFooter />
        <Toaster />
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
