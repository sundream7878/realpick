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
