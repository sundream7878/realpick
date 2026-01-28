"""
미션 생성 및 관리 모듈
AI 분석 결과를 바탕으로 리얼픽 앱용 미션을 생성하고 관리합니다.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class MissionGenerator:
    """미션 생성 및 관리 클래스"""
    
    def __init__(self):
        self.missions = []
        self.approved_missions = []
    
    def create_mission_from_analysis(self, analysis_result: Dict) -> Dict:
        """AI 분석 결과로부터 미션 객체 생성"""
        
        mission = {
            'id': str(uuid.uuid4()),
            'title': analysis_result['mission_title'],
            'description': analysis_result['mission_description'],
            'options': analysis_result['options'],
            'kind': 'predict' if '예측' in analysis_result['mission_title'] else 'majority',
            'form': 'multi' if len(analysis_result['options']) > 2 else 'binary',
            'category': self._determine_category(analysis_result['source_video']['channel_title']),
            'show_id': self._determine_show_id(analysis_result['source_video']['channel_title']),
            'season_type': '전체',
            'deadline': (datetime.now() + timedelta(days=7)).isoformat(),
            'reveal_policy': 'realtime',
            'status': 'pending',  # pending, approved, rejected, published
            'created_at': datetime.now().isoformat(),
            'source_info': {
                'video_id': analysis_result['source_video'].get('video_id'),
                'video_title': analysis_result['source_video']['title'],
                'channel_name': analysis_result['source_video']['channel_title'],
                'video_url': f"https://youtube.com/watch?v={analysis_result['source_video'].get('video_id', '')}"
            },
            'ai_analysis': {
                'controversy_level': analysis_result['controversy_level'],
                'expected_participation': analysis_result['expected_participation'],
                'reasoning': analysis_result['reasoning'],
                'target_audience': analysis_result['target_audience']
            },
            'marketing_content': {
                'email_content': analysis_result.get('email_content', ''),
                'youtube_comment': analysis_result.get('youtube_comment', ''),
                'partner_email': self._extract_channel_email(analysis_result['source_video']['channel_title'])
            }
        }
        
        self.missions.append(mission)
        return mission
    
    def _determine_category(self, channel_name: str) -> str:
        """채널명으로 카테고리 결정"""
        if '나는솔로' in channel_name or '나솔' in channel_name:
            return 'dating'
        elif '돌싱글즈' in channel_name or '돌싱' in channel_name:
            return 'dating'
        elif '하트시그널' in channel_name:
            return 'dating'
        elif '환승연애' in channel_name:
            return 'dating'
        else:
            return 'entertainment'
    
    def _determine_show_id(self, channel_name: str) -> str:
        """채널명으로 프로그램 ID 결정"""
        if '나는솔로' in channel_name or '나솔' in channel_name:
            return 'nasolo'
        elif '돌싱글즈' in channel_name or '돌싱' in channel_name:
            return 'dolsingles'
        elif '하트시그널' in channel_name:
            return 'heartsignal'
        elif '환승연애' in channel_name:
            return 'transit_love'
        else:
            return 'other'
    
    def _extract_channel_email(self, channel_name: str) -> str:
        """채널명으로 이메일 추정 (실제로는 별도 DB에서 관리)"""
        # 실제 구현에서는 채널 정보 DB에서 이메일을 가져와야 함
        email_map = {
            '나는솔로': 'contact@nasolo.com',
            '돌싱글즈': 'business@dolsingles.com',
            '하트시그널': 'contact@heartsignal.com'
        }
        
        for key, email in email_map.items():
            if key in channel_name:
                return email
        
        return 'unknown@example.com'
    
    def approve_mission(self, mission_id: str) -> bool:
        """미션 승인"""
        for mission in self.missions:
            if mission['id'] == mission_id:
                mission['status'] = 'approved'
                mission['approved_at'] = datetime.now().isoformat()
                self.approved_missions.append(mission)
                return True
        return False
    
    def reject_mission(self, mission_id: str, reason: str = '') -> bool:
        """미션 거절"""
        for mission in self.missions:
            if mission['id'] == mission_id:
                mission['status'] = 'rejected'
                mission['rejected_at'] = datetime.now().isoformat()
                mission['rejection_reason'] = reason
                return True
        return False
    
    def publish_mission(self, mission_id: str) -> Dict:
        """승인된 미션을 리얼픽 앱에 게시"""
        for mission in self.approved_missions:
            if mission['id'] == mission_id:
                # 리얼픽 앱 DB 형식으로 변환
                app_mission = self._convert_to_app_format(mission)
                mission['status'] = 'published'
                mission['published_at'] = datetime.now().isoformat()
                mission['app_mission_id'] = app_mission['f_id']
                return app_mission
        return {}
    
    def _convert_to_app_format(self, mission: Dict) -> Dict:
        """마케팅 미션을 리얼픽 앱 DB 형식으로 변환"""
        app_mission = {
            'f_id': str(uuid.uuid4()),
            'f_title': mission['title'],
            'f_kind': mission['kind'],
            'f_form': mission['form'],
            'f_options': mission['options'],
            'f_category': mission['category'],
            'f_show_id': mission['show_id'],
            'f_season_type': mission['season_type'],
            'f_deadline': mission['deadline'],
            'f_reveal_policy': mission['reveal_policy'],
            'f_status': 'active',
            'f_created_at': datetime.now().isoformat(),
            'f_stats_participants': 0,
            'f_stats_total_votes': 0,
            'f_reference_url': mission['source_info']['video_url'],
            'f_created_by': 'marketing_automation'
        }
        return app_mission
    
    def get_pending_missions(self) -> List[Dict]:
        """승인 대기 중인 미션 목록"""
        return [m for m in self.missions if m['status'] == 'pending']
    
    def get_approved_missions(self) -> List[Dict]:
        """승인된 미션 목록"""
        return [m for m in self.missions if m['status'] == 'approved']
    
    def get_mission_stats(self) -> Dict:
        """미션 통계"""
        total = len(self.missions)
        pending = len([m for m in self.missions if m['status'] == 'pending'])
        approved = len([m for m in self.missions if m['status'] == 'approved'])
        rejected = len([m for m in self.missions if m['status'] == 'rejected'])
        published = len([m for m in self.missions if m['status'] == 'published'])
        
        return {
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'published': published
        }
    
    def batch_create_missions(self, analysis_results: Dict) -> List[Dict]:
        """여러 분석 결과로부터 미션 일괄 생성"""
        created_missions = []
        
        for channel_name, analyses in analysis_results.items():
            for analysis in analyses:
                mission = self.create_mission_from_analysis(analysis)
                created_missions.append(mission)
        
        return created_missions
    
    def export_missions(self, status_filter: str = None) -> List[Dict]:
        """미션 데이터 내보내기"""
        missions = self.missions
        
        if status_filter:
            missions = [m for m in missions if m['status'] == status_filter]
        
        return missions
    
    def save_missions(self, filename: str = None):
        """미션 데이터를 JSON 파일로 저장"""
        if filename is None:
            filename = f"missions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(f"data/{filename}", 'w', encoding='utf-8') as f:
                json.dump(self.missions, f, ensure_ascii=False, indent=2)
            print(f"미션 데이터 저장 완료: {filename}")
            
        except Exception as e:
            print(f"파일 저장 오류: {e}")
    
    def load_missions(self, filename: str):
        """JSON 파일에서 미션 데이터 로드"""
        try:
            with open(f"data/{filename}", 'r', encoding='utf-8') as f:
                self.missions = json.load(f)
            
            # 승인된 미션 목록 재구성
            self.approved_missions = [m for m in self.missions if m['status'] == 'approved']
            print(f"미션 데이터 로드 완료: {len(self.missions)}개 미션")
            
        except Exception as e:
            print(f"파일 로드 오류: {e}")


def main():
    """테스트용 메인 함수"""
    generator = MissionGenerator()
    
    # 샘플 분석 결과
    sample_analysis = {
        'mission_title': '영수-영희 커플, 이번 주에 고백할까?',
        'mission_description': '나솔 15기에서 가장 주목받는 커플의 관계 발전을 예측해보세요',
        'options': ['고백한다', '아직 이르다', '다른 사람 선택'],
        'controversy_level': '높음',
        'expected_participation': '높음',
        'reasoning': '시청자들이 가장 관심있어하는 커플',
        'target_audience': '20-30대 여성',
        'source_video': {
            'video_id': 'test123',
            'title': '나솔 15기 3화 리뷰',
            'channel_title': '나는솔로 공식'
        }
    }
    
    # 미션 생성
    mission = generator.create_mission_from_analysis(sample_analysis)
    print("생성된 미션:")
    print(json.dumps(mission, ensure_ascii=False, indent=2))
    
    # 통계 출력
    stats = generator.get_mission_stats()
    print(f"\n미션 통계: {stats}")

if __name__ == "__main__":
    main()
