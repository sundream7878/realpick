/**
 * Firebase Auth를 사용한 인증 API
 */

import { auth } from "@/lib/firebase/config"
import { 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut as firebaseSignOut
} from "firebase/auth"
import { getUser, getUserByEmail, createUser, linkUserToFirebaseUid } from "@/lib/firebase/users"
import { setAuthToken, setUserId, clearAuthToken, clearUserId } from "@/lib/auth-utils"

const actionCodeSettings = {
  url: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "",
  handleCodeInApp: true,
}

/**
 * 링크 전송 (이메일 매직링크) - 커스텀 템플릿 사용
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🔥 [sendVerificationCode] 커스텀 템플릿으로 이메일 발송 시작:", email)

    // 원래 방식대로 현재 접속한 도메인을 기반으로 리다이렉트 URL 생성
    const redirectUrl = typeof window !== "undefined" 
      ? `${window.location.origin}/auth/callback`
      : "https://real-pick.com/auth/callback"
    
    console.log("📍 [sendVerificationCode] Redirect URL:", redirectUrl)
    
    // 우리가 만든 Cloud Function 호출 (커스텀 템플릿으로 이메일 발송)
    const response = await fetch("https://sendmagiclink-b2atbwi42a-uc.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, redirectUrl }),
    })

    const data = await response.json()
    console.log("✅ [sendVerificationCode] 이메일 발송 응답:", data)

    if (!data.success) {
      throw new Error(data.error || "이메일 발송에 실패했습니다.")
    }

    // 이메일을 로컬 스토리지에 저장 (나중에 검증할 때 필요)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("emailForSignIn", email)
    }

    console.log("🎉 [sendVerificationCode] 커스텀 템플릿 이메일 발송 완료!")
    return { success: true }
  } catch (error: any) {
    console.error("Firebase 매직링크 전송 실패:", error)
    return { success: false, error: error.message }
  }
}

/**
 * 링크 콜백 처리
 */
export async function handleMagicLinkCallback(): Promise<{
  success: boolean
  userId?: string
  isNewUser?: boolean
  needsSetup?: boolean
  error?: string
}> {
  try {
    const href = typeof window !== "undefined" ? window.location.href : ""

    if (!isSignInWithEmailLink(auth, href)) {
      return {
        success: false,
        error: "유효하지 않은 인증 링크입니다. 같은 브라우저에서 로그인 링크를 요청한 뒤, 이메일에 있는 링크를 그 브라우저에서 열어주세요. 이미 사용한 링크는 한 번만 사용할 수 있습니다.",
      }
    }

    let email = typeof window !== "undefined" ? window.localStorage.getItem("emailForSignIn") : null
    if (!email) {
      email = typeof window !== "undefined" ? window.prompt("이메일을 다시 입력해주세요 (보안 확인용)") : null
    }

    if (!email) {
      return {
        success: false,
        error: "이메일 정보가 없습니다. 로그인을 요청한 기기·브라우저에서 이 링크를 열거나, 위에 뜨는 입력창에 가입한 이메일을 입력해주세요.",
      }
    }

    const result = await signInWithEmailLink(auth, email, href)
    const user = result.user

    if (!user) {
      return { success: false, error: "인증 실패" }
    }

    const userId = user.uid
    const userEmail = user.email || email

    // 1. 새로운 Firebase UID로 먼저 조회
    let userData = await getUser(userId)
    
    // 2. 만약 없으면 이메일로 기존(Supabase에서 마이그레이션된) 데이터 조회
    if (!userData) {
      const existingUserByEmail = await getUserByEmail(userEmail)
      
      if (existingUserByEmail) {
        // 기존 데이터를 찾았다면 새로운 UID와 연결(복사)
        console.log(`기존 유저 데이터 발견(${userEmail}), 새로운 UID(${userId})와 연결합니다.`)
        await linkUserToFirebaseUid(existingUserByEmail.id, userId)
        userData = await getUser(userId)
      }
    }

    const isNewUser = !userData

    if (isNewUser) {
      const newUser = await createUser({
        id: userId,
        email: userEmail,
        nickname: userEmail.split("@")[0] || "사용자",
        points: 0,
        tier: "루키",
        role: "PICKER",
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
      const idToken = await user.getIdToken()
      setAuthToken(idToken)
      setUserId(userId)
      localStorage.setItem("rp_user_email", userData.email)
      localStorage.setItem("rp_user_nickname", userData.nickname)
    } else {
      setUserId(userId)
      localStorage.setItem("rp_user_email", userData.email)
      localStorage.setItem("rp_user_nickname", userData.nickname)
    }

    window.localStorage.removeItem("emailForSignIn")
    return { success: true, userId, isNewUser, needsSetup }
  } catch (error: any) {
    console.error("Firebase 매직링크 처리 중 오류:", error)
    const code = error?.code ?? ""
    const msg = error?.message ?? "알 수 없는 오류"
    if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
      return { success: false, error: "이 로그인 링크는 이미 사용되었거나 만료되었습니다. 로그인 화면에서 다시 '이메일로 로그인'을 요청해주세요." }
    }
    if (code === "auth/invalid-email") {
      return { success: false, error: "이메일이 올바르지 않습니다. 로그인을 요청할 때 사용한 이메일과 동일한 주소를 입력해주세요." }
    }
    return { success: false, error: msg }
  }
}

/**
 * OTP 코드 검증 (Firebase에서는 매직링크를 사용하므로 이 함수는 사용되지 않거나 에러 처리)
 */
export async function verifyOtpCode(
  email: string,
  code: string
): Promise<{ success: boolean; userId?: string; needsSetup?: boolean; isNewUser?: boolean; error?: string }> {
  // Firebase standard email auth doesn't support 6-digit OTP codes.
  // We recommend using the Magic Link flow.
  return { 
    success: false, 
    error: "Firebase로 이전되어 6자리 코드 대신 이메일 링크 인증을 사용합니다. 이메일 링크를 확인해주세요." 
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
    await firebaseSignOut(auth)
    clearAuthToken()
    clearUserId()
    localStorage.removeItem("rp_user_email")
    localStorage.removeItem("rp_user_nickname")
    localStorage.removeItem("rp_saved_emails")
    return { success: true }
  } catch (error: any) {
    console.error("로그아웃 중 오류:", error)
    return { success: false, error: error.message }
  }
}
