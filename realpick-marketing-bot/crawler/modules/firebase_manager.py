"""
Firebase 관리 모듈
Firestore DB 연동 및 데이터 저장 기능을 담당합니다.
리얼픽 표준 미션 데이터 구조를 지원합니다.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import sys
from collections import Counter
from typing import Optional

class FirebaseManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseManager, cls).__new__(cls)
            cls._instance.db = cls._instance._initialize_firebase()
        return cls._instance

    def _initialize_firebase(self):
        """Firebase 초기화 및 DB 객체 반환"""
        try:
            if not firebase_admin._apps:
                cert_data = None

                # 1순위: firebase-key.json 파일
                key_paths = [
                    "firebase-key.json",
                    os.path.join(os.getcwd(), "firebase-key.json"),
                    os.path.join(os.path.dirname(__file__), '..', 'firebase-key.json'),
                ]
                for path in key_paths:
                    if os.path.exists(path):
                        with open(path, 'r', encoding='utf-8') as f:
                            cert_data = json.load(f)
                        break

                # 2순위: 환경변수 (bridge.py 실행 시 .env.local 로드됨)
                if not cert_data:
                    project_id = os.environ.get('FIREBASE_PROJECT_ID')
                    client_email = os.environ.get('FIREBASE_CLIENT_EMAIL')
                    private_key_raw = os.environ.get('FIREBASE_PRIVATE_KEY')
                    if project_id and client_email and private_key_raw:
                        private_key = private_key_raw.replace('\\n', '\n')
                        cert_data = {
                            "type": "service_account",
                            "project_id": project_id,
                            "private_key_id": "env",
                            "private_key": private_key,
                            "client_email": client_email,
                            "client_id": "",
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token",
                        }

                if cert_data:
                    cred = credentials.Certificate(cert_data)
                    firebase_admin.initialize_app(cred)
                else:
                    print("[Firebase] 인증 정보 없음 - Firestore 연결 건너뜀", file=sys.stderr)
                    return None

            return firestore.client()
        except Exception as e:
            print(f"❌ Firebase 초기화 오류: {str(e)}", file=sys.stderr)
            return None

    def save_mission(self, mission_data):
        """Firestore의 'missions1' 컬렉션에 리얼픽 표준 규격으로 데이터 저장"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
            
        try:
            doc_ref = self.db.collection('missions1').document()
            mission_data['createdAt'] = firestore.SERVER_TIMESTAMP
            mission_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            # 가짜여부 필드 기본값 설정 (AI 생성이면 True)
            if 'isBot' not in mission_data:
                mission_data['isBot'] = False
            doc_ref.set(mission_data)
            return True, doc_ref.id
        except Exception as e:
            return False, str(e)

    def save_fake_user(self, user_data):
        """Firestore의 'users' 컬렉션에 가짜 유저 저장 (역할 및 전담 프로그램 포함)"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            uid = user_data.get('uid')
            if uid:
                doc_ref = self.db.collection('users').document(uid)
            else:
                doc_ref = self.db.collection('users').document()
                user_data['uid'] = doc_ref.id
            
            user_data['createdAt'] = firestore.SERVER_TIMESTAMP
            user_data['isBot'] = True
            # 기본값 설정
            if 'role' not in user_data: user_data['role'] = 'PICKER'
            if 'mainProgram' not in user_data: user_data['mainProgram'] = None
            
            doc_ref.set(user_data)
            return True, user_data['uid']
        except Exception as e:
            return False, str(e)

    def save_dealer(self, dealer_data):
        """Firestore의 'dealers' 컬렉션에 딜러(유튜버 채널) 정보 저장"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            # 채널명을 document ID로 사용
            channel_name = dealer_data.get('channelName')
            if not channel_name:
                return False, "채널명이 없습니다."
            
            doc_ref = self.db.collection('dealers').document(channel_name)
            
            # 이미 존재하는지 확인 (중복 방지)
            existing = doc_ref.get()
            if existing.exists:
                # 이미 있으면 업데이트만
                doc_ref.update({
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
                return True, f"{channel_name} (기존 딜러)"
            
            # 새로 추가
            dealer_data['createdAt'] = firestore.SERVER_TIMESTAMP
            dealer_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            doc_ref.set(dealer_data)
            return True, channel_name
        except Exception as e:
            return False, str(e)

    def create_notification(self, notification_data):
        """Firestore의 'notifications' 컬렉션에 알림 생성"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            doc_ref = self.db.collection('notifications').document()
            notification_data['createdAt'] = firestore.SERVER_TIMESTAMP
            notification_data['read'] = False
            doc_ref.set(notification_data)
            return True, doc_ref.id
        except Exception as e:
            return False, str(e)
    
    def create_notification_for_all_users(self, notification_data):
        """모든 사용자에게 알림 생성 (알림 배지 표시용)"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            # 모든 사용자 가져오기
            users_ref = self.db.collection('users').limit(1000)  # 최대 1000명
            users = list(users_ref.stream())
            
            if not users:
                return False, "사용자가 없습니다."
            
            success_count = 0
            error_count = 0
            
            # 각 사용자에게 알림 생성
            for user_doc in users:
                try:
                    user_data = user_doc.to_dict()
                    user_id = user_doc.id  # document ID가 userId
                    
                    # 각 사용자별 알림 데이터 생성
                    user_notification = notification_data.copy()
                    user_notification['userId'] = user_id
                    user_notification['isRead'] = False  # 반드시 false
                    user_notification['createdAt'] = firestore.SERVER_TIMESTAMP
                    
                    # notifications 컬렉션에 저장
                    notif_ref = self.db.collection('notifications').document()
                    notif_ref.set(user_notification)
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    continue
            
            return True, f"{success_count}명에게 알림 생성 완료 (실패: {error_count}명)"
        except Exception as e:
            return False, str(e)

    def get_all_missions(self):
        """저장된 모든 미션 불러오기 (missions1 컬렉션에서, document ID 포함)"""
        if not self.db:
            return []
        try:
            missions_ref = self.db.collection('missions1').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(100)
            missions = []
            for doc in missions_ref.stream():
                mission_data = doc.to_dict()
                mission_data['_id'] = doc.id  # document ID 추가
                missions.append(mission_data)
            return missions
        except Exception:
            # 정렬 오류 시 그냥 가져오기
            missions = []
            for doc in self.db.collection('missions1').limit(100).stream():
                mission_data = doc.to_dict()
                mission_data['_id'] = doc.id
                missions.append(mission_data)
            return missions
    
    def get_all_users(self):
        """모든 유저 불러오기 (users 컬렉션에서)"""
        if not self.db:
            return []
        try:
            users_ref = self.db.collection('users').limit(1000)
            users = []
            for doc in users_ref.stream():
                user_data = doc.to_dict()
                user_data['_id'] = doc.id  # document ID 추가
                users.append(user_data)
            return users
        except Exception as e:
            return []
    
    def update_mission_votes(self, mission_id, option_index, user_id):
        """
        미션 투표 업데이트 (2단계 방식)
        1. 중복 확인 및 pickresult1에 투표 저장
        2. missions1의 optionVoteCounts, participants, stats.totalVotes 증가
        """
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            # 1단계: 미션 정보 가져오기 및 중복 확인
            mission_ref = self.db.collection('missions1').document(mission_id)
            mission_doc = mission_ref.get()
            
            if not mission_doc.exists:
                return False, "미션이 존재하지 않습니다."
            
            mission_data = mission_doc.to_dict() or {}
            
            # 중복 투표 확인
            existing_pick = list(self.db.collection('pickresult1')\
                .where('missionId', '==', mission_id)\
                .where('userId', '==', user_id)\
                .limit(1).stream())
            
            if len(existing_pick) > 0:
                return False, "이미 투표한 유저입니다."
            
            # 선택지 유효성 확인
            options = mission_data.get('options', [])
            if option_index < 0 or option_index >= len(options):
                return False, "선택지가 유효하지 않습니다."
            
            option_value = options[option_index]
            
            # 2단계: pickresult1에 투표 저장 (choice 필드 사용)
            pick_data = {
                'missionId': mission_id,
                'userId': user_id,
                'choice': option_value,  # 옵션 텍스트로 저장 (기존 시스템과 일치)
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            self.db.collection('pickresult1').add(pick_data)
            
            # 3단계: missions1 통계 업데이트
            # 먼저 최신 데이터를 다시 가져오기 (동시성 문제 방지)
            mission_doc = mission_ref.get()
            mission_data = mission_doc.to_dict() or {}
            
            # optionVoteCounts 전체 객체 가져와서 업데이트
            option_vote_counts = mission_data.get('optionVoteCounts', {})
            
            # 옵션 텍스트를 키로 사용 (기존 시스템과 일치)
            # 모든 선택지에 대해 초기화 (없으면 0으로)
            for opt in options:
                if opt not in option_vote_counts:
                    option_vote_counts[opt] = 0
            
            # 현재 선택된 옵션의 카운트 증가
            current_option_count = int(option_vote_counts.get(option_value, 0))
            option_vote_counts[option_value] = current_option_count + 1
            
            print(f"✅ 투표 업데이트: {option_value} = {option_vote_counts[option_value]}", file=sys.stderr)
            
            # participants와 totalVotes 증가
            current_participants = int(mission_data.get('participants', 0))
            stats = mission_data.get('stats', {})
            current_total_votes = int(stats.get('totalVotes', 0))
            
            # 업데이트 데이터 구성 (전체 optionVoteCounts 객체 저장)
            update_data = {
                'optionVoteCounts': option_vote_counts,
                'participants': current_participants + 1,
                'stats': {'totalVotes': current_total_votes + 1},
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            mission_ref.update(update_data)
            
            print(f"✅ 투표 완료!", file=sys.stderr)
            print(f"   미션 ID: {mission_id}", file=sys.stderr)
            print(f"   유저 ID: {user_id}", file=sys.stderr)
            print(f"   선택지: {option_index} ({option_value})", file=sys.stderr)
            print(f"   선택지 투표수: {current_option_count}표 → {option_vote_counts[option_value]}표", file=sys.stderr)
            print(f"   총 참여자: {current_participants}명 → {current_participants + 1}명", file=sys.stderr)
            print(f"   총 투표수: {current_total_votes}표 → {current_total_votes + 1}표", file=sys.stderr)
            print(f"   전체 optionVoteCounts: {option_vote_counts}", file=sys.stderr)
            
            return True, f"투표 완료: {option_value}"
            
        except Exception as e:
            print(f"❌ 투표 실패: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return False, f"투표 실패: {str(e)}"
    
    def get_bot_picks(self, limit=100):
        """가짜 유저들의 픽 조회 (pickresult1 컬렉션에서)"""
        if not self.db:
            return []
        try:
            # 가짜 유저 목록 가져오기
            bot_users = self.db.collection('users').where('isBot', '==', True).stream()
            bot_user_ids = [doc.id for doc in bot_users]
            
            if not bot_user_ids:
                return []
            
            # 가짜 유저들의 픽 조회 (userId로 필터링)
            picks = []
            for user_id in bot_user_ids[:100]:  # 최대 100명의 봇 유저
                user_picks = self.db.collection('pickresult1').where('userId', '==', user_id).limit(limit).stream()
                for doc in user_picks:
                    pick_data = doc.to_dict()
                    pick_data['_id'] = doc.id
                    pick_data['isBot'] = True  # 조회 시에만 표시
                    picks.append(pick_data)
            
            # 생성 시간 기준 정렬
            picks.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            return picks[:limit]
        except Exception as e:
            return []
    
    def get_mission_pick_count(self, mission_id):
        """특정 미션의 실제 픽 개수 조회 (pickresult1 컬렉션에서)"""
        if not self.db:
            return 0
        try:
            picks_ref = self.db.collection('pickresult1').where('missionId', '==', mission_id)
            picks = list(picks_ref.stream())
            return len(picks)
        except Exception as e:
            return 0

    def recount_mission_votes(self, mission_id):
        """pickresult1 기준으로 미션의 투표 집계 재계산"""
        if not self.db:
            return False
        try:
            picks_ref = self.db.collection('pickresult1').where('missionId', '==', mission_id)
            picks = list(picks_ref.stream())
            if not picks:
                return True

            counts = Counter()
            for doc in picks:
                data = doc.to_dict()
                idx = str(data.get('optionIndex', ''))
                counts[idx] += 1

            participants = len(picks)
            total_votes = sum(counts.values())

            mission_ref = self.db.collection('missions1').document(mission_id)
            mission_ref.update({
                'optionVoteCounts': dict(counts),
                'participants': participants,
                'stats': {'totalVotes': total_votes},
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            print(f"🔄 미션 재집계 완료: {mission_id}")
            print(f"   optionVoteCounts: {dict(counts)}")
            print(f"   참여자: {participants}명, 총 투표: {total_votes}표")
            return True
        except Exception:
            return False
    
    def update_mission(self, mission_id, update_data):
        """미션 정보 업데이트 (제목, 설명, 마감일, 선택지 등)"""
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        try:
            mission_ref = self.db.collection('missions1').document(mission_id)
            mission_doc = mission_ref.get()
            
            if not mission_doc.exists:
                return False, "미션이 존재하지 않습니다."
            
            # 선택지가 변경되면 optionVoteCounts도 재설정
            if 'options' in update_data:
                new_options = update_data['options']
                if isinstance(new_options, list):
                    # 새로운 선택지 개수에 맞게 optionVoteCounts 초기화
                    update_data['optionVoteCounts'] = {str(i): 0 for i in range(len(new_options))}
            
            # updatedAt 자동 추가
            update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            mission_ref.update(update_data)
            return True, "미션 정보가 업데이트되었습니다."
        except Exception as e:
            return False, f"업데이트 실패: {str(e)}"
    
    def get_mission(self, mission_id):
        """특정 미션 정보 가져오기"""
        if not self.db:
            return None
        try:
            mission_ref = self.db.collection('missions1').document(mission_id)
            mission_doc = mission_ref.get()
            if mission_doc.exists:
                mission_data = mission_doc.to_dict()
                mission_data['_id'] = mission_doc.id
                return mission_data
            return None
        except Exception:
            return None
    
    def save_recruit(self, recruit_data):
        """
        Firestore의 'recruits' 컬렉션에 모집 공고 데이터 저장
        Args:
            recruit_data: 모집 공고 데이터 (JSON Schema 규격)
        Returns:
            (성공 여부, 문서 ID 또는 오류 메시지)
        """
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        
        try:
            # 필수 필드 검증
            required_fields = ['programId', 'category', 'type', 'title', 'startDate', 'endDate']
            for field in required_fields:
                if field not in recruit_data:
                    return False, f"필수 필드가 없습니다: {field}"
            
            # 문서 생성
            doc_ref = self.db.collection('recruits').document()
            
            # 타임스탬프 추가
            recruit_data['createdAt'] = firestore.SERVER_TIMESTAMP
            recruit_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            # isVerified는 반드시 False로 설정 (관리자 승인 대기)
            recruit_data['isVerified'] = False
            
            # source 필드 확인
            if 'source' not in recruit_data:
                recruit_data['source'] = 'crawled'
            
            # 저장
            doc_ref.set(recruit_data)
            
            return True, doc_ref.id
            
        except Exception as e:
            return False, str(e)
    
    def get_recruits(self, is_verified: Optional[bool] = None, limit: int = 100):
        """
        모집 공고 목록 조회
        Args:
            is_verified: 승인 여부 필터 (None이면 전체)
            limit: 최대 개수
        Returns:
            모집 공고 리스트
        """
        if not self.db:
            return []
        
        try:
            query = self.db.collection('recruits')
            
            # 승인 여부 필터
            if is_verified is not None:
                query = query.where('isVerified', '==', is_verified)
            
            # 생성일 기준 내림차순 정렬
            query = query.order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
            
            recruits = []
            for doc in query.stream():
                recruit_data = doc.to_dict()
                recruit_data['_id'] = doc.id
                recruits.append(recruit_data)
            
            return recruits
            
        except Exception as e:
            print(f"모집 공고 조회 오류: {e}")
            return []
    
    def update_recruit_verification(self, recruit_id: str, is_verified: bool):
        """
        모집 공고 승인 상태 업데이트
        Args:
            recruit_id: 모집 공고 문서 ID
            is_verified: 승인 여부
        Returns:
            (성공 여부, 메시지)
        """
        if not self.db:
            return False, "DB가 연결되지 않았습니다."
        
        try:
            recruit_ref = self.db.collection('recruits').document(recruit_id)
            recruit_doc = recruit_ref.get()
            
            if not recruit_doc.exists:
                return False, "모집 공고를 찾을 수 없습니다."
            
            recruit_ref.update({
                'isVerified': is_verified,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            return True, "승인 상태가 업데이트되었습니다."
            
        except Exception as e:
            return False, str(e)