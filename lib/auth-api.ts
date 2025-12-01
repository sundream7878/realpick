/**
 * Supabase Auth를 사용한 실제 인증 API
 */

import { createClient } from "@/lib/supabase/client"
import { getUser, createUser } from "@/lib/supabase/users"
import { setAuthToken, setUserId, clearAuthToken, clearUserId } from "@/lib/auth-utils"

/**
 * 링크 전송 (이메일)
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 현재 URL 가져오기 (클라이언트 사이드에서만 가능)
    const redirectUrl = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`

    // 링크 방식 사용
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error("링크 전송 실패:", error)
      console.error("에러 상세:", JSON.stringify(error, null, 2))

      // 사용자에게는 심플한 메시지만 보여줌
      if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.message.includes("rate limit")) {
        return { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }
      }

      if (error.message.includes("email")) {
        return { success: false, error: "이메일 주소를 확인해주세요." }
      }

      return { success: false, error: "링크 전송에 실패했습니다. 잠시 후 다시 시도해주세요." }
    }

    // 성공 시 로그 (개발 환경에서 디버깅용)
    if (process.env.NODE_ENV === "development") {
      console.log("링크 전송 성공:", email)
      console.log("💡 이메일을 확인하고 링크를 클릭해주세요.")
    }

    return { success: true }
  } catch (error: any) {
    console.error("링크 전송 중 오류:", error)
    return { success: false, error: error?.message || "링크 전송 중 오류가 발생했습니다." }
  }
}

/**
 * 링크 콜백 처리 (최신 Supabase PKCE 플로우 방식)
 */
export async function handleMagicLinkCallback(): Promise<{
  success: boolean
  userId?: string
  isNewUser?: boolean
  needsSetup?: boolean
  error?: string
}> {
  try {
    const supabase = createClient()

    console.log("[handleMagicLinkCallback] 시작")
    console.log("[handleMagicLinkCallback] URL:", window.location.href)

    // 0. Supabase 에러 먼저 확인
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    
    const error = searchParams.get('error') || hashParams.get('error')
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
    
    if (error) {
      console.error("[handleMagicLinkCallback] Supabase 에러:", error, errorDescription)
      console.error("[handleMagicLinkCallback] 전체 URL:", window.location.href)
      console.error("[handleMagicLinkCallback] 디바이스:", navigator.userAgent)
      
      let friendlyError = '인증 링크가 만료되었거나 유효하지 않습니다.'
      
      if (errorDescription) {
        const decoded = decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        
        // 일반적인 에러 메시지를 사용자 친화적으로 변환
        if (decoded.includes('expired') || decoded.includes('만료')) {
          friendlyError = '매직링크가 만료되었습니다. (유효기간: 1시간)'
        } else if (decoded.includes('invalid') || decoded.includes('already been consumed')) {
          friendlyError = '이미 사용된 링크입니다. 매직링크는 한 번만 사용 가능합니다.'
        } else if (decoded.includes('not found')) {
          friendlyError = '링크를 찾을 수 없습니다. 링크가 완전히 복사되었는지 확인해주세요.'
        } else {
          friendlyError = decoded
        }
      }
      
      return { 
        success: false, 
        error: friendlyError + '\n\n💡 새로운 매직링크를 요청해주세요.'
      }
    }

    // 1. Token Hash 플로우 (매직링크 기본 방식) - URL에서 자동으로 처리됨
    // Supabase는 URL에 token_hash가 있으면 자동으로 세션을 생성합니다
    console.log("[handleMagicLinkCallback] 세션 확인 중...")
    
    // 모바일에서는 URL 처리가 느릴 수 있으므로 재시도 로직 추가
    let currentSession = null
    const maxRetries = 3
    
    for (let i = 0; i < maxRetries; i++) {
      const waitTime = 500 + (i * 500) // 500ms, 1000ms, 1500ms
      console.log(`[handleMagicLinkCallback] 대기 중... (${waitTime}ms, 시도 ${i + 1}/${maxRetries})`)
      
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        console.log(`[handleMagicLinkCallback] 세션 발견! (${i + 1}번째 시도)`)
        currentSession = session
        break
      }
      
      console.log(`[handleMagicLinkCallback] 세션 없음, 재시도...`)
    }
    
    if (currentSession?.user) {
      console.log("[handleMagicLinkCallback] 매직링크로 세션 생성 성공:", currentSession.user.id)
      console.log("[handleMagicLinkCallback] 디바이스 정보:", {
        userAgent: navigator.userAgent,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      })
      
      const userId = currentSession.user.id
      const email = currentSession.user.email

      if (!email) {
        return { success: false, error: "이메일 정보를 가져올 수 없습니다." }
      }

      // 사용자 정보가 DB에 있는지 확인
      let userData = await getUser(userId)
      const isNewUser = !userData

      if (isNewUser) {
        const newUser = await createUser({
          id: userId,
          email: email,
          nickname: email.split("@")[0] || "사용자",
          points: 0,
          tier: "루키",
        })

        if (!newUser) {
          return { success: false, error: "사용자 생성에 실패했습니다." }
        }

        userData = newUser
      }

      if (!userData) {
        return { success: false, error: "사용자 정보를 가져올 수 없습니다." }
      }

      const needsSetup = !userData.ageRange || !userData.gender

      // 로그인 정보 저장
      if (!needsSetup) {
        if (currentSession.access_token) {
          setAuthToken(currentSession.access_token)
          setUserId(userId)
          localStorage.setItem("rp_user_email", userData.email)
          localStorage.setItem("rp_user_nickname", userData.nickname)
        }
      } else {
        setUserId(userId)
        localStorage.setItem("rp_user_email", userData.email)
        localStorage.setItem("rp_user_nickname", userData.nickname)
      }

      return { success: true, userId, isNewUser, needsSetup }
    }

    // 2. PKCE 플로우 (OAuth 앱용, 매직링크에서는 거의 사용 안 함)
    const code = searchParams.get('code')

    if (code) {
      console.log("[handleMagicLinkCallback] PKCE code 발견, exchangeCodeForSession 시도")
      
      try {
        // code를 세션으로 교환
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          console.error("[handleMagicLinkCallback] exchangeCodeForSession 실패:", error)
          // PKCE 실패 시 일반 세션 확인으로 fallback
          console.log("[handleMagicLinkCallback] PKCE 실패, 일반 세션 확인으로 전환")
          const { data: { session: fallbackSession } } = await supabase.auth.getSession()
          if (!fallbackSession) {
            return { 
              success: false, 
              error: "매직링크가 만료되었습니다. 다시 로그인해주세요." 
            }
          }
          // fallbackSession이 있으면 아래에서 처리
        } else if (data.session && data.user) {
          console.log("[handleMagicLinkCallback] PKCE 세션 생성 성공:", data.user.id)

          const userId = data.user.id
          const email = data.user.email

          if (!email) {
            return { success: false, error: "이메일 정보를 가져올 수 없습니다." }
          }

          // 사용자 정보가 DB에 있는지 확인
          let userData = await getUser(userId)
          const isNewUser = !userData

          if (isNewUser) {
            const newUser = await createUser({
              id: userId,
              email: email,
              nickname: email.split("@")[0] || "사용자",
              points: 0,
              tier: "루키",
            })

            if (!newUser) {
              return { success: false, error: "사용자 생성에 실패했습니다." }
            }

            userData = newUser
          }

          if (!userData) {
            return { success: false, error: "사용자 정보를 가져올 수 없습니다." }
          }

          const needsSetup = !userData.ageRange || !userData.gender

          // 로그인 정보 저장
          if (!needsSetup) {
            if (data.session.access_token) {
              setAuthToken(data.session.access_token)
              setUserId(userId)
              localStorage.setItem("rp_user_email", userData.email)
              localStorage.setItem("rp_user_nickname", userData.nickname)
            }
          } else {
            setUserId(userId)
            localStorage.setItem("rp_user_email", userData.email)
            localStorage.setItem("rp_user_nickname", userData.nickname)
          }

          return { success: true, userId, isNewUser, needsSetup }
        }
      } catch (err) {
        console.error("[handleMagicLinkCallback] PKCE 처리 중 오류:", err)
        // 오류 발생 시에도 일반 세션 확인으로 계속
      }
    }

    // 3. 최종 확인: 혹시 세션이 생성되었는지 다시 확인
    console.log("[handleMagicLinkCallback] 최종 세션 확인")
    const { data: { session: finalSession } } = await supabase.auth.getSession()

    if (finalSession?.user) {
      console.log("[handleMagicLinkCallback] 세션 발견:", finalSession.user.id)
      
      const userId = finalSession.user.id
      const email = finalSession.user.email

      if (!email) {
        return { success: false, error: "이메일 정보를 가져올 수 없습니다." }
      }

      // 사용자 정보가 DB에 있는지 확인
      let userData = await getUser(userId)
      const isNewUser = !userData

      if (isNewUser) {
        const newUser = await createUser({
          id: userId,
          email: email,
          nickname: email.split("@")[0] || "사용자",
          points: 0,
          tier: "루키",
        })

        if (!newUser) {
          return { success: false, error: "사용자 생성에 실패했습니다." }
        }

        userData = newUser
      }

      if (!userData) {
        return { success: false, error: "사용자 정보를 가져올 수 없습니다." }
      }

      const needsSetup = !userData.ageRange || !userData.gender

      if (!needsSetup) {
        if (finalSession.access_token) {
          setAuthToken(finalSession.access_token)
          setUserId(userId)
          localStorage.setItem("rp_user_email", userData.email)
          localStorage.setItem("rp_user_nickname", userData.nickname)
        }
      } else {
        setUserId(userId)
        localStorage.setItem("rp_user_email", userData.email)
        localStorage.setItem("rp_user_nickname", userData.nickname)
      }

      return { success: true, userId, isNewUser, needsSetup }
    }

    // 4. 모든 방법 실패
    console.error("[handleMagicLinkCallback] 유효한 인증 정보를 찾을 수 없습니다.")
    console.error("[handleMagicLinkCallback] URL:", window.location.href)
    return { 
      success: false, 
      error: "매직링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해주세요." 
    }
  } catch (error) {
    console.error("[handleMagicLinkCallback] 처리 중 오류:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "링크 처리 중 오류가 발생했습니다." 
    }
  }
}

/**
 * 인증코드 검증 및 로그인 (하위 호환성을 위해 유지, 사용 안 함)
 * @deprecated 링크 방식으로 변경됨. handleMagicLinkCallback 사용 권장
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<{ success: boolean; userId?: string; needsSetup?: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })

    if (error) {
      console.error("인증코드 검증 실패:", error)
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: "사용자 정보를 가져올 수 없습니다." }
    }

    const userId = data.user.id

    // 사용자 정보가 DB에 있는지 확인, 없으면 생성
    let userData = await getUser(userId)
    const isNewUser = !userData

    if (isNewUser) {
      // 새 사용자 생성 (나잇대/성별은 아직 없음)
      const newUser = await createUser({
        id: userId,
        email: email,
        nickname: email.split("@")[0] || "사용자",
        points: 0,
        tier: "루키",
      })

      if (!newUser) {
        return { success: false, error: "사용자 생성에 실패했습니다." }
      }

      userData = newUser
    }

    if (!userData) {
      return { success: false, error: "사용자 정보를 가져올 수 없습니다." }
    }

    // 나잇대/성별이 없으면 추가 정보 입력 필요
    const needsSetup = !userData.ageRange || !userData.gender

    // 추가 정보 입력이 필요한 경우에는 토큰을 저장하지 않음 (setup 페이지에서 처리)
    if (!needsSetup) {
      // 인증 토큰 저장
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token)
        setUserId(userId)
        // localStorage에도 이메일과 닉네임 저장
        localStorage.setItem("rp_user_email", userData.email)
        localStorage.setItem("rp_user_nickname", userData.nickname)
      }
    } else {
      // 추가 정보 입력이 필요한 경우 세션만 임시 저장 (브라우저 세션)
      if (data.session?.access_token) {
        // 세션은 Supabase가 자동으로 관리하므로, userId만 저장
        setUserId(userId)
        localStorage.setItem("rp_user_email", userData.email)
        localStorage.setItem("rp_user_nickname", userData.nickname)
        // auth-change 이벤트는 발생시키지 않음 (아직 완전한 로그인 아님)
      }
    }

    return { success: true, userId, needsSetup }
  } catch (error) {
    console.error("인증코드 검증 중 오류:", error)
    return { success: false, error: "인증코드 검증 중 오류가 발생했습니다." }
  }
}

/**
 * 링크 재전송
 */
export async function resendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  return sendVerificationCode(email)
}

/**
 * 로그아웃
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("로그아웃 실패:", error)
      return { success: false, error: error.message }
    }

    // localStorage 정리 (auth-utils 함수 사용)
    clearAuthToken() // 이미 auth-change 이벤트 발생
    clearUserId()
    localStorage.removeItem("rp_user_email")
    localStorage.removeItem("rp_user_nickname")
    localStorage.removeItem("rp_saved_emails")

    // 디버깅용 로그
    if (process.env.NODE_ENV === "development") {
      console.log("로그아웃 완료 - localStorage 정리됨")
      console.log("남은 토큰:", localStorage.getItem("rp_auth_token"))
    }

    return { success: true }
  } catch (error) {
    console.error("로그아웃 중 오류:", error)
    return { success: false, error: "로그아웃 중 오류가 발생했습니다." }
  }
}

