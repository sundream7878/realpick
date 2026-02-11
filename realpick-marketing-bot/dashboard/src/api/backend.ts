// 백엔드 API 클라이언트
const API_BASE_URL = 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * YouTube 크롤링 실행
 */
export async function crawlYoutube(params: {
  keywords: string;
  maxResults?: number;
  hoursBack?: number;
}): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/youtube/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error: any) {
    console.error('[API] YouTube 크롤링 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 커뮤니티 크롤링 실행
 */
export async function crawlCommunity(params: {
  keywords?: string;
  limit?: number;
}): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/community/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error: any) {
    console.error('[API] 커뮤니티 크롤링 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 네이버 카페 크롤링 실행
 */
export async function crawlNaverCafe(params: {
  cafeUrl: string;
  keywords?: string;
  startDate?: string;
  endDate?: string;
  maxPages?: number;
}): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/naver-cafe/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error: any) {
    console.error('[API] 네이버 카페 크롤링 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * YouTube 영상 분석 (AI 미션 생성)
 */
export async function analyzeYoutubeVideo(params: {
  videoId: string;
  title: string;
  description: string;
}): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/youtube/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error: any) {
    console.error('[API] YouTube 영상 분석 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 헬스 체크
 */
export async function healthCheck(): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return await response.json();
  } catch (error: any) {
    console.error('[API] 헬스 체크 오류:', error);
    return { success: false, error: error.message };
  }
}
