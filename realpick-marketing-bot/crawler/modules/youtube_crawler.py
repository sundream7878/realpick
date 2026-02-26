"""
YouTube 크롤링 모듈
유튜브 채널의 최신 영상 정보를 수집합니다.
"""

import os
import requests
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

class YouTubeCrawler:
    """YouTube API를 사용한 채널 크롤링 클래스"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.googleapis.com/youtube/v3"
        
        # 프로그램별 키워드 매핑 (정확한 필터링을 위해)
        self.program_keywords = {
            "나는솔로": ["나는솔로", "나솔", "I am SOLO", "아이엠솔로"],
            "나솔사계": ["나솔사계", "사랑은 계속된다"],
            "솔로지옥": ["솔로지옥", "Single's Inferno", "싱글즈 인페르노"],
            "환승연애": ["환승연애", "환연", "Transit Love", "트랜짓 러브"],
            "합숙맞선": ["합숙맞선"],
            "최강야구": ["최강야구", "몬스터즈", "김성근"],
            "골 때리는 그녀들": ["골때녀", "골 때리는 그녀들", "골때리는그녀들"],
            "뭉쳐야 찬다": ["뭉쳐야찬다", "뭉쳐야 찬다"],
            "미스터트롯": ["미스터트롯", "미스터 트롯", "Mr. Trot"],
            "현역가왕": ["현역가왕"],
            "쇼미더머니": ["쇼미더머니", "쇼미더머니12", "Show Me The Money", "SMTM"]
        }
    
    def is_relevant_video(self, video_info: Dict, search_keyword: str) -> bool:
        """영상이 검색 키워드와 관련이 있는지 확인 (제목, 설명, 자막 확인)"""
        title = video_info.get('title', '').lower()
        description = video_info.get('description', '').lower()
        
        # 검색 키워드에 해당하는 프로그램 키워드 목록 가져오기
        program_keywords_list = self.program_keywords.get(search_keyword, [search_keyword])
        
        # 제목이나 설명에 프로그램 키워드가 포함되어 있는지 확인
        for keyword in program_keywords_list:
            if keyword.lower() in title or keyword.lower() in description:
                # 다른 프로그램 키워드와 겹치지 않는지 확인
                # 예: "나는솔로"로 검색했는데 "솔로지옥"이 나오는 경우 방지
                if search_keyword == "나는솔로":
                    # "솔로지옥" 관련 키워드가 포함되어 있으면 제외
                    if any(kw in title or kw in description for kw in ["솔로지옥", "Single's Inferno", "싱글즈 인페르노"]):
                        return False
                elif search_keyword == "솔로지옥":
                    # "나는솔로" 관련 키워드가 포함되어 있으면 제외
                    if any(kw in title or kw in description for kw in ["나는솔로", "나솔", "I am SOLO"]):
                        return False
                return True
        
        return False
        
    def get_channel_id(self, channel_name: str) -> Optional[str]:
        """채널명으로 채널 ID 검색"""
        url = f"{self.base_url}/search"
        params = {
            'part': 'snippet',
            'q': channel_name,
            'type': 'channel',
            'key': self.api_key,
            'maxResults': 1
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if 'error' in data:
                import sys
                print(f"YouTube API 오류: {data['error'].get('message')}", file=sys.stderr)
                return None
                
            if 'items' in data and len(data['items']) > 0:
                return data['items'][0]['snippet']['channelId']
            return None
            
        except Exception as e:
            import sys
            print(f"채널 ID 검색 오류: {e}", file=sys.stderr)
            return None
    
    def get_recent_videos(self, channel_id: str, max_results: int = 10) -> List[Dict]:
        """채널의 최근 영상 목록 가져오기"""
        url = f"{self.base_url}/search"
        from datetime import timezone
        published_after = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
        params = {
            'part': 'snippet',
            'channelId': channel_id,
            'type': 'video',
            'order': 'date',
            'maxResults': max_results,
            'key': self.api_key,
            'publishedAfter': published_after
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            videos = []
            if 'items' in data:
                for item in data['items']:
                    video_id = item['id']['videoId']
                    video_info = {
                        'video_id': video_id,
                        'title': item['snippet']['title'],
                        'description': item['snippet']['description'],
                        'published_at': item['snippet']['publishedAt'],
                        'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                        'channel_title': item['snippet']['channelTitle'],
                        'video_url': f'https://www.youtube.com/watch?v={video_id}',
                        'channel_id': channel_id
                    }
                    
                    # 영상 상세 정보 가져오기
                    video_details = self.get_video_details(video_info['video_id'])
                    if video_details:
                        video_info.update(video_details)
                    
                    # 채널 정보 가져오기 (구독자 수 등)
                    channel_info = self.get_channel_info(channel_id)
                    if channel_info:
                        video_info['subscriber_count'] = channel_info.get('subscriber_count', '0')
                    else:
                        video_info['subscriber_count'] = '0'
                    
                    # 자막 여부 실제 체크
                    video_info['has_subtitle'] = self.check_subtitle_availability(video_id)
                    video_info['email'] = ''
                    
                    videos.append(video_info)
            
            return videos
            
        except Exception as e:
            import sys
            print(f"영상 목록 가져오기 오류: {e}", file=sys.stderr)
            return []
    
    def get_channel_info(self, channel_id: str) -> Optional[Dict]:
        """채널 정보 가져오기 (구독자 수 등)"""
        url = f"{self.base_url}/channels"
        params = {
            'part': 'statistics',
            'id': channel_id,
            'key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if 'items' in data and len(data['items']) > 0:
                item = data['items'][0]
                return {
                    'subscriber_count': item['statistics'].get('subscriberCount', '0')
                }
            return None
        except Exception as e:
            import sys
            print(f"채널 정보 가져오기 오류: {e}", file=sys.stderr)
            return None
    
    def get_video_details(self, video_id: str) -> Optional[Dict]:
        """영상 상세 정보 가져오기"""
        url = f"{self.base_url}/videos"
        params = {
            'part': 'statistics,contentDetails',
            'id': video_id,
            'key': self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if 'items' in data and len(data['items']) > 0:
                item = data['items'][0]
                return {
                    'view_count': item['statistics'].get('viewCount', '0'),
                    'like_count': item['statistics'].get('likeCount', '0'),
                    'comment_count': item['statistics'].get('commentCount', '0'),
                    'duration': item['contentDetails']['duration']
                }
            return None
            
        except Exception as e:
            import sys
            print(f"영상 상세 정보 오류: {e}", file=sys.stderr)
            return None
    
    def check_subtitle_availability(self, video_id: str) -> bool:
        """자막 존재 여부 확인 (자동생성 자막 포함)"""
        try:
            # 자막 목록 가져오기 시도
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # 한국어 자막 (수동 또는 자동생성) 확인
            try:
                # 수동 자막 우선
                transcript_list.find_transcript(['ko', 'kr'])
                return True
            except:
                pass
            
            # 자동생성 자막 확인
            try:
                transcript_list.find_generated_transcript(['ko', 'kr'])
                return True
            except:
                pass
                
            return False
        except (TranscriptsDisabled, NoTranscriptFound):
            return False
        except Exception as e:
            print(f"자막 확인 오류 (video_id: {video_id}): {e}", file=sys.stderr)
            return False
    
    def get_video_transcript(self, video_id: str) -> Optional[str]:
        """영상 자막 가져오기 (자동생성 자막 포함)"""
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript_data = None
            
            # 1순위: 한국어 수동 자막
            try:
                transcript = transcript_list.find_transcript(['ko', 'kr'])
                if not transcript.is_generated:
                    transcript_data = transcript.fetch()
            except:
                pass
            
            # 2순위: 한국어 자동생성 자막
            if not transcript_data:
                try:
                    transcript = transcript_list.find_generated_transcript(['ko', 'kr'])
                    transcript_data = transcript.fetch()
                except:
                    pass
            
            # 3순위: 영어 자막
            if not transcript_data:
                try:
                    transcript = transcript_list.find_transcript(['en'])
                    transcript_data = transcript.fetch()
                except:
                    pass
            
            # 4순위: 영어 자동생성 자막
            if not transcript_data:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    transcript_data = transcript.fetch()
                except:
                    pass
            
            if transcript_data:
                # 자막 텍스트 결합
                transcript_text = " ".join([t['text'] for t in transcript_data])
                return transcript_text
            
            return None
            
        except Exception as e:
            print(f"자막 가져오기 오류 (video_id: {video_id}): {e}", file=sys.stderr)
            return None
    
    def search_videos_by_keyword(self, keyword: str, max_results: int = 10, hours_back: int = 24) -> List[Dict]:
        """키워드로 영상 직접 검색 (채널 검색이 아닌 영상 검색)
        최근 24시간 이내 업로드된 영상 중 조회수 상위 영상 반환"""
        url = f"{self.base_url}/search"
        
        # 수집 버튼을 누른 시간으로부터 hours_back 시간 이내 (RFC 3339 형식: YYYY-MM-DDThh:mm:ssZ)
        # UTC 시간으로 변환하여 전송 (YouTube API는 UTC 기준)
        from datetime import timezone
        published_after = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # 더 많은 결과를 가져와서 조회수로 정렬하기 위해 maxResults를 늘림
        # YouTube API는 최대 50개까지 한 번에 가져올 수 있음
        search_max_results = min(max_results * 5, 50)  # 최소 5배, 최대 50개
        
        params = {
            'part': 'snippet',
            'q': keyword,
            'type': 'video',
            'order': 'date',  # 날짜 순으로 가져온 후 조회수로 정렬
            'maxResults': search_max_results,
            'key': self.api_key,
            'publishedAfter': published_after,
            'regionCode': 'KR',  # 한국 지역
            'relevanceLanguage': 'ko'  # 한국어 우선
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            # API 응답 전체 로그 출력 (문제 파악용)
            import sys
            print(f"DEBUG YouTube API Response for '{keyword}': {json.dumps(data)[:500]}...", file=sys.stderr)
            
            if 'error' in data:
                print(f"YouTube API 오류 (search_videos_by_keyword): {data['error'].get('message')}", file=sys.stderr)
                return []
                
            videos = []
            if 'items' in data:
                for item in data['items']:
                    video_id = item['id']['videoId']
                    channel_id = item['snippet']['channelId']
                    
                    video_info = {
                        'video_id': video_id,
                        'title': item['snippet']['title'],
                        'description': item['snippet']['description'],
                        'published_at': item['snippet']['publishedAt'],
                        'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                        'channel_title': item['snippet']['channelTitle'],
                        'video_url': f'https://www.youtube.com/watch?v={video_id}',
                        'channel_id': channel_id
                    }
                    
                    # 영상 상세 정보 가져오기
                    video_details = self.get_video_details(video_id)
                    if video_details:
                        video_info.update(video_details)
                    
                    # 채널 정보 가져오기 (구독자 수 등)
                    channel_info = self.get_channel_info(channel_id)
                    if channel_info:
                        video_info['subscriber_count'] = channel_info.get('subscriber_count', '0')
                    else:
                        video_info['subscriber_count'] = '0'
                    
                    # 자막 여부 실제 체크
                    video_info['has_subtitle'] = self.check_subtitle_availability(video_id)
                    video_info['email'] = ''
                    
                    # 키워드 관련성 확인 (제목, 설명 기반)
                    if not self.is_relevant_video(video_info, keyword):
                        print(f"[YouTube Crawler] 키워드 불일치 필터링: {video_info['title'][:50]}... (키워드: {keyword})", file=sys.stderr)
                        continue
                    
                    # 자막이 있는 경우 자막 내용도 확인
                    if video_info['has_subtitle']:
                        try:
                            transcript = self.get_video_transcript(video_id)
                            if transcript:
                                transcript_lower = transcript.lower()
                                program_keywords_list = self.program_keywords.get(keyword, [keyword])
                                # 자막에 키워드가 포함되어 있는지 확인
                                if not any(kw.lower() in transcript_lower for kw in program_keywords_list):
                                    print(f"[YouTube Crawler] 자막 내 키워드 부재 필터링: {video_info['title'][:50]}...", file=sys.stderr)
                                    continue
                        except Exception as e:
                            # 자막 확인 실패해도 계속 진행 (제목/설명 기반으로 이미 필터링됨)
                            print(f"[YouTube Crawler] 자막 확인 오류 (계속 진행): {e}", file=sys.stderr)
                    
                    videos.append(video_info)
            
            # 조회수 순으로 정렬 (내림차순)
            videos.sort(key=lambda x: int(x.get('view_count', 0)), reverse=True)
            
            # 상위 max_results개만 반환
            return videos[:max_results]
            
        except Exception as e:
            import sys
            print(f"키워드 검색 오류 ({keyword}): {e}", file=sys.stderr)
            return []
    
    def crawl_target_channels(self, channel_names: List[str]) -> Dict[str, List[Dict]]:
        """타겟 채널들의 최신 영상 크롤링"""
        results = {}
        
        for channel_name in channel_names:
            import sys
            print(f"크롤링 중: {channel_name}", file=sys.stderr)
            
            # 채널 ID 검색
            channel_id = self.get_channel_id(channel_name)
            if not channel_id:
                print(f"채널을 찾을 수 없습니다: {channel_name}", file=sys.stderr)
                continue
            
            # 최근 영상 가져오기
            videos = self.get_recent_videos(channel_id)
            results[channel_name] = videos
            
            print(f"완료: {channel_name} - {len(videos)}개 영상", file=sys.stderr)
        
        return results
    
    def save_crawl_results(self, results: Dict, filename: str = None):
        """크롤링 결과를 JSON 파일로 저장"""
        if filename is None:
            filename = f"crawl_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(f"data/{filename}", 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            import sys
            print(f"결과 저장 완료: {filename}", file=sys.stderr)
            
        except Exception as e:
            import sys
            print(f"파일 저장 오류: {e}", file=sys.stderr)


# 테스트용 타겟 채널 목록 (5개)
TARGET_CHANNELS = [
    "나는솔로",
    "돌싱글즈", 
    "하트시그널",
    "SBS Entertainment",
    "MBC Entertainment"
]

def main():
    """테스트용 메인 함수"""
    # API 키는 환경변수에서 가져오기
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        import sys
        print("YouTube API 키가 설정되지 않았습니다.", file=sys.stderr)
        return
    
    crawler = YouTubeCrawler(api_key)
    results = crawler.crawl_target_channels(TARGET_CHANNELS)
    crawler.save_crawl_results(results)

if __name__ == "__main__":
    main()
