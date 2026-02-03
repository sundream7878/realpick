import google.generativeai as genai
import json
import re
import sys

class GeminiAnalyzer:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def generate_viral_comment(self, post_content: str, post_title: str) -> str:
        """커뮤니티 게시글 내용을 분석하여 자연스러운 바이럴 댓글 생성"""
        prompt = f"""
        당신은 커뮤니티 활동이 활발한 일반 유저입니다. 
        아래의 커뮤니티 게시글을 읽고, 그 분위기에 맞춰 '리얼픽(RealPick)' 앱을 은근슬쩍 홍보하는 댓글을 생성하세요.

        [게시글 정보]
        제목: {post_title}
        내용: {post_content}

        [댓글 생성 지침]
        1. 광고처럼 보이면 절대 안 됩니다. (은밀함이 핵심)
        2. 게시글의 내용에 공감하거나 의견을 먼저 제시한 뒤, 자연스럽게 리얼픽을 언급하세요.
        3. 리얼픽을 언급할 때는 "여기 투표 결과 보니까...", "리얼픽에서 사람들 예측은 이렇더라", "나솔 투표는 리얼픽이 젤 정확한 듯" 같은 식으로 자연스럽게 말하세요.
        4. 댓글 마지막에 자연스럽게 리얼픽 링크(https://real-pick.com)를 포함하세요.
        5. 커뮤니티 말투(반말, 신조어 등)를 적절히 섞어서 사용하세요. (너무 딱딱하지 않게)
        6. 결과물은 오직 '댓글 내용'만 출력하세요.

        [댓글 예시]
        - "와 진짜 공감ㅋㅋ 근데 리얼픽 투표 보니까 영수 영숙 커플 안된다는 의견이 80% 넘던데 역시 사람 생각 다 똑같나봄 https://real-pick.com"
        - "이거 리얼픽에서 투표 올라왔길래 해봤는데 결과 보니까 대박이더라ㅋㅋ 함 가보셈 https://real-pick.com"
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini 바이럴 댓글 생성 오류: {e}", file=sys.stderr)
            return "댓글 생성 실패"

    def analyze_with_transcript(self, video_info: dict, transcript: str) -> dict:
        """영상 정보와 자막을 분석하여 미션 생성"""
        
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
        제공된 유튜브 영상의 제목, 설명, 그리고 자막 내용을 분석하여 시청자들이 참여할 수 있는 '리얼픽(RealPick)' 미션 1개를 생성하세요.

        [분석 지침]
        1. 현재 영상의 실제 프로그램이 무엇인지 자막과 내용을 통해 정확히 파악하세요.
        2. 만약 자막 내용이 '합숙맞선'에 관한 것이라면, 반드시 '합숙맞선' 프로그램으로 분류해야 합니다.
        3. 프로그램 카테고리({{category}})와 ID({{showId}})는 가이드일 뿐이며, 실제 내용과 다르다면 자막 내용을 우선하여 미션을 생성하세요.

        [리얼픽 미션 유형 가이드]
        1. 예측 픽 (kind: PREDICT) - "정답이 있는 게임"
           - 목적: 방송의 결과나 출연자의 선택을 맞히는 것.
           - 질문 예시: "~할까요?", "누가 선택될까요?", "최종 우승자는 누구?"
           - 유형: Binary(2개 선택지), Multi(3~5개 선택지)
           - **핵심 원칙: '누구'를 묻는 질문에는 반드시 구체적인 출연자 이름이나 대상이 답변 후보(options)가 되어야 합니다.**

        2. 공감 픽 (kind: MAJORITY) - "정답 없는 의견"
           - 목적: 시청자들의 선호도, 트렌드, 여론 수집.
           - 질문 예시: "가장 응원하는 커플은?", "누구의 대처가 더 성숙했나요?"
           - **핵심 원칙: 질문에서 묻는 대상과 답변 항목이 논리적으로 100% 일치해야 합니다.**

        [중요: 미션 생성 및 논리 지침]
        - **질문-답변 일치**: 질문이 "누구일까요?"인데 답변이 "놀라운 반전!" 같은 문장이면 안 됩니다. 반드시 "영수", "영숙" 등 구체적인 이름이 나와야 합니다.
        - **구체적 이름 추출**: 영상 제목, 설명, 자막에 등장하는 출연진 이름(예: 영철, 현숙, 상철 등)을 정확히 파악하여 선택지로 만드세요.
        - **어그로성 문장 금지**: 선택지에 감탄사나 추상적인 문장을 넣지 마세요. 유저가 명확하게 대상을 고를 수 있게 하세요.
        - **다양성**: 영상 내용을 분석하여 가장 흥미로운 1개의 미션을 생성하되, 매번 똑같은 형태가 반복되지 않도록 하세요.

        [영상 정보]
        - 제목: {{video_info['title']}}
        - 설명: {{video_info.get('description', '없음')}}
        - 자막 요약: {{transcript[:3000]}}... (중략)
        - 프로그램 카테고리: {{category}}
        - 프로그램 ID: {{showId}}

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
        
        [미션 유형 예시]
        - PREDICT + binary: "영수가 고백할까?" → "네, 고백한다!" / "아니요, 망설인다"
        - PREDICT + multiple: "최종 우승자는?" → "김철수" / "박영희" / "이민수" / "정수진"
        - MAJORITY + binary: "누구의 대처가 더 성숙했나?" → "영수" / "철수"
        - MAJORITY + multiple: "가장 어울리는 커플은?" → "영수-영희" / "철수-민지" / "동훈-수진"
        
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
