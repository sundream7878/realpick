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
        # 제목, 설명, 자막을 모두 합쳐서 분석
        full_text = f"{video_info.get('title', '')} {video_info.get('description', '')} {transcript[:2000]}".lower()
        
        category = "LOVE"  # 기본값
        showId = "nasolo"  # 기본값
        
        # 키워드 기반 카테고리 및 프로그램 매핑 (우선순위 및 세밀한 분석)
        # 1. LOVE 카테고리
        if any(kw in full_text for kw in ['합숙맞선', '합숙 맞선']):
            category, showId = "LOVE", "habsuk-matseon"
        elif any(kw in full_text for kw in ['나솔사계', '나는 솔로 그 후', '사랑은 계속된다']):
            category, showId = "LOVE", "nasolsagye"
        elif any(kw in full_text for kw in ['나는솔로', '나는 솔로', 'i am solo', '나솔']):
            category, showId = "LOVE", "nasolo"
        elif any(kw in full_text for kw in ['환승연애', '환연', '환글']):
            category, showId = "LOVE", "hwanseung4"
        elif any(kw in full_text for kw in ['돌싱글즈', '돌싱']):
            category, showId = "LOVE", "dolsingles6"
        elif any(kw in full_text for kw in ['솔로지옥']):
            category, showId = "LOVE", "solojihuk5"
        elif any(kw in full_text for kw in ['끝사랑']):
            category, showId = "LOVE", "kkeut-sarang"
        elif any(kw in full_text for kw in ['연애남매']):
            category, showId = "LOVE", "yeonae-nammae"
            
        # 2. VICTORY 카테고리
        elif any(kw in full_text for kw in ['골때녀', '골 때리는 그녀들', '골때리는', 'fc탑걸', '발라드림', '액셔니스타', '구척장신', '개벤져스', '월드클라쓰']):
            category, showId = "VICTORY", "goal-girls-8"
        elif any(kw in full_text for kw in ['최강야구', '최강 몬스터즈']):
            category, showId = "VICTORY", "choegang-yagu-2025"
        elif any(kw in full_text for kw in ['강철부대']):
            category, showId = "VICTORY", "steel-troops-w"
        elif any(kw in full_text for kw in ['피의게임', '피의 게임']):
            category, showId = "VICTORY", "blood-game3"
        elif any(kw in full_text for kw in ['대학전쟁']):
            category, showId = "VICTORY", "univ-war2"
        elif any(kw in full_text for kw in ['흑백요리사']):
            category, showId = "VICTORY", "culinary-class-wars2"
        elif any(kw in full_text for kw in ['뭉쳐야찬다', '뭉쳐야 찬다', '뭉쳐야']):
            category, showId = "VICTORY", "kick-together3"
        elif any(kw in full_text for kw in ['무쇠소녀단', '무쇠소녀']):
            category, showId = "VICTORY", "iron-girls"
        elif any(kw in full_text for kw in ['노엑싯게임룸', '노엑싯']):
            category, showId = "VICTORY", "no-exit-gameroom"
            
        # 3. STAR 카테고리
        elif any(kw in full_text for kw in ['쇼미더머니', 'show me the money', 'smtm', '쇼미']):
            category, showId = "STAR", "show-me-the-money-12"
        elif any(kw in full_text for kw in ['미스터트롯']):
            category, showId = "STAR", "mr-trot3"
        elif any(kw in full_text for kw in ['미스트롯']):
            category, showId = "STAR", "mistrot4"
        elif any(kw in full_text for kw in ['현역가왕']):
            category, showId = "STAR", "active-king2"
        elif any(kw in full_text for kw in ['프로젝트7', 'project 7', '프로젝트']):
            category, showId = "STAR", "project7"
        elif any(kw in full_text for kw in ['유니버스리그', '유니버스 리그']):
            category, showId = "STAR", "universe-league"
        elif any(kw in full_text for kw in ['싱어게인']):
            category, showId = "STAR", "sing-again"
        elif any(kw in full_text for kw in ['랩퍼블릭']):
            category, showId = "STAR", "rap-public"
        
        prompt = f"""
        당신은 예능 프로그램 전문 마케팅 분석가입니다. 
        제공된 유튜브 영상의 제목, 설명, 그리고 자막 내용을 분석하여 시청자들이 참여할 수 있는 '리얼픽(RealPick)' 미션 3개를 생성하세요.

        [분석 지침]
        1. 현재 영상의 실제 프로그램이 무엇인지 자막과 내용을 통해 정확히 파악하세요.
        2. 만약 자막 내용이 '합숙맞선'에 관한 것이라면, 반드시 '합숙맞선' 프로그램으로 분류해야 합니다.
        3. 프로그램 카테고리({category})와 ID({showId})는 가이드일 뿐이며, 실제 내용과 다르다면 자막 내용을 우선하여 미션을 생성하세요.

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
            }}
          ]
        }}
        (단순한 '예/아니오' 대신 영상의 분위기를 살린 재미있는 표현을 사용하세요. 
         예: '무조건 직진이다!' / '철벽 수비 예상..' / '아직은 간보는 중?')
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
