import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs, where, orderBy, limit, doc, deleteDoc, Timestamp } from 'firebase/firestore';

// Firebase 설정 (환경 변수에서 로드)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 타입 정의
export interface MarketingViralPost {
  id: string;
  title: string;
  content: string;
  url: string;
  platform: 'community' | 'naver_cafe' | 'instagram';
  showId?: string;
  keywords?: string[];
  viewCount: number;
  commentCount: number;
  publishedAt: string;
  crawledAt?: string;
  suggestedComment?: string;
  status?: 'pending' | 'used' | 'archived';
}

export interface CrawlProgress {
  id: string;
  status: 'running' | 'completed' | 'failed';
  current: number;
  total: number;
  message: string;
  startedAt: string;
  completedAt?: string;
}

export interface YoutubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  subscriberCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  collectedAt: string;
  expiresAt: string;
  keyword: string;
  hasSubtitle: boolean;
}

export interface AiMission {
  id: string;
  showId: string;
  sourceType: 'youtube' | 'community';
  sourceId: string;
  missionText: string;
  options: string[];
  correctOption: number;
  difficulty: 'easy' | 'medium' | 'hard';
  generatedAt: string;
  status: 'draft' | 'approved' | 'published' | 'rejected';
  approvedBy?: string;
  publishedAt?: string;
}

// API 함수들 (읽기 전용)

/**
 * 바이럴 게시글 목록 조회
 */
export async function getViralPosts(limitCount = 50): Promise<MarketingViralPost[]> {
  try {
    const q = query(
      collection(db, 't_marketing_viral_posts'),
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MarketingViralPost));
  } catch (error) {
    console.error('[Firebase] 바이럴 게시글 조회 오류:', error);
    throw error;
  }
}

/**
 * 크롤링 진행 상황 조회
 */
export async function getCrawlProgress(progressId: string): Promise<CrawlProgress | null> {
  try {
    const q = query(
      collection(db, 't_marketing_crawl_progress'),
      where('progressId', '==', progressId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as CrawlProgress;
  } catch (error) {
    console.error('[Firebase] 크롤링 진행 상황 조회 오류:', error);
    throw error;
  }
}

/**
 * YouTube 영상 목록 조회
 */
export async function getYoutubeVideos(limitCount = 50): Promise<YoutubeVideo[]> {
  try {
    const q = query(
      collection(db, 't_marketing_videos'),
      orderBy('collectedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data()
    } as YoutubeVideo));
  } catch (error) {
    console.error('[Firebase] YouTube 영상 조회 오류:', error);
    throw error;
  }
}

/**
 * AI 미션 목록 조회 (draft 상태만)
 */
export async function getAiMissions(status = 'draft'): Promise<AiMission[]> {
  try {
    const q = query(
      collection(db, 't_marketing_ai_missions'),
      where('status', '==', status),
      orderBy('generatedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AiMission));
  } catch (error) {
    console.error('[Firebase] AI 미션 조회 오류:', error);
    throw error;
  }
}

/**
 * 바이럴 게시글 삭제
 */
export async function deleteViralPost(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 't_marketing_viral_posts', postId));
    console.log('[Firebase] 바이럴 게시글 삭제 완료:', postId);
  } catch (error) {
    console.error('[Firebase] 바이럴 게시글 삭제 오류:', error);
    throw error;
  }
}

/**
 * YouTube 영상 삭제
 */
export async function deleteYoutubeVideo(videoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 't_marketing_videos', videoId));
    console.log('[Firebase] YouTube 영상 삭제 완료:', videoId);
  } catch (error) {
    console.error('[Firebase] YouTube 영상 삭제 오류:', error);
    throw error;
  }
}

/**
 * AI 미션 삭제
 */
export async function deleteAiMission(missionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 't_marketing_ai_missions', missionId));
    console.log('[Firebase] AI 미션 삭제 완료:', missionId);
  } catch (error) {
    console.error('[Firebase] AI 미션 삭제 오류:', error);
    throw error;
  }
}
