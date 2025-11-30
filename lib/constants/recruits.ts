import { TShowCategory } from "./shows"

export type TRecruitType = "cast" | "audience" // 출연자 모집 | 방청 신청
export type TRecruitStatus = "open" | "upcoming" | "closed"

export interface TRecruit {
    id: string
    programId: string // shows.ts의 ID와 연동
    type: TRecruitType
    title: string
    description: string
    target: string // 모집 대상 (예: "결혼 적령기 남녀", "노래에 자신 있는 누구나")
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
    officialUrl?: string // 별도 URL이 없으면 프로그램 공식 URL 사용
}

// 모집 공고 데이터
export const RECRUITS: TRecruit[] = [
    // LOVE (로맨스)
    {
        id: "nasolo-30",
        programId: "nasolo",
        type: "cast",
        title: "나는 SOLO 30기 솔로남녀 모집",
        description: "결혼을 간절히 원하는 솔로라면 누구나 지원하세요!",
        target: "결혼 적령기 미혼 남녀",
        startDate: "2025-01-01",
        endDate: "2025-12-31", // 상시 모집
        officialUrl: "https://programs.sbs.co.kr/plus/iamsolo/main"
    },
    {
        id: "dolsingles-7",
        programId: "dolsingles6",
        type: "cast",
        title: "돌싱글즈 시즌7 출연자 모집",
        description: "한 번 다녀온 매력적인 돌싱들의 직진 로맨스",
        target: "이혼의 아픔을 딛고 새 사랑을 찾는 돌싱남녀",
        startDate: "2025-01-01",
        endDate: "2025-06-30",
        officialUrl: "https://www.mbn.co.kr/vod/programMain/966"
    },
    {
        id: "solojihuk-5",
        programId: "solojihuk4",
        type: "cast",
        title: "솔로지옥 시즌5 참가자 모집",
        description: "세상에서 가장 핫한 지옥, 솔로지옥으로 당신을 초대합니다.",
        target: "매력 넘치는 핫한 솔로 남녀",
        startDate: "2025-03-01",
        endDate: "2025-05-31",
        officialUrl: "https://www.netflix.com/kr/title/81436209"
    },

    // VICTORY (승부/생존)
    {
        id: "choegang-yagu-tryout",
        programId: "choegang-yagu",
        type: "cast",
        title: "최강야구 2026 시즌 트라이아웃",
        description: "최강 몬스터즈와 함께할 새로운 몬스터를 찾습니다.",
        target: "프로야구 은퇴 선수 및 대학/독립리그 선수",
        startDate: "2025-11-01",
        endDate: "2025-12-15", // 마감 임박 예시
        officialUrl: "https://tv.jtbc.co.kr/ckmonsters"
    },
    {
        id: "univ-war-3",
        programId: "univ-war2",
        type: "cast",
        title: "대학전쟁 시즌3 참가 대학 모집",
        description: "대한민국 최고 지성들의 두뇌 서바이벌",
        target: "국내외 명문대 재학생 팀 (4인 1팀)",
        startDate: "2025-01-01",
        endDate: "2025-03-31",
        officialUrl: "https://www.coupangplay.com/"
    },
    {
        id: "culinary-class-wars-3-audience",
        programId: "culinary-class-wars2",
        type: "audience",
        title: "흑백요리사 시즌3 현장 평가단 모집",
        description: "최고의 셰프들이 펼치는 요리 대결을 직접 맛보고 평가하세요!",
        target: "먹는 것에 진심인 미식가 누구나",
        startDate: "2025-02-01",
        endDate: "2025-02-28",
        officialUrl: "https://www.netflix.com/kr/title/81726701"
    },

    // STAR (오디션)
    {
        id: "mr-trot-4",
        programId: "mr-trot3",
        type: "cast",
        title: "미스터트롯4 차세대 트롯맨 모집",
        description: "대한민국을 뒤흔들 새로운 트롯 히어로의 탄생",
        target: "트롯을 사랑하는 대한민국 남성 누구나",
        startDate: "2025-06-01",
        endDate: "2025-08-31",
        officialUrl: "http://broadcast.tvchosun.com/broadcast/program/2/C202400150.cstv"
    },
    {
        id: "sing-again-4-audience",
        programId: "sing-again",
        type: "audience",
        title: "싱어게인4 파이널 방청 신청",
        description: "무명가수들의 감동적인 마지막 무대를 현장에서 함께하세요.",
        target: "음악을 사랑하는 시청자",
        startDate: "2025-11-20",
        endDate: "2025-12-05", // 마감 임박
        officialUrl: "https://tv.jtbc.co.kr/singagain3"
    },
    {
        id: "show-me-12",
        programId: "show-me-the-money",
        type: "cast",
        title: "쇼미더머니 12 래퍼 모집",
        description: "WHO IS THE NEXT KING?",
        target: "랩에 자신 있는 누구나",
        startDate: "2024-01-01",
        endDate: "2024-12-31", // 이미 마감된 예시
        officialUrl: "https://www.mnetplus.world/c/smtm11"
    }
]
