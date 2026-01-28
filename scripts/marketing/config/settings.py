"""
설정 파일
API 키, 데이터베이스 연결 등 시스템 설정을 관리합니다.
"""

import os
from typing import List, Dict

# API 키 설정
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY', '')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# 이메일 설정
SENDER_EMAIL = os.getenv('SENDER_EMAIL', '')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD', '')
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587

# Supabase 설정 (리얼픽 앱과 동일한 DB 사용)
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

# 타겟 채널 설정
TARGET_CHANNELS = [
    {
        'name': '나는솔로',
        'keywords': ['나는솔로', '나솔', 'I am SOLO'],
        'category': 'dating',
        'show_id': 'nasolo',
        'priority': 'high'
    },
    {
        'name': '돌싱글즈',
        'keywords': ['돌싱글즈', '돌싱', 'Heart Signal'],
        'category': 'dating', 
        'show_id': 'dolsingles',
        'priority': 'high'
    },
    {
        'name': '하트시그널',
        'keywords': ['하트시그널', 'Heart Signal'],
        'category': 'dating',
        'show_id': 'heartsignal', 
        'priority': 'medium'
    },
    {
        'name': '환승연애',
        'keywords': ['환승연애', 'Transit Love'],
        'category': 'dating',
        'show_id': 'transit_love',
        'priority': 'medium'
    },
    {
        'name': '솔로지옥',
        'keywords': ['솔로지옥', 'Single\'s Inferno'],
        'category': 'dating',
        'show_id': 'singles_inferno',
        'priority': 'low'
    }
]

# 크롤링 설정
CRAWL_SETTINGS = {
    'max_videos_per_channel': 10,
    'days_back': 7,  # 며칠 전까지의 영상을 가져올지
    'min_views': 1000,  # 최소 조회수
    'exclude_shorts': True,  # 쇼츠 제외
    'crawl_interval_hours': 24  # 크롤링 주기 (시간)
}

# AI 분석 설정
AI_SETTINGS = {
    'min_controversy_score': 5,  # 최소 논쟁 점수 (1-10)
    'max_missions_per_video': 2,  # 영상당 최대 미션 수
    'preferred_mission_types': ['predict', 'majority'],
    'max_options_per_mission': 4,  # 미션당 최대 선택지 수
    'analysis_language': 'ko'  # 분석 언어
}

# 이메일 발송 설정
EMAIL_SETTINGS = {
    'batch_size': 10,  # 한 번에 보낼 이메일 수
    'delay_between_emails': 5,  # 이메일 간 지연 시간 (초)
    'follow_up_days': [3, 7, 14],  # 팔로우업 이메일 발송 일정
    'max_retries': 3  # 발송 실패 시 재시도 횟수
}

# 데이터 저장 설정
DATA_SETTINGS = {
    'backup_enabled': True,
    'backup_interval_days': 7,
    'max_backup_files': 30,
    'data_retention_days': 90
}

# 로깅 설정
LOGGING_SETTINGS = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file_enabled': True,
    'console_enabled': True
}

# Streamlit 앱 설정
STREAMLIT_SETTINGS = {
    'page_title': '리얼픽 마케팅 자동화',
    'page_icon': '🎯',
    'layout': 'wide',
    'theme': 'light'
}

def validate_settings() -> Dict[str, bool]:
    """설정 유효성 검사"""
    validation_results = {}
    
    # API 키 검사
    validation_results['youtube_api'] = bool(YOUTUBE_API_KEY)
    validation_results['gemini_api'] = bool(GEMINI_API_KEY)
    
    # 이메일 설정 검사
    validation_results['email_config'] = bool(SENDER_EMAIL and SENDER_PASSWORD)
    
    # Supabase 설정 검사
    validation_results['supabase_config'] = bool(SUPABASE_URL and SUPABASE_KEY)
    
    return validation_results

def get_missing_settings() -> List[str]:
    """누락된 설정 목록 반환"""
    missing = []
    
    if not YOUTUBE_API_KEY:
        missing.append('YOUTUBE_API_KEY')
    if not GEMINI_API_KEY:
        missing.append('GEMINI_API_KEY')
    if not SENDER_EMAIL:
        missing.append('SENDER_EMAIL')
    if not SENDER_PASSWORD:
        missing.append('SENDER_PASSWORD')
    if not SUPABASE_URL:
        missing.append('SUPABASE_URL')
    if not SUPABASE_KEY:
        missing.append('SUPABASE_KEY')
    
    return missing

def print_settings_status():
    """설정 상태 출력"""
    validation = validate_settings()
    missing = get_missing_settings()
    
    print("🔧 설정 상태:")
    print(f"  YouTube API: {'✅' if validation['youtube_api'] else '❌'}")
    print(f"  Gemini API: {'✅' if validation['gemini_api'] else '❌'}")
    print(f"  이메일 설정: {'✅' if validation['email_config'] else '❌'}")
    print(f"  Supabase 설정: {'✅' if validation['supabase_config'] else '❌'}")
    
    if missing:
        print(f"\n⚠️ 누락된 환경변수: {', '.join(missing)}")
        print("환경변수를 설정해주세요.")
    else:
        print("\n✅ 모든 설정이 완료되었습니다!")

if __name__ == "__main__":
    print_settings_status()
