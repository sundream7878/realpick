# 🔒 보안 조치 필요 사항

## ⚠️ GitGuardian 보안 경고 대응

GitGuardian에서 SMTP 자격 증명이 Git 히스토리에서 감지되었습니다.

### 📋 감지된 파일
- `docs/SUPABASE_AUTH_EMAIL_SETUP.md` (Git 히스토리에 존재)

### ✅ 완료된 조치

1. **`.gitignore` 업데이트**
   - 민감한 문서 파일 패턴 추가
   - 향후 유사 파일이 커밋되지 않도록 방지

### 🚨 즉시 필요한 조치

#### 1. Resend API 키 재발급 (필수)

Git 히스토리에 노출되었을 가능성이 있으므로 **즉시 재발급**해야 합니다:

1. [Resend Dashboard](https://resend.com/api-keys) 접속
2. 기존 API 키 삭제
3. 새 API 키 생성
4. Netlify 환경 변수 업데이트:
   - Netlify Dashboard → Site Settings → Environment Variables
   - `RESEND_API_KEY` 값을 새 키로 교체
5. 로컬 `.env.local` 파일도 업데이트

#### 2. Git 히스토리 정리 (권장)

**옵션 A: BFG Repo-Cleaner 사용 (권장)**
```bash
# BFG 설치 (한 번만)
# https://rtyley.github.io/bfg-repo-cleaner/

# 파일 제거
bfg --delete-files "SUPABASE_AUTH_EMAIL_SETUP.md" --no-blob-protection

# 변경사항 적용
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 강제 푸시 (주의: 협업 중이라면 팀원과 조율 필요)
git push origin --force --all
```

**옵션 B: 저장소 새로 시작**
- 민감한 정보가 많이 노출되었다면 저장소를 새로 만드는 것이 더 안전할 수 있습니다.

#### 3. Supabase Service Role Key 확인

`SUPABASE_SERVICE_ROLE_KEY`도 함께 노출되었을 가능성 확인:

1. Supabase Dashboard → Settings → API
2. Service Role Key가 노출되었다면 프로젝트 재생성 고려

#### 4. 환경 변수 관리 체크리스트

- [ ] `.env*` 파일이 `.gitignore`에 포함되어 있는지 확인 ✅
- [ ] Resend API 키 재발급 완료
- [ ] Netlify 환경 변수 업데이트 완료
- [ ] 로컬 `.env.local` 업데이트 완료
- [ ] Git 히스토리 정리 완료 (선택)
- [ ] GitGuardian 알림 확인 및 해결로 표시

### 📚 향후 방지 방법

1. **민감한 정보는 절대 커밋하지 않기**
   - API 키, 비밀번호, 토큰 등
   - 설정 예시 파일에도 실제 값 대신 플레이스홀더 사용

2. **Pre-commit Hook 설정**
   ```bash
   # git-secrets 설치
   npm install -g git-secrets
   
   # 저장소에 설정
   git secrets --install
   git secrets --register-aws
   ```

3. **문서 작성 시 주의**
   - 예시에는 `your-api-key`, `[YOUR_KEY_HERE]` 등 사용
   - 실제 값은 환경 변수 참조

### 🔗 참고 링크

- [Resend API Keys](https://resend.com/api-keys)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitGuardian 대응 가이드](https://docs.gitguardian.com/internal-repositories-monitoring/remediate)

---

**작성일**: 2025-01-18
**우선순위**: 🔴 긴급 (Resend API 키 재발급 필수)

