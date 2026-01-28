"""
이메일 발송 모듈
파트너십 제안 이메일을 자동으로 발송합니다.
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List, Optional
from datetime import datetime
import json

class EmailSender:
    """이메일 발송 클래스"""
    
    def __init__(self, smtp_server: str = "smtp.gmail.com", smtp_port: int = 587):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.email = os.getenv('SENDER_EMAIL')
        self.password = os.getenv('SENDER_PASSWORD')
        self.sent_emails = []
    
    def create_partnership_email(self, mission_info: Dict, recipient_info: Dict) -> MIMEMultipart:
        """파트너십 제안 이메일 생성"""
        
        msg = MIMEMultipart()
        msg['From'] = self.email
        msg['To'] = recipient_info['email']
        msg['Subject'] = f"🎯 리얼픽 파트너십 제안 - {mission_info['title']}"
        
        # 이메일 본문 HTML
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; }}
                .mission-box {{ background: white; padding: 20px; margin: 20px 0; 
                               border-left: 4px solid #667eea; border-radius: 5px; }}
                .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
                .stat-item {{ text-align: center; }}
                .stat-number {{ font-size: 24px; font-weight: bold; color: #667eea; }}
                .cta-button {{ background: #667eea; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block; 
                              margin: 20px 0; }}
                .footer {{ background: #333; color: white; padding: 20px; text-align: center; 
                          border-radius: 0 0 10px 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 리얼픽 파트너십 제안</h1>
                    <p>귀하의 콘텐츠가 화제가 되었습니다!</p>
                </div>
                
                <div class="content">
                    <h2>안녕하세요, {recipient_info['channel_name']} 님!</h2>
                    
                    <p>리얼픽 팀입니다. 귀하의 최근 영상 <strong>"{mission_info['source_info']['video_title']}"</strong>이 
                    저희 플랫폼에서 큰 관심을 받고 있어 연락드립니다.</p>
                    
                    <div class="mission-box">
                        <h3>🎮 생성된 미션</h3>
                        <h4>{mission_info['title']}</h4>
                        <p>{mission_info['description']}</p>
                        <p><strong>선택지:</strong> {', '.join(mission_info['options'])}</p>
                        <p><strong>예상 참여도:</strong> {mission_info['ai_analysis']['expected_participation']}</p>
                    </div>
                    
                    <h3>💰 수익 모델</h3>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-number">30%</div>
                            <div>광고 수익 쉐어</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">0.1원</div>
                            <div>참여자당 수익</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">24/7</div>
                            <div>실시간 정산</div>
                        </div>
                    </div>
                    
                    <h3>🚀 리얼픽의 장점</h3>
                    <ul>
                        <li><strong>자동 미션 생성:</strong> AI가 귀하의 콘텐츠를 분석하여 최적의 투표 미션 자동 생성</li>
                        <li><strong>실시간 수익:</strong> 미션 참여도에 따른 즉시 수익 정산</li>
                        <li><strong>팬 참여 증대:</strong> 시청자들이 직접 참여할 수 있는 인터랙티브 콘텐츠</li>
                        <li><strong>데이터 분석:</strong> 시청자 반응 및 선호도 상세 분석 제공</li>
                    </ul>
                    
                    <h3>📊 예상 수익 (월간)</h3>
                    <p>귀하의 채널 규모를 고려할 때, 월 <strong>50만원 ~ 200만원</strong>의 추가 수익이 예상됩니다.</p>
                    
                    <div style="text-align: center;">
                        <a href="{mission_info['source_info']['video_url']}" class="cta-button">
                            🎯 미션 확인하기
                        </a>
                    </div>
                    
                    <p>관심이 있으시다면 아래 연락처로 회신 부탁드립니다. 
                    더 자세한 제안서와 계약 조건을 보내드리겠습니다.</p>
                    
                    <p><strong>담당자:</strong> 리얼픽 비즈니스팀<br>
                    <strong>이메일:</strong> business@realpick.com<br>
                    <strong>전화:</strong> 02-1234-5678</p>
                </div>
                
                <div class="footer">
                    <p>© 2024 RealPick. All rights reserved.</p>
                    <p>이 이메일은 비즈니스 제안을 위해 발송되었습니다.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))
        return msg
    
    def send_email(self, msg: MIMEMultipart, recipient_email: str) -> bool:
        """이메일 발송"""
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email, self.password)
            
            text = msg.as_string()
            server.sendmail(self.email, recipient_email, text)
            server.quit()
            
            # 발송 기록 저장
            self.sent_emails.append({
                'recipient': recipient_email,
                'subject': msg['Subject'],
                'sent_at': datetime.now().isoformat(),
                'status': 'success'
            })
            
            return True
            
        except Exception as e:
            import sys
            print(f"이메일 발송 실패: {e}", file=sys.stderr)
            
            # 실패 기록 저장
            self.sent_emails.append({
                'recipient': recipient_email,
                'subject': msg['Subject'],
                'sent_at': datetime.now().isoformat(),
                'status': 'failed',
                'error': str(e)
            })
            
            return False
    
    def send_partnership_email(self, mission_info: Dict) -> bool:
        """파트너십 제안 이메일 발송"""
        recipient_info = {
            'email': mission_info['marketing_content']['partner_email'],
            'channel_name': mission_info['source_info']['channel_name']
        }
        
        # 이메일 생성
        msg = self.create_partnership_email(mission_info, recipient_info)
        
        # 발송
        success = self.send_email(msg, recipient_info['email'])
        
        if success:
            import sys
            print(f"✅ 파트너십 이메일 발송 완료: {recipient_info['email']}", file=sys.stderr)
        else:
            import sys
            print(f"❌ 파트너십 이메일 발송 실패: {recipient_info['email']}", file=sys.stderr)
        
        return success
    
    def send_batch_emails(self, missions: List[Dict]) -> Dict:
        """여러 미션의 파트너십 이메일 일괄 발송"""
        results = {
            'total': len(missions),
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for mission in missions:
            success = self.send_partnership_email(mission)
            
            if success:
                results['success'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'mission_id': mission['id'],
                'mission_title': mission['title'],
                'recipient': mission['marketing_content']['partner_email'],
                'status': 'success' if success else 'failed'
            })
        
        return results
    
    def create_follow_up_email(self, original_mission: Dict, days_since: int) -> MIMEMultipart:
        """팔로우업 이메일 생성"""
        recipient_info = {
            'email': original_mission['marketing_content']['partner_email'],
            'channel_name': original_mission['source_info']['channel_name']
        }
        
        msg = MIMEMultipart()
        msg['From'] = self.email
        msg['To'] = recipient_info['email']
        msg['Subject'] = f"Re: 리얼픽 파트너십 제안 - {original_mission['title']}"
        
        body = f"""
        안녕하세요, {recipient_info['channel_name']} 님!
        
        지난 {days_since}일 전에 보내드린 파트너십 제안에 대한 답변을 기다리고 있습니다.
        
        현재 해당 미션은 이미 {original_mission.get('current_participants', 150)}명이 참여하고 있으며,
        예상보다 높은 관심을 보이고 있습니다.
        
        추가 문의사항이나 협의가 필요한 부분이 있으시면 언제든 연락 부탁드립니다.
        
        감사합니다.
        리얼픽 비즈니스팀
        """
        
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        return msg
    
    def get_email_stats(self) -> Dict:
        """이메일 발송 통계"""
        total = len(self.sent_emails)
        success = len([e for e in self.sent_emails if e['status'] == 'success'])
        failed = len([e for e in self.sent_emails if e['status'] == 'failed'])
        
        return {
            'total_sent': total,
            'success_count': success,
            'failed_count': failed,
            'success_rate': (success / total * 100) if total > 0 else 0
        }
    
    def save_email_log(self, filename: str = None):
        """이메일 발송 로그 저장"""
        if filename is None:
            filename = f"email_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(f"data/{filename}", 'w', encoding='utf-8') as f:
                json.dump(self.sent_emails, f, ensure_ascii=False, indent=2)
            print(f"이메일 로그 저장 완료: {filename}")
            
        except Exception as e:
            print(f"로그 저장 오류: {e}")


def main():
    """테스트용 메인 함수"""
    # 환경변수 확인
    if not os.getenv('SENDER_EMAIL') or not os.getenv('SENDER_PASSWORD'):
        print("이메일 설정이 필요합니다:")
        print("SENDER_EMAIL=your_email@gmail.com")
        print("SENDER_PASSWORD=your_app_password")
        return
    
    sender = EmailSender()
    
    # 샘플 미션 정보
    sample_mission = {
        'id': 'test-123',
        'title': '영수-영희 커플, 이번 주에 고백할까?',
        'description': '나솔 15기에서 가장 주목받는 커플의 관계 발전을 예측해보세요',
        'options': ['고백한다', '아직 이르다'],
        'source_info': {
            'video_title': '나솔 15기 3화 리뷰',
            'channel_name': '나는솔로 공식',
            'video_url': 'https://youtube.com/watch?v=test123'
        },
        'ai_analysis': {
            'expected_participation': '높음'
        },
        'marketing_content': {
            'partner_email': 'test@example.com'
        }
    }
    
    # 테스트 이메일 발송 (실제로는 발송하지 않음)
    print("이메일 템플릿 생성 테스트...")
    recipient_info = {
        'email': 'test@example.com',
        'channel_name': '나는솔로 공식'
    }
    
    msg = sender.create_partnership_email(sample_mission, recipient_info)
    print("✅ 이메일 템플릿 생성 완료")
    print(f"제목: {msg['Subject']}")

if __name__ == "__main__":
    main()
