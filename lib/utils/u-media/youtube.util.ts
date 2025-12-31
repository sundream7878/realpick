/**
 * 유튜브 URL 관련 유틸리티 함수들
 */

// 유튜브 영상 ID 추출 정규식
export function getYoutubeVideoId(url: string): string | null {
    if (!url) return null

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)

    return (match && match[2].length === 11) ? match[2] : null
}

// 썸네일 URL 생성 (기본: 고화질)
// quality: 'maxresdefault' | 'sddefault' | 'hqdefault' | 'mqdefault' | 'default'
export function getYoutubeThumbnailUrl(videoId: string, quality = 'maxresdefault'): string {
    if (!videoId) return ''
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

// URL에서 바로 썸네일 가져오기 (편의 함수)
export function getThumbnailFromUrl(url: string): string | null {
    const videoId = getYoutubeVideoId(url)
    if (!videoId) return null
    return getYoutubeThumbnailUrl(videoId)
}

// 유튜브 URL인지 확인
export function isYoutubeUrl(url: string): boolean {
    if (!url) return false
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url)
}

// 유튜브 임베드 URL 생성
export function getYoutubeEmbedUrl(url: string): string | null {
    const videoId = getYoutubeVideoId(url)
    if (!videoId) return null
    return `https://www.youtube.com/embed/${videoId}`
}