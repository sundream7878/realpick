/**
 * 간단한 인증 유틸리티 함수들
 * TODO: 실제 Supabase 인증과 연결 필요
 */

import { auth } from "./firebase/config";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return !!auth.currentUser || !!localStorage.getItem("rp_auth_token")
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("rp_auth_token", token)
  // 인증 상태 변경 이벤트 발생
  window.dispatchEvent(new Event("auth-change"))
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return
  console.log("🗑️ clearAuthToken 호출됨")
  localStorage.removeItem("rp_auth_token")
  console.log("📢 auth-change 이벤트 발생")
  // 인증 상태 변경 이벤트 발생
  window.dispatchEvent(new Event("auth-change"))
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("rp_user_id")
}

export function setUserId(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("rp_user_id", userId)
}

export function clearUserId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("rp_user_id")
}


