"""
방송국 모집 공고 AI 분석 모듈
크롤링한 원문 텍스트를 AI로 분석하여 JSON 구조로 가공합니다.
"""

import google.generativeai as genai
import json
import re
import os
import sys
from datetime import datetime
from typing import Dict, Optional


class RecruitAnalyzer:
    """방송국 모집 공고 데이터를 AI로 분석하여 JSON으로 변환하는 클래스"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        초기화
        Args:
            api_key: Gemini API 키 (없으면 환경변수에서 가져옴)
        """
        if api_key is None:
            api_key = os.getenv('GEMINI_API_KEY', '')
        
        if not api_key:
            raise ValueError("Gemini API 키가 필요합니다. 환경변수 GEMINI_API_KEY를 설정하거나 api_key 파라미터를 제공하세요.")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 프롬프트 파일 로드
        self.prompt_template = self._load_prompt_template()
    
    def _load_prompt_template(self) -> str:
        """프롬프트 템플릿 파일 로드"""
        prompt_paths = [
            "prompts/recruit_analyzer_prompt.txt",
            os.path.join(os.getcwd(), "prompts/recruit_analyzer_prompt.txt"),
            os.path.join(os.path.dirname(__file__), "..", "prompts/recruit_analyzer_prompt.txt")
        ]
        
        for path in prompt_paths:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
        
        # 파일이 없으면 기본 프롬프트 사용
        return self._get_default_prompt()
    
    def _get_default_prompt(self) -> str:
        """기본 프롬프트 반환"""
        return """🤖 리얼픽 캐스팅 데이터 가공 프롬프트
[Role]
당신은 방송국 모집 공고 전문 데이터 분석가입니다. 제공되는 원문 텍스트에서 필요한 정보를 추출하여 지정된 JSON 구조로 정제하는 것이 당신의 임무입니다.
[Task]
아래의 [Raw Text]를 분석하여 [JSON Schema] 규칙에 맞게 가공하세요.
[JSON Schema]
{  "programId": "string (제공된 프로그램 목록에서 가장 유사한 ID 선택)",  "category": "string (LOVE | VICTORY | STAR 중 선택)",  "type": "string (cast | audience)",  "title": "string (간결하고 명확한 공고 제목)",  "description": "string (공고 요약, 최대 50자)",  "target": "string (모집 대상 상세)",  "startDate": "string (YYYY-MM-DD, 본문에 없으면 오늘 날짜)",  "endDate": "string (YYYY-MM-DD, 상시모집이면 '2025-12-31')",  "officialUrl": "string (원문 링크)",  "thumbnailUrl": "string (이미지 URL이 있다면 추출, 없으면 null)",  "source": "crawled",  "isVerified": false}
[Value Mapping Rules]
category 선택 기준:
연애, 결혼, 커플: LOVE
서바이벌, 두뇌 게임, 운동, 경쟁: VICTORY
오디션, 가수 모집, 스타 발굴: STAR
type 선택 기준:
출연자, 참가자, 주인공 모집: cast
방청객, 현장 평가단, 시청자 위원: audience
programId 매핑 (중요):
나는 솔로 -> nasolo
돌싱글즈 -> dolsingles6
최강야구 -> choegang-yagu
미스터트롯 -> mr-trot3
(매칭되는 것이 없으면 가장 적절한 영문 ID를 새로 생성)
[Constraints]
출력은 오직 순수한 JSON 형식만 허용합니다. 추가 설명은 생략하세요.
날짜 형식을 반드시 지키세요.
제목에서 불필요한 특수문자나 [공지] 같은 머리말은 제거하세요.
[Raw Text]
{raw_text}"""
    
    def analyze(self, raw_text: str, official_url: str = "", thumbnail_url: str = "") -> Optional[Dict]:
        """
        원문 텍스트를 분석하여 JSON 구조로 변환
        
        Args:
            raw_text: 크롤링한 원문 텍스트 (제목 + 본문)
            official_url: 원문 링크 (선택)
            thumbnail_url: 썸네일 이미지 URL (선택)
        
        Returns:
            분석된 JSON 데이터 (Dict) 또는 None (실패 시)
        """
        if not raw_text or not raw_text.strip():
            return None
        
        # 프롬프트에 원문 삽입
        prompt = self.prompt_template.format(raw_text=raw_text)
        
        try:
            # AI 분석 요청
            response = self.model.generate_content(prompt)
            
            # JSON 추출 (마크다운 코드 블록 제거)
            response_text = response.text.strip()
            
            # JSON 부분만 추출
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if not json_match:
                print(f"❌ JSON을 찾을 수 없습니다. 응답: {response_text[:200]}")
                return None
            
            json_str = json_match.group(0)
            data = json.loads(json_str)
            
            # 필수 필드 검증 및 보정
            data = self._validate_and_fix_data(data, official_url, thumbnail_url)
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 오류: {e}")
            print(f"응답 텍스트: {response_text[:500] if 'response_text' in locals() else 'N/A'}")
            return None
        except Exception as e:
            print(f"❌ 분석 오류: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _validate_and_fix_data(self, data: Dict, official_url: str, thumbnail_url: str) -> Dict:
        """
        데이터 검증 및 보정
        
        Args:
            data: AI가 반환한 데이터
            official_url: 원문 링크
            thumbnail_url: 썸네일 URL
        
        Returns:
            보정된 데이터
        """
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 필수 필드 기본값 설정
        if 'programId' not in data or not data['programId']:
            data['programId'] = 'unknown'
        
        if 'category' not in data or data['category'] not in ['LOVE', 'VICTORY', 'STAR']:
            data['category'] = 'LOVE'  # 기본값
        
        if 'type' not in data or data['type'] not in ['cast', 'audience']:
            data['type'] = 'cast'  # 기본값
        
        if 'title' not in data or not data['title']:
            data['title'] = '모집 공고'
        
        if 'description' not in data:
            data['description'] = ''
        else:
            # 설명이 50자 초과하면 자르기
            data['description'] = data['description'][:50]
        
        if 'target' not in data:
            data['target'] = ''
        
        # 날짜 처리
        if 'startDate' not in data or not data['startDate']:
            data['startDate'] = today
        else:
            # 날짜 형식 검증 및 보정
            data['startDate'] = self._normalize_date(data['startDate'], today)
        
        if 'endDate' not in data or not data['endDate']:
            data['endDate'] = '2025-12-31'  # 상시모집 기본값
        else:
            data['endDate'] = self._normalize_date(data['endDate'], '2025-12-31')
        
        # URL 처리
        if official_url and ('officialUrl' not in data or not data['officialUrl']):
            data['officialUrl'] = official_url
        
        if thumbnail_url and ('thumbnailUrl' not in data or not data['thumbnailUrl']):
            data['thumbnailUrl'] = thumbnail_url
        elif 'thumbnailUrl' not in data:
            data['thumbnailUrl'] = None
        
        # 고정 필드
        data['source'] = 'crawled'
        data['isVerified'] = False
        
        return data
    
    def _normalize_date(self, date_str: str, default: str) -> str:
        """
        날짜 문자열을 YYYY-MM-DD 형식으로 정규화
        
        Args:
            date_str: 날짜 문자열
            default: 기본값
        
        Returns:
            정규화된 날짜 문자열
        """
        if not date_str:
            return default
        
        # 이미 YYYY-MM-DD 형식이면 그대로 반환
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
        
        # 다른 형식 파싱 시도
        try:
            # YYYY.MM.DD, YYYY/MM/DD 등
            date_str = date_str.replace('.', '-').replace('/', '-')
            parts = date_str.split('-')
            if len(parts) == 3:
                year, month, day = parts
                if len(year) == 4 and len(month) <= 2 and len(day) <= 2:
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        except:
            pass
        
        # 파싱 실패 시 기본값 반환
        return default
