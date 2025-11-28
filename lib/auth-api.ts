/**
 * Supabase Auth를 사용한 실제 인증 API
 */

import { createClient } from "@/lib/supabase/client"
import { getUser, createUser } from "@/lib/supabase/users"
import { setAuthToken, setUserId, clearAuthToken, clearUserId } from "@/lib/auth-utils"

/**
 * 매직링크 전송 (이메일)
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 현재 URL 가져오기 (클라이언트 사이드에서만 가능)
    const redirectUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/auth/callback`
      : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`
    
    // 매직링크 방식 사용
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error("매직링크 전송 실패:", error)
      console.error("에러 상세:", JSON.stringify(error, null, 2))

      // 사용자에게는 심플한 메시지만 보여줌
      if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.message.includes("rate limit")) {
        return { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }
      }

      if (error.message.includes("email")) {
        return { success: false, error: "이메일 주소를 확인해주세요." }
      }

      return { success: false, error: "매직링크 전송에 실패했습니다. 잠시 후 다시 시도해주세요." }
    }

    // 성공 시 로그 (개발 환경에서 디버깅용)
    if (process.env.NODE_ENV === "development") {
      console.log("매직링크 전송 성공:", email)
      console.log("💡 이메일을 확인하고 링크를 클릭해주세요.")
    }

    return { success: true }
  } catch (error: any) {
    console.error("매직링크 전송 중 오류:", error)
    return { success: false, error: error?.message || "매직링크 전송 중 오류가 발생했습니다." }
  }
}

/**
 * 매직링크 콜백 처리 (URL에서 토큰 추출 및 세션 생성)
 */
export async function handleMagicLinkCallback(): Promise<{ 
  success: boolean
  userId?: string
  isNewUser?: boolean
  error?: string 
}> {
  try {
    const supabase = createClient()
    
    // URL에서 토큰 추출
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")
    
    if (!accessToken || type !== "magiclink") {
      return { success: false, error: "유효하지 않은 매직링크입니다." }
    }

    // 세션 설정
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: hashParams.get("refresh_token") || "",
    })

    if (sessionError || !sessionData.user) {
      console.error("세션 설정 실패:", sessionError)
      return { success: false, error: "세션 설정에 실패했습니다." }
    }

    const userId = sessionData.user.id
    const email = sessionData.user.email

    if (!email) {
      return { success: false, error: "이메일 정보를 가져올 수 없습니다." }
    }

    // 사용자 정보가 DB에 있는지 확인
    let userData = await getUser(userId)
    const isNewUser = !userData

    if (isNewUser) {
      // 새 사용자 생성 (나잇대/성별은 아직 없음, 추가 정보 입력 단계에서 입력)
      const newUser = await createUser({
        id: userId,
        email: email,
        nickname: email.split("@")[0] || "사용자", // 기본 닉네임은 이메일 앞부분
        points: 0,
        tier: "모태솔로",
        avatarUrl: null,
      })

      if (!newUser) {
        return { success: false, error: "사용자 생성에 실패했습니다." }
      }

      userData = newUser
    }

    // 인증 토큰 저장
    if (sessionData.session?.access_token) {
      setAuthToken(sessionData.session.access_token)
      setUserId(userId)
      // localStorage에도 이메일과 닉네임 저장
      localStorage.setItem("rp_user_email", userData.email)
      localStorage.setItem("rp_user_nickname", userData.nickname)
    }

    return { success: true, userId, isNewUser }
  } catch (error) {
    console.error("매직링크 콜백 처리 중 오류:", error)
    return { success: false, error: "매직링크 처리 중 오류가 발생했습니다." }
  }
}

/**
 * 인증코드 검증 및 로그인 (하위 호환성을 위해 유지, 사용 안 함)
 * @deprecated 매직링크 방식으로 변경됨. handleMagicLinkCallback 사용 권장
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
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
    if (!userData) {
      // 새 사용자 생성
      const newUser = await createUser({
        id: userId,
        email: email,
        nickname: email.split("@")[0] || "사용자", // 기본 닉네임은 이메일 앞부분
        points: 0,
        tier: "모태솔로",
        avatarUrl: null,
      })

      if (!newUser) {
        return { success: false, error: "사용자 생성에 실패했습니다." }
      }

      userData = newUser
    }

    // 인증 토큰 저장
    if (data.session?.access_token) {
      setAuthToken(data.session.access_token)
      setUserId(userId)
      // localStorage에도 이메일과 닉네임 저장
      localStorage.setItem("rp_user_email", userData.email)
      localStorage.setItem("rp_user_nickname", userData.nickname)
    }

    return { success: true, userId }
  } catch (error) {
    console.error("인증코드 검증 중 오류:", error)
    return { success: false, error: "인증코드 검증 중 오류가 발생했습니다." }
  }
}

/**
 * 매직링크 재전송
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

