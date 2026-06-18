import { Program, Season, CastMember } from './types';

export const mockPrograms: Program[] = [
  {
    id: 'prog_nasolo',
    title: '나는 솔로',
    slug: 'nasolo',
    aliases: ['나는 SOLO', '나는솔로', '나는 solo', '나는 쏠로', 'nasolo', '솔로'],
  },
  {
    id: 'prog_dolsingles',
    title: '돌싱글즈',
    slug: 'dolsingles',
    aliases: ['돌싱글즈', 'dolsingles', '돌싱'],
  },
  {
    id: 'prog_transitlove',
    title: '환승연애',
    slug: 'transitlove',
    aliases: ['환승연애', '환승', 'transitlove'],
  }
];

export const mockSeasons: Season[] = [
  {
    id: 'season_nasolo_31',
    programId: 'prog_nasolo',
    title: '나는 솔로 31기',
    slug: '31',
    description: '사랑을 찾기 위해 모인 31기 솔로남녀들의 자기소개 특집',
  }
];

export const mockCastMembers: CastMember[] = [
  // 남자 출연자
  {
    id: 'cast_m_youngsu',
    seasonId: 'season_nasolo_31',
    displayName: '영수',
    genderGroup: 'male',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '대기업 연구원 출신, 운동을 사랑하는 열정남',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 34세 (1992년생)',
          '직업: IT 대기업 인공지능 분야 선임 연구원',
          '거주지: 경기도 판교'
        ]
      },
      {
        title: '취미 & 성격',
        items: [
          '주말마다 헬스와 크로스핏을 즐기는 운동 마니아',
          '한번 시작한 일은 끝을 보는 불도저 같은 추진력',
          '차분한 목소리와 대조되는 활발한 사교성'
        ]
      },
      {
        title: '자기소개 핵심 문장',
        items: [
          '"서로의 성장을 지켜봐 주고 자극을 줄 수 있는 평생의 파트너를 찾고 싶습니다."'
        ]
      }
    ]
  },
  {
    id: 'cast_m_youngho',
    seasonId: 'season_nasolo_31',
    displayName: '영호',
    genderGroup: 'male',
    profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '츤데레 매력의 반전 가득한 공무원',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 31세 (1995년생)',
          '직업: 서울시 교육청 7급 공무원',
          '거주지: 서울 마포구'
        ]
      },
      {
        title: '취미 & 성격',
        items: [
          '집에서 요리하고 맛집 탐방하는 정적인 라이프 선호',
          '겉은 무뚝뚝해 보이지만 알고 보면 다정한 츤데레',
          '일과 삶의 균형을 중요하게 생각하는 안정 지향형'
        ]
      }
    ]
  },
  {
    id: 'cast_m_youngsik',
    seasonId: 'season_nasolo_31',
    displayName: '영식',
    genderGroup: 'male',
    profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '웃음이 예쁜 긍정 에너지의 전문의',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 37세 (1989년생)',
          '직업: 재활의학과 전문의 (개원 준비 중)',
          '거주지: 대전광역시'
        ]
      },
      {
        title: '취미 & 성격',
        items: [
          '어쿠스틱 기타 연주와 인디 음악 감상',
          '언제나 긍정적이고 주변 사람을 배려하는 따뜻한 성품',
          '다정한 소통을 가장 중요하게 생각함'
        ]
      }
    ]
  },
  {
    id: 'cast_m_sangchul',
    seasonId: 'season_nasolo_31',
    displayName: '상철',
    genderGroup: 'male',
    profileImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '해외 유학파 출신의 스위트한 금융직',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 33세 (1993년생)',
          '직업: 외국계 자산운용사 애널리스트',
          '거주지: 서울 용산구'
        ]
      },
      {
        title: '가치관',
        items: [
          '미국 보스턴에서 대학을 졸업한 글로벌 인재',
          '연애에선 나이보다는 가치관과 대화 코드가 통하는 사람 선호',
          '쉬는 날 캠핑과 자연 속 힐링을 즐김'
        ]
      }
    ]
  },

  // 여자 출연자
  {
    id: 'cast_f_youngsuk',
    seasonId: 'season_nasolo_31',
    displayName: '영숙',
    genderGroup: 'female',
    profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '자아실현과 연애 둘 다 놓치지 않는 당찬 리더',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 29세 (1997년생)',
          '직업: 온라인 쇼핑몰 CEO 및 인플루언서',
          '거주지: 서울 강남구'
        ]
      },
      {
        title: '라이프 스타일',
        items: [
          '패션, 인테리어 디자인 기획 담당',
          '자기 관리에 철저하며 계획적으로 행동하는 편',
          '시원시원하고 털털한 걸크러시 성격'
        ]
      },
      {
        title: '자기소개 한마디',
        items: [
          '"서로의 삶에 긍정적인 영감을 주는 멋진 짝을 만나고 싶어요."'
        ]
      }
    ]
  },
  {
    id: 'cast_f_jungsook',
    seasonId: 'season_nasolo_31',
    displayName: '정숙',
    genderGroup: 'female',
    profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '단아한 매력의 중학교 교사',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 30세 (1996년생)',
          '직업: 국공립 중학교 수학교사',
          '거주지: 인천광역시'
        ]
      },
      {
        title: '성격 및 취미',
        items: [
          '차분하고 차분하며 경청하는 대화 스타일',
          '베이킹과 플로리스트 자격증 보유',
          '안정적인 삶 속에서 소소한 행복을 가꾸는 것을 좋아함'
        ]
      }
    ]
  },
  {
    id: 'cast_f_soonja',
    seasonId: 'season_nasolo_31',
    displayName: '순자',
    genderGroup: 'female',
    profileImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '활기차고 긍정적인 비타민 대기업 사원',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 28세 (1998년생)',
          '직업: 바이오 제약회사 연구기획 대리',
          '거주지: 충청북도 오송'
        ]
      },
      {
        title: '매력 포인트',
        items: [
          '팀원들 사이에서 늘 텐션 높은 비타민으로 통함',
          '주말 등산, 테니스 등 아웃도어 스포츠 취미',
          '솔직하고 애교 많은 성격'
        ]
      }
    ]
  },
  {
    id: 'cast_f_oksoon',
    seasonId: 'season_nasolo_31',
    displayName: '옥순',
    genderGroup: 'female',
    profileImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80',
    oneLineSummary: '도시적인 분위기의 세련된 마케터',
    officialClipUrl: 'https://www.youtube.com',
    contentBlocks: [
      {
        title: '기본 정보',
        items: [
          '나이: 32세 (1994년생)',
          '직업: 코스메틱 브랜드 마케팅 파트장',
          '거주지: 서울 마포구'
        ]
      },
      {
        title: '취미 & 가치관',
        items: [
          '미술관 관람 및 LP 음반 수집',
          '자기 일에 주체적이고 당당한 사람을 선호',
          '서로를 존중하고 개인의 시간을 인정해주는 성숙한 연애 지향'
        ]
      }
    ]
  }
];

export const mockAd: { imageUrl: string; linkUrl: string; title: string } = {
  title: '멀린 패밀리앱 광고',
  imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&h=200&q=80',
  linkUrl: 'https://real-pick.com/family',
};
