# 폰트 다운로드 가이드

## 📥 Pretendard 폰트 다운로드

### 1. 다운로드 링크
https://github.com/orioncactus/pretendard/releases

### 2. 필요한 파일
- `Pretendard-Bold.ttf` (필수 ⭐)
- `Pretendard-SemiBold.ttf` (선택)

### 3. 설치 방법

**Option A: 직접 다운로드**
1. 위 링크에서 최신 릴리즈 클릭
2. `Pretendard-1.3.9.zip` (또는 최신 버전) 다운로드
3. 압축 해제
4. `web/static/woff2/` 또는 `otf/` 폴더에서 파일 찾기
5. `Pretendard-Bold.ttf`를 이 폴더(`assets/fonts/`)에 복사

**Option B: 스크립트 사용** (추천)
```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip" -OutFile "pretendard.zip"
Expand-Archive -Path "pretendard.zip" -DestinationPath "pretendard"
Copy-Item "pretendard/web/static/woff2/Pretendard-Bold.ttf" -Destination "assets/fonts/"
Remove-Item "pretendard" -Recurse
Remove-Item "pretendard.zip"
```

```bash
# macOS/Linux
wget https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
unzip Pretendard-1.3.9.zip -d pretendard
cp pretendard/web/static/woff2/Pretendard-Bold.ttf assets/fonts/
rm -rf pretendard Pretendard-1.3.9.zip
```

### 4. 확인

```bash
ls assets/fonts/
```

다음 파일이 있어야 합니다:
- ✅ `Pretendard-Bold.ttf`

### 5. 폰트 없이 실행하면?

폰트 파일이 없어도 시스템 기본 폰트로 렌더링됩니다.
단, 한글 표시가 제대로 안될 수 있습니다.

**권장**: 반드시 한글 폰트를 설치하세요!

---

## 🆓 무료 라이선스

Pretendard는 **SIL Open Font License 1.1** 라이선스로 제공됩니다.
- ✅ 상업적 사용 가능
- ✅ 수정 가능
- ✅ 배포 가능
- ✅ 무료

---

**문제가 있으면**: `SETUP_GUIDE.md` 참고
