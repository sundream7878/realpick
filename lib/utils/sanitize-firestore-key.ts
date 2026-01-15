/**
 * Firestore 필드 키로 사용 가능하도록 옵션 이름을 안전하게 변환
 * Firestore에서는 . $ [ ] # / 등의 특수문자를 필드명에 사용할 수 없음
 */
export function sanitizeFieldKey(key: string): string {
  return key
    .replace(/\./g, '__dot__')
    .replace(/\$/g, '__dollar__')
    .replace(/\[/g, '__lbracket__')
    .replace(/\]/g, '__rbracket__')
    .replace(/#/g, '__hash__')
    .replace(/\//g, '__slash__');
}

/**
 * 변환된 필드 키를 원래 옵션 이름으로 복원
 */
export function desanitizeFieldKey(key: string): string {
  return key
    .replace(/__dot__/g, '.')
    .replace(/__dollar__/g, '$')
    .replace(/__lbracket__/g, '[')
    .replace(/__rbracket__/g, ']')
    .replace(/__hash__/g, '#')
    .replace(/__slash__/g, '/');
}

/**
 * optionVoteCounts 객체의 모든 키를 복원
 */
export function desanitizeVoteCounts(voteCounts: Record<string, any>): Record<string, any> {
  if (!voteCounts || typeof voteCounts !== 'object') return {};
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(voteCounts)) {
    const originalKey = desanitizeFieldKey(key);
    result[originalKey] = value;
  }
  return result;
}
