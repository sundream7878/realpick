import google.generativeai as genai
import json
import re
import sys

class GeminiAnalyzer:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def analyze_with_transcript(self, video_info, transcript):
        """자막 내용을 바탕으로 리얼픽 규격 미션 생성"""
        # showId에서 category 추론
        show_name = video_info.get('title', '').lower()
        category = "LOVE"  # 기본값
        showId = "nasolo"  # 기본값
        
        # 키워드 기반 카테고리 및 프로그램 매핑
        if any(kw in show_name for kw in ['나는솔로', '나솔', '환승연애', '환글', '돌싱글즈', '솔로지옥', '끝사랑', '연애남매', '합숙맞선']):
            category = "LOVE"
            if '나는솔로' in show_name or '나솔' in show_name:
                showId = 'nasolo'
            elif '환승연애' in show_name or '환글' in show_name:
                showId = 'hwanseung4'
            elif '돌싱' in show_name:
                showId = 'dolsingles6'
            elif '솔로지옥' in show_name:
                showId = 'solojihuk5'
            elif '끝사랑' in show_name:
                showId = 'kkeut-sarang'
            elif '연애남매' in show_name:
                showId = 'yeonae-nammae'
            elif '합숙맞선' in show_name:
                showId = 'habsuk-matseon'
        elif any(kw in show_name for kw in ['최강야구', '골때녀', '골때리는', '강철부대', '피의게임', '대학전쟁', '흑백요리사', '뭉쳐야', '무쇠소녀', '노엑싯']):
            category = "VICTORY"
            if '최강야구' in show_name:
                showId = 'choegang-yagu-2025'
            elif '골때' in show_name:
                showId = 'goal-girls-8'
            elif '강철부대' in show_name:
                showId = 'steel-troops-w'
            elif '피의게임' in show_name:
                showId = 'blood-game3'
            elif '대학전쟁' in show_name:
                showId = 'univ-war2'
            elif '흑백요리사' in show_name:
                showId = 'culinary-class-wars2'
            elif '뭉쳐야' in show_name:
                showId = 'kick-together3'
            elif '무쇠소녀' in show_name:
                showId = 'iron-girls'
            elif '노엑싯' in show_name:
                showId = 'no-exit-gameroom'
        elif any(kw in show_name for kw in ['미스터트롯', '미스트롯', '현역가왕', '프로젝트7', '유니버스리그', '쇼미더머니', '쇼미', '싱어게인', '랩퍼블릭']):
            category = "STAR"
            if '미스터트롯' in show_name:
                showId = 'mr-trot3'
            elif '미스트롯' in show_name:
                showId = 'mistrot4'
            elif '현역가왕' in show_name:
                showId = 'active-king2'
            elif '프로젝트' in show_name:
                showId = 'project7'
            elif '유니버스리그' in show_name:
                showId = 'universe-league'
            elif '쇼미' in show_name:
                showId = 'show-me-the-money-12'
            elif '싱어게인' in show_name:
                showId = 'sing-again'
            elif '랩퍼블릭' in show_name:
                showId = 'rap-public'
        
        prompt = f"""
        당신은 예능 프로그램 전문 마케팅 분석가입니다. 
        제공된 유튜브 영상의 제목, 설명, 그리고 자막 내용을 분석하여 시청자들이 참여할 수 있는 '리얼픽(RealPick)' 미션 3개를 생성하세요.

        [리얼픽 미션 유형 가이드]
        1. 예측 픽 (kind: PREDICT) - "정답이 있는 게임"
           - 목적: 방송의 결과나 출연자의 선택을 맞히는 것.
           - 질문 예시: "~할까요?", "누가 선택될까요?"
           - 유형: Binary(예/아니오), Multi(3~5명 후보)

        2. 공감 픽 (kind: MAJORITY) - "정답 없는 의견"
           - 목적: 시청자들의 선호도, 트렌드, 여론 수집.
           - 질문 예시: "가장 응원하는 커플은?", "누구의 대처가 더 성숙했나요?"
           - 특징: 다수의 의견이 무엇인지 확인하는 재미.

        [영상 정보]
        - 제목: {video_info['title']}
        - 설명: {video_info.get('description', '없음')}
        - 자막 요약: {transcript[:3000]}... (중략)
        - 프로그램 카테고리: {category}
        - 프로그램 ID: {showId}

        [출력 형식 (JSON)]
        반드시 아래 형식을 지켜 JSON으로만 출력하세요:
        {{
          "missions": [
            {{
              "title": "미션 제목 (예: 영철은 영자에게 데이트 신청을 할까?)",
              "description": "미션 참여 독려 문구 (유머러스하고 재치있게)",
              "kind": "PREDICT 또는 MAJORITY",
              "form": "binary 또는 multiple",
              "options": ["재치있는 보기1", "재치있는 보기2", ...],
              "category": "{category}",
              "showId": "{showId}"
              (단순한 '예/아니오' 대신 영상의 분위기를 살린 재미있는 표현을 사용하세요. 
               예: '무조건 직진이다!' / '철벽 수비 예상..' / '아직은 간보는 중?')
            }}
          ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            # JSON 추출
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return None
        except Exception as e:
            print(f"❌ Gemini 분석 오류: {e}", file=sys.stderr)
            return None
