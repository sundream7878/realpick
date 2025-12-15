import * as React from 'react';

interface MissionNotificationEmailProps {
  missionTitle: string;
  category: string;
  categoryName: string;
  userNickname: string;
  missionUrl: string;
}

export const MissionNotificationEmail: React.FC<MissionNotificationEmailProps> = ({
  missionTitle,
  category,
  categoryName,
  userNickname,
  missionUrl,
}) => {
  // 카테고리별 색상
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'LOVE':
        return '#F43F5E'; // rose-500
      case 'VICTORY':
        return '#2563EB'; // blue-600
      case 'STAR':
        return '#EAB308'; // yellow-500
      default:
        return '#6B7280'; // gray-500
    }
  };

  const categoryColor = getCategoryColor(category);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, backgroundColor: '#F9FAFB' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#F9FAFB', padding: '40px 20px' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding="0" cellSpacing="0" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                {/* 헤더 */}
                <tr>
                  <td style={{ background: 'linear-gradient(135deg, #2C2745 0%, #3E757B 100%)', padding: '30px', textAlign: 'center' }}>
                    <img src={`${missionUrl.split('/')[0]}//${missionUrl.split('/')[2]}/realpick-logo-new.png`} alt="리얼픽 로고" style={{ height: '40px', marginBottom: '10px' }} />
                    <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: '28px', fontWeight: 'bold' }}>
                      리얼픽
                    </h1>
                    <p style={{ margin: '10px 0 0 0', color: '#E5E7EB', fontSize: '14px' }}>
                      새로운 미션이 도착했습니다!
                    </p>
                  </td>
                </tr>

                {/* 본문 */}
                <tr>
                  <td style={{ padding: '40px 30px' }}>
                    {/* 인사말 */}
                    <p style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '16px', lineHeight: '1.5' }}>
                      안녕하세요, <strong>{userNickname}</strong>님!
                    </p>

                    {/* 카테고리 배지 */}
                    <div style={{ marginBottom: '20px' }}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: categoryColor,
                        color: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}>
                        {categoryName}
                      </span>
                    </div>

                    {/* 미션 제목 */}
                    <div style={{
                      backgroundColor: '#F9FAFB',
                      borderLeft: `4px solid ${categoryColor}`,
                      padding: '20px',
                      marginBottom: '30px',
                      borderRadius: '8px',
                    }}>
                      <h2 style={{ margin: '0 0 10px 0', color: '#1F2937', fontSize: '20px', fontWeight: 'bold' }}>
                        {missionTitle}
                      </h2>
                      <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        관심 카테고리에 새로운 미션이 등록되었습니다.
                      </p>
                    </div>

                    {/* CTA 버튼 */}
                    <table width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td align="center" style={{ paddingTop: '10px', paddingBottom: '20px' }}>
                          <a
                            href={missionUrl}
                            style={{
                              display: 'inline-block',
                              backgroundColor: categoryColor,
                              color: '#FFFFFF',
                              textDecoration: 'none',
                              padding: '16px 40px',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            미션 확인하기 →
                          </a>
                        </td>
                      </tr>
                    </table>

                    {/* 안내 메시지 */}
                    <p style={{ margin: '20px 0 0 0', color: '#9CA3AF', fontSize: '14px', lineHeight: '1.5' }}>
                      지금 바로 참여하여 다른 사용자들과 함께 픽을 선택해보세요!
                    </p>
                  </td>
                </tr>

                {/* 푸터 */}
                <tr>
                  <td style={{ backgroundColor: '#F3F4F6', padding: '20px 30px', borderTop: '1px solid #E5E7EB' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#6B7280', fontSize: '12px', lineHeight: '1.5' }}>
                      이 이메일은 리얼픽 알림 설정에 따라 발송되었습니다.
                    </p>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '12px' }}>
                      알림 설정을 변경하려면{' '}
                      <a href={`${missionUrl.split('/')[0]}//${missionUrl.split('/')[2]}/p-profile`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                        프로필 페이지
                      </a>
                      를 방문하세요.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
};

export default MissionNotificationEmail;

