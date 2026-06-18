import { mockPrograms, mockSeasons } from '../mockData';

/**
 * OCR로 인식된 원본 텍스트를 비교하기 쉽게 깨끗하게 정제합니다.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, '') // 모든 공백 제거
    .replace(/[^\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '') // 특수문자 제거
    .replace(/쏠로/g, '솔로') // 흔한 한글 오타 보정
    .replace(/s0lo/g, 'solo') // 영문 숫자 혼용 오타 보정
    .replace(/돌싱글/g, '돌싱글즈');
}

export interface MatchResult {
  programSlug: string;
  seasonSlug: string;
  programTitle: string;
  confidence: number; // 0 ~ 100
}

/**
 * 추출된 정제 텍스트를 프로그램 사전(aliases)과 대조하여 최적의 매칭 결과를 반환합니다.
 */
export function matchProgramAndSeason(rawText: string): MatchResult | null {
  const cleanText = normalizeText(rawText);
  if (!cleanText) return null;

  let bestMatch: MatchResult | null = null;
  let highestConfidence = 0;

  // 1. 기수/시즌 숫자 패턴 추출 (예: "31기", "31시즌", "28", "시즌2")
  const numberRegex = /(\d+)(?:기|시즌|회)?/;
  const numberMatch = rawText.match(numberRegex);
  const detectedNumber = numberMatch ? numberMatch[1] : '';

  // 2. 프로그램 사전 순회 대조
  for (const program of mockPrograms) {
    for (const alias of program.aliases) {
      const cleanAlias = normalizeText(alias);
      
      // 프로그램명이 포함되어 있는지 검사
      if (cleanText.includes(cleanAlias)) {
        let confidence = 60; // 이름이 들어가면 기본 60점 부여

        // 시즌 숫자까지 일치하는지 검사
        const matchedSeason = mockSeasons.find(
          (s) => s.programId === program.id && s.slug === detectedNumber
        );

        if (matchedSeason) {
          confidence = 98; // 기수까지 정확히 일치하면 98점 부여
          
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              programSlug: program.slug,
              seasonSlug: matchedSeason.slug,
              programTitle: `${program.title} ${matchedSeason.slug}기`,
              confidence: confidence
            };
          }
        } else {
          // 기수는 불확실하지만 프로그램만 일치할 때
          // 기본적으로 등록된 최신 기수(31기)를 타겟으로 잡고 점수를 75점으로 부여
          const defaultSeason = mockSeasons.find((s) => s.programId === program.id) || mockSeasons[0];
          confidence = 75;

          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              programSlug: program.slug,
              seasonSlug: defaultSeason.slug,
              programTitle: `${program.title} (${defaultSeason.slug}기 추천)`,
              confidence: confidence
            };
          }
        }
      }
    }
  }

  return bestMatch;
}
