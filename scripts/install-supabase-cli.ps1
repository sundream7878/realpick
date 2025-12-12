# Supabase CLI 수동 설치 스크립트 (Windows)
# PowerShell 관리자 권한으로 실행

$ErrorActionPreference = "Stop"

Write-Host "🚀 Supabase CLI 설치 시작..." -ForegroundColor Cyan

# 1. 최신 릴리즈 URL 가져오기
$latestRelease = "https://github.com/supabase/cli/releases/latest"
Write-Host "📥 최신 버전 확인 중..." -ForegroundColor Yellow

# 2. Windows 64bit 다운로드 URL
$downloadUrl = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
$tempPath = "$env:TEMP\supabase.zip"
$installPath = "$env:LOCALAPPDATA\supabase"

Write-Host "📦 다운로드 중: $downloadUrl" -ForegroundColor Yellow

try {
    # 3. 다운로드
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempPath -UseBasicParsing
    Write-Host "✅ 다운로드 완료" -ForegroundColor Green

    # 4. 기존 설치 디렉토리 삭제 (있다면)
    if (Test-Path $installPath) {
        Write-Host "🗑️ 기존 설치 제거 중..." -ForegroundColor Yellow
        Remove-Item -Path $installPath -Recurse -Force
    }

    # 5. 압축 해제
    Write-Host "📂 압축 해제 중..." -ForegroundColor Yellow
    Expand-Archive -Path $tempPath -DestinationPath $installPath -Force
    Write-Host "✅ 압축 해제 완료" -ForegroundColor Green

    # 6. PATH 환경 변수에 추가
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$installPath*") {
        Write-Host "🔧 PATH 환경 변수 추가 중..." -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$currentPath;$installPath",
            "User"
        )
        Write-Host "✅ PATH 추가 완료" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ PATH에 이미 추가되어 있습니다" -ForegroundColor Blue
    }

    # 7. 임시 파일 삭제
    Remove-Item -Path $tempPath -Force

    Write-Host ""
    Write-Host "🎉 Supabase CLI 설치 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ 중요: 새 터미널을 열어야 합니다!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "설치 확인:" -ForegroundColor Cyan
    Write-Host "  supabase --version" -ForegroundColor White
    Write-Host ""
    Write-Host "로그인:" -ForegroundColor Cyan
    Write-Host "  supabase login" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 설치 실패: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "수동 설치 방법:" -ForegroundColor Yellow
    Write-Host "1. 브라우저에서 다음 URL 접속:" -ForegroundColor White
    Write-Host "   https://github.com/supabase/cli/releases/latest" -ForegroundColor Cyan
    Write-Host "2. 'supabase_windows_amd64.zip' 다운로드" -ForegroundColor White
    Write-Host "3. 압축 해제 후 supabase.exe를 원하는 폴더에 복사" -ForegroundColor White
    Write-Host "4. 해당 폴더를 PATH에 추가" -ForegroundColor White
    exit 1
}

