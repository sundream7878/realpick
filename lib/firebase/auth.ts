import { 
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "./config";

// 브라우저 환경에서만 실행되는 설정
const actionCodeSettings = {
  // 로그인 후 돌아올 URL
  url: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "",
  handleCodeInApp: true,
};

/**
 * 매직링크 전송 (이메일)
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // 이메일을 로컬 스토리지에 저장 (나중에 검증할 때 필요)
    if (typeof window !== "undefined") {
      window.localStorage.setItem("emailForSignIn", email);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Firebase Magic Link 전송 실패:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 매직링크 검증 및 로그인
 */
export async function completeSignInWithLink(email: string, href: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (isSignInWithEmailLink(auth, href)) {
      const result = await signInWithEmailLink(auth, email, href);
      return { success: true, user: result.user };
    }
    return { success: false, error: "유효하지 않은 인증 링크입니다." };
  } catch (error: any) {
    console.error("Firebase Magic Link 검증 실패:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 로그아웃
 */
export async function firebaseLogout(): Promise<{ success: boolean; error?: string }> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error("Firebase 로그아웃 실패:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 현재 로그인된 사용자 감시
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

