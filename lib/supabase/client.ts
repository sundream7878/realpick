import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce', // PKCE 플로우 사용 (브라우저 간 호환성 향상)
        autoRefreshToken: true, // 자동 토큰 갱신
        detectSessionInUrl: true, // URL에서 세션 자동 감지
        persistSession: true, // 세션 유지
      },
    }
  )
}
