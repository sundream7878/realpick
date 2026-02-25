/**
 * 간단한 인증 유틸리티 함수들
 * TODO: 실제 Supabase 인증과 연결 필요
 */

import { auth } from "./firebase/config";
import { v4 as uuidv4 } from 'uuid';

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  const currentUser = !!auth.currentUser
  const hasToken = !!localStorage.getItem("rp_auth_token")
  const result = currentUser || hasToken
  console.log('[Auth] isAuthenticated 호출 - currentUser:', currentUser, '/ hasToken:', hasToken, '/ result:', result)
  return result
}

/**
 * 익명 ID 가져오기 또는 생성
 */
export function getAnonId(): string {
  if (typeof window === "undefined") return "server-side";
  let anonId = localStorage.getItem("rp_anon_id");
  if (!anonId) {
    anonId = `anon_${uuidv4()}`;
    localStorage.setItem("rp_anon_id", anonId);
  }
  return anonId;
}

/**
 * 미션 참여 횟수 증가 및 가져오기
 */
export function incrementParticipationCount(): number {
  if (typeof window === "undefined") return 0;
  const currentCount = getParticipationCount();
  const newCount = currentCount + 1;
  localStorage.setItem("rp_participation_count", newCount.toString());
  return newCount;
}

export function getParticipationCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("rp_participation_count") || "0", 10);
}

/**
 * 익명 별명 생성 (20개 동물 하드코딩)
 */
export function getAnonNickname(): string {
  if (typeof window === "undefined") return "익명 사용자";
  
  let nickname = localStorage.getItem("rp_anon_nickname");
  if (!nickname) {
    const animals = [
      "호랑이", "강아지", "고양이", "사자", "코끼리", 
      "기린", "얼룩말", "판다", "곰", "토끼", 
      "다람쥐", "여우", "늑대", "사슴", "하마", 
      "코뿔소", "펭귄", "독수리", "부엉이", "원숭이"
    ];
    const randomIndex = Math.floor(Math.random() * animals.length);
    nickname = `익명 ${animals[randomIndex]}`;
    localStorage.setItem("rp_anon_nickname", nickname);
  }
  return nickname;
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null
  
  // 1. 인증된 사용자 ID 우선
  const userId = localStorage.getItem("rp_user_id")
  if (userId) return userId;

  // 2. 익명 ID 반환
  return getAnonId();
}

export function setUserId(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("rp_user_id", userId)
}

export function clearUserId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("rp_user_id")
}


