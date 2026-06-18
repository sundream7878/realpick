export interface Program {
  id: string;
  title: string;
  slug: string;
  aliases: string[];
  logoUrl?: string;
}

export interface Season {
  id: string;
  programId: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  description?: string;
}

export interface CastMember {
  id: string;
  seasonId: string;
  displayName: string; // 방송용 이름 (예: 영숙, 영수)
  genderGroup: 'male' | 'female';
  profileImageUrl?: string;
  oneLineSummary: string; // 한줄 요약
  officialClipUrl?: string; // 공식 자기소개 클립
  contentBlocks: ContentBlock[]; // 기획서의 자유 콘텐츠 블록 구조
}

export interface ContentBlock {
  title: string; // 블록 제목 (예: "직업 및 나이", "자기소개 멘트", "성격 및 취향")
  items: string[]; // 세부 항목들 (리스트 형태)
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
}
