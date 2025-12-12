// 프로그램 데이터 타입 정의
export type TShowCategory = "LOVE" | "VICTORY" | "STAR" | "UNIFIED"

export interface TShow {
    id: string
    name: string
    displayName: string
    category: TShowCategory
    officialUrl?: string
    defaultThumbnail?: string // 기본 썸네일 경로 추가
}

// 프로그램 데이터
export const SHOWS: Record<TShowCategory, TShow[]> = {
    LOVE: [
        { id: "nasolo", name: "나는SOLO", displayName: "나는 SOLO (나는 솔로)", category: "LOVE", officialUrl: "https://prismstudios.sbs.co.kr/", defaultThumbnail: "/images/shows/nasolo.png" },
        { id: "nasolsagye", name: "나솔사계", displayName: "나솔사계", category: "LOVE", officialUrl: "https://programs.sbs.co.kr/plus/iamsolo_loveforever", defaultThumbnail: "/images/shows/nasolsagye.png" },
        { id: "dolsingles6", name: "돌싱글즈6", displayName: "돌싱글즈6", category: "LOVE", officialUrl: "https://www.mbn.co.kr/vod/programMain/966", defaultThumbnail: "/images/shows/dolsingles6.png" },
        { id: "solojihuk4", name: "솔로지옥4", displayName: "솔로지옥 시즌4", category: "LOVE", officialUrl: "https://www.netflix.com/kr/title/81436209", defaultThumbnail: "/images/shows/solojihuk4.png" },
        { id: "kkeut-sarang", name: "끝사랑", displayName: "끝사랑", category: "LOVE", officialUrl: "https://tv.jtbc.co.kr/lastlove", defaultThumbnail: "/images/shows/kkeut-sarang.png" },
        { id: "hwanseung", name: "환승연애", displayName: "환승연애", category: "LOVE", officialUrl: "https://www.tving.com/contents/P001724962", defaultThumbnail: "/images/shows/hwanseung.png" },

        { id: "yeonae-nammae", name: "연애남매", displayName: "연애남매", category: "LOVE", officialUrl: "https://tv.jtbc.co.kr/love_siblings", defaultThumbnail: "/images/shows/yeonae-nammae.png" },
    ],
    VICTORY: [
        { id: "choegang-yagu", name: "최강야구", displayName: "최강야구", category: "VICTORY", officialUrl: "https://tv.jtbc.co.kr/ckmonsters", defaultThumbnail: "/images/shows/choegang-yagu.png" },
        { id: "goal-girls", name: "골때리는그녀들", displayName: "골 때리는 그녀들", category: "VICTORY", officialUrl: "https://programs.sbs.co.kr/enter/goal", defaultThumbnail: "/images/shows/goal-girls.png" },
        { id: "steel-troops-w", name: "강철부대W", displayName: "강철부대W", category: "VICTORY", officialUrl: "https://www.ichannela.com/program/template/program_refinement.do?cateCode=0502&subCateCode=050236&pgm_id=WPG2140182D", defaultThumbnail: "/images/shows/steel-troops-w.png" },
        { id: "blood-game3", name: "피의게임3", displayName: "피의 게임 3", category: "VICTORY", officialUrl: "https://www.wavve.com/player/vod?programid=C9901_C99000000115", defaultThumbnail: "/images/shows/blood-game3.png" },
        { id: "univ-war2", name: "대학전쟁2", displayName: "대학전쟁 시즌2", category: "VICTORY", officialUrl: "https://www.coupangplay.com/", defaultThumbnail: "/images/shows/univ-war2.png" },
        { id: "culinary-class-wars2", name: "흑백요리사2", displayName: "흑백요리사 시즌2", category: "VICTORY", officialUrl: "https://www.netflix.com/kr/title/81726701", defaultThumbnail: "/images/shows/culinary-class-wars2.png" },
        { id: "kick-together3", name: "뭉쳐야찬다3", displayName: "뭉쳐야 찬다 3", category: "VICTORY", officialUrl: "https://tv.jtbc.co.kr/gentlemen3", defaultThumbnail: "/images/shows/kick-together3.png" },
        { id: "iron-girls", name: "무쇠소녀단", displayName: "무쇠소녀단", category: "VICTORY", officialUrl: "https://tvn.cjenm.com/ko/iron-girls/", defaultThumbnail: "/images/shows/iron-girls.png" },
    ],
    STAR: [
        { id: "mr-trot3", name: "미스터트롯3", displayName: "미스터트롯3", category: "STAR", officialUrl: "http://broadcast.tvchosun.com/broadcast/program/2/C202400150.cstv", defaultThumbnail: "/images/shows/mr-trot3.png" },
        { id: "active-king2", name: "현역가왕2", displayName: "현역가왕2", category: "STAR", officialUrl: "https://www.mbn.co.kr/vod/programMain/967", defaultThumbnail: "/images/shows/active-king2.png" },
        { id: "project7", name: "프로젝트7", displayName: "프로젝트 7", category: "STAR", officialUrl: "https://project7.jtbc.co.kr/", defaultThumbnail: "/images/shows/project7.png" },
        { id: "universe-league", name: "유니버스리그", displayName: "유니버스 리그", category: "STAR", officialUrl: "https://programs.sbs.co.kr/enter/universeleague", defaultThumbnail: "/images/shows/universe-league.png" },
        { id: "show-me-the-money", name: "쇼미더머니", displayName: "쇼미더머니", category: "STAR", officialUrl: "https://www.mnetplus.world/c/smtm11", defaultThumbnail: "/images/shows/show-me-the-money.png" },
        { id: "sing-again", name: "싱어게인", displayName: "싱어게인", category: "STAR", officialUrl: "https://tv.jtbc.co.kr/singagain3", defaultThumbnail: "/images/shows/sing-again.png" },
        { id: "rap-public", name: "랩퍼블릭", displayName: "랩:퍼블릭", category: "STAR", officialUrl: "https://www.tving.com/contents/P001763784", defaultThumbnail: "/images/shows/rap-public.png" },
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

    for (const category of Object.values(SHOWS)) {
        // 1. 정확 일치 우선 검색 (이름, 표시 이름, ID)
        let show = category.find(s => normalize(s.name) === target || normalize(s.displayName) === target || s.id === target)
        if (show) return show

        // 2. 포함 관계 검색 (target이 name에 포함되거나, name이 target에 포함되거나)
        // 예: "돌싱글즈" -> "돌싱글즈6" 찾기
        show = category.find(s => {
            const nName = normalize(s.name)
            const nDisplay = normalize(s.displayName)
            return nName.includes(target) || nDisplay.includes(target) || target.includes(nName)
        })
        if (show) return show
    }
    return undefined
}
