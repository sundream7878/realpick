import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/c-ui/toaster"
import { KakaoSDK } from "@/components/c-common/KakaoSDK"
import "./globals.css"
// Force CSS rebuild

export const metadata: Metadata = {
  title: "리얼픽 - 리얼 예능 투표 플랫폼",
  description: "리얼 예능 특화 집단지성 투표 플랫폼",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon-80x80.png", sizes: "80x80", type: "image/png" },
      { url: "/favicon-80x80.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-80x80.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-80x80.png",
    apple: "/favicon-80x80.png",
  },
  manifest: "/manifest.json",
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
        {/* 카카오 SDK */}
        <KakaoSDK />

        <Suspense fallback={<div>Loading...</div>}>
          <div className="min-h-screen bg-background">{children}</div>
        </Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
