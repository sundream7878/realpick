// 프로그램 데이터 타입 정의
export type TShowCategory = "LOVE" | "VICTORY" | "STAR" | "UNIFIED"

export interface TShow {
    id: string
    name: string
    displayName: string
    category: TShowCategory
    officialUrl?: string
    defaultThumbnail?: string // 기본 썸네일 경로 추가
    isActive?: boolean // 활성화 여부 추가
}

// 프로그램 데이터
export const SHOWS: Record<TShowCategory, TShow[]> = {
    LOVE: [
        { id: "nasolo", name: "나는솔로", displayName: "나는 솔로", category: "LOVE", officialUrl: "https://prismstudios.sbs.co.kr/", defaultThumbnail: "/images/shows/nasolo.png", isActive: true },
        { id: "nasolsagye", name: "나솔사계", displayName: "나솔사계", category: "LOVE", officialUrl: "https://programs.sbs.co.kr/plus/iamsolo_loveforever", defaultThumbnail: "/images/shows/nasolsagye.png", isActive: true },
        { id: "dolsingles6", name: "돌싱글즈6", displayName: "돌싱글즈", category: "LOVE", officialUrl: "https://www.mbn.co.kr/vod/programMain/966", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "solojihuk5", name: "솔로지옥5", displayName: "솔로지옥", category: "LOVE", officialUrl: "https://www.netflix.com/kr/title/81436209", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "kkeut-sarang", name: "끝사랑", displayName: "끝사랑", category: "LOVE", officialUrl: "https://tv.jtbc.co.kr/lastlove", defaultThumbnail: "/placeholder.png", isActive: false },
        { id: "hwanseung4", name: "환승연애4", displayName: "환승연애", category: "LOVE", officialUrl: "https://www.tving.com/contents/P001724962", defaultThumbnail: "/images/shows/hwanseung.png", isActive: true },
        { id: "yeonae-nammae", name: "연애남매", displayName: "연애남매", category: "LOVE", officialUrl: "https://tv.jtbc.co.kr/love_siblings", defaultThumbnail: "/placeholder.png", isActive: false },
        { id: "habsuk-matseon", name: "합숙맞선", displayName: "합숙맞선", category: "LOVE", officialUrl: "", defaultThumbnail: "/images/shows/nasolo.png", isActive: true },
    ],
    VICTORY: [
        { id: "choegang-yagu-2025", name: "최강야구2025", displayName: "최강야구", category: "VICTORY", officialUrl: "https://tv.jtbc.co.kr/ckmonsters", defaultThumbnail: "/images/shows/choegang-yagu.png", isActive: true },
        { id: "goal-girls-8", name: "골때녀8", displayName: "골 때리는 그녀들", category: "VICTORY", officialUrl: "https://programs.sbs.co.kr/enter/goal", defaultThumbnail: "/images/shows/goal-girls.png", isActive: true },
        { id: "steel-troops-w", name: "강철부대W", displayName: "강철부대", category: "VICTORY", officialUrl: "https://www.ichannela.com/program/template/program_refinement.do?cateCode=0502&subCateCode=050236&pgm_id=WPG2140182D", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "blood-game3", name: "피의게임3", displayName: "피의 게임", category: "VICTORY", officialUrl: "https://www.wavve.com/player/vod?programid=C9901_C99000000115", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "univ-war2", name: "대학전쟁2", displayName: "대학전쟁", category: "VICTORY", officialUrl: "https://www.coupangplay.com/", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "culinary-class-wars2", name: "흑백요리사2", displayName: "흑백요리사", category: "VICTORY", officialUrl: "https://www.netflix.com/kr/title/81726701", defaultThumbnail: "/images/shows/culinary-class-wars2.png", isActive: true },
        { id: "kick-together3", name: "뭉쳐야찬다3", displayName: "뭉쳐야 찬다", category: "VICTORY", officialUrl: "https://tv.jtbc.co.kr/gentlemen3", defaultThumbnail: "/images/shows/kick-together3.png", isActive: true },
        { id: "iron-girls", name: "무쇠소녀단", displayName: "무쇠소녀단", category: "VICTORY", officialUrl: "https://tvn.cjenm.com/ko/iron-girls/", defaultThumbnail: "/placeholder.png", isActive: false },
        { id: "no-exit-gameroom", name: "노엑싯게임룸", displayName: "노엑싯게임룸", category: "VICTORY", officialUrl: "", defaultThumbnail: "/placeholder.png", isActive: true },
    ],
    STAR: [
        { id: "mr-trot3", name: "미스터트롯3", displayName: "미스터트롯", category: "STAR", officialUrl: "http://broadcast.tvchosun.com/broadcast/program/2/C202400150.cstv", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "mistrot4", name: "미스트롯4", displayName: "미스트롯", category: "STAR", officialUrl: "", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "active-king2", name: "현역가왕2", displayName: "현역가왕", category: "STAR", officialUrl: "https://www.mbn.co.kr/vod/programMain/967", defaultThumbnail: "/images/shows/active-king2.png", isActive: true },
        { id: "project7", name: "프로젝트7", displayName: "프로젝트", category: "STAR", officialUrl: "https://project7.jtbc.co.kr/", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "universe-league", name: "유니버스리그", displayName: "유니버스 리그", category: "STAR", officialUrl: "https://programs.sbs.co.kr/enter/universeleague", defaultThumbnail: "/placeholder.png", isActive: true },
        { id: "show-me-the-money-12", name: "쇼미더머니12", displayName: "쇼미더머니", category: "STAR", officialUrl: "https://www.mnetplus.world/c/smtm11", defaultThumbnail: "/placeholder.png", isActive: false },
        { id: "sing-again", name: "싱어게인", displayName: "싱어게인", category: "STAR", officialUrl: "https://tv.jtbc.co.kr/singagain3", defaultThumbnail: "/placeholder.png", isActive: false },
        { id: "rap-public", name: "랩퍼블릭", displayName: "랩:퍼블릭", category: "STAR", officialUrl: "https://www.tving.com/contents/P001763784", defaultThumbnail: "/placeholder.png", isActive: true },
    ],
    UNIFIED: [],
}

// 카테고리 정보
export const CATEGORIES = {
    LOVE: {
        id: "LOVE" as TShowCategory,
        emoji: "❤️",
        iconPath: "/images/icons/romance.png",
        label: "Romance",
        description: "로맨스",
    },
    VICTORY: {
        id: "VICTORY" as TShowCategory,
        emoji: "🏆",
        iconPath: "/images/icons/survival.png",
        label: "Survival",
        description: "서바이벌",
    },
    STAR: {
        id: "STAR" as TShowCategory,
        emoji: "🌟",
        iconPath: "/images/icons/audition.png",
        label: "Audition",
        description: "오디션",
    },
    UNIFIED: {
        id: "UNIFIED" as TShowCategory,
        emoji: "✨",
        iconPath: "/images/icons/romance.png", // Fallback icon
        label: "Common",
        description: "공통",
    },
}

// 프로그램 ID로 찾기
export function getShowById(showId: string): TShow | undefined {
    if (!SHOWS) return undefined
    for (const category of Object.values(SHOWS)) {
        const show = category.find(s => s.id === showId)
        if (show) return show
    }
    return undefined
}

// 프로그램 이름으로 찾기 (유연한 검색)
export function getShowByName(showName: string): TShow | undefined {
    const normalize = (str: string) => str.replace(/\s+/g, "").toLowerCase()
    const target = normalize(showName)

    // 별칭 매핑 (약어 처리)
    const aliasMap: Record<string, string> = {
        "환글": "환승연애",
        "나솔": "나는솔로",
        "돌싱": "돌싱글즈",
        "쇼미더머니": "쇼미더머니12",
        "골때리는그녀들": "골때녀8",
        "골때리는그녀": "골때녀8",
        "골때녀": "골때녀8",
    }
    
    // 별칭이면 원래 이름으로 변환
    const resolvedName = aliasMap[showName] || showName
    const resolvedTarget = normalize(resolvedName)

    for (const category of Object.values(SHOWS)) {
        // 1. 정확 일치 우선 검색 (이름, 표시 이름, ID)
        let show = category.find(s => 
            normalize(s.name) === resolvedTarget || 
            normalize(s.displayName) === resolvedTarget || 
            s.id === resolvedTarget ||
            normalize(s.name) === target || 
            normalize(s.displayName) === target || 
            s.id === target
        )
        if (show) return show

        // 2. 포함 관계 검색 (target이 name에 포함되거나, name이 target에 포함되거나)
        // 예: "돌싱글즈" -> "돌싱글즈6" 찾기
        show = category.find(s => {
            const nName = normalize(s.name)
            const nDisplay = normalize(s.displayName)
            return nName.includes(resolvedTarget) || nDisplay.includes(resolvedTarget) || resolvedTarget.includes(nName) ||
                   nName.includes(target) || nDisplay.includes(target) || target.includes(nName)
        })
        if (show) return show
    }
    return undefined
}

// AI 미션의 한글 showId를 영어 showId로 변환
export function normalizeShowId(showId: string | undefined | null): string | undefined {
    if (!showId) return undefined;
    
    // 이미 영어 ID면 그대로 반환
    const show = getShowById(showId);
    if (show) return show.id;
    
    // 한글 이름이면 영어 ID로 변환
    const showByName = getShowByName(showId);
    if (showByName) {
        console.log(`[showId 변환] "${showId}" → "${showByName.id}"`);
        return showByName.id;
    }
    
    // 매칭 실패
    console.warn(`[showId 변환 실패] "${showId}" - 등록된 프로그램을 찾을 수 없습니다.`);
    return undefined;
}

// 카테고리 이름이나 ID를 표준 ID("LOVE", "VICTORY", "STAR")로 변환
export function normalizeCategory(category: string | undefined | null): TShowCategory | undefined {
    if (!category) return undefined;
    
    const upper = category.toUpperCase();
    if (upper === "LOVE" || upper === "VICTORY" || upper === "STAR" || upper === "UNIFIED") {
        return upper as TShowCategory;
    }
    
    // 한글 설명으로 찾기
    for (const [id, info] of Object.entries(CATEGORIES)) {
        if (info.description === category || info.label === category) {
            return id as TShowCategory;
        }
    }
    
    return undefined;
}
