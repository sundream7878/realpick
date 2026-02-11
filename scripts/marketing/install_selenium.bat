@echo off
echo ========================================
echo Selenium 및 undetected-chromedriver 설치
echo ========================================
echo.

cd /d %~dp0

echo [1/2] Selenium 설치 중...
pip install selenium

echo.
echo [2/2] undetected-chromedriver 설치 중...
pip install undetected-chromedriver

echo.
echo ========================================
echo 설치 완료!
echo ========================================
echo.
echo 다음 명령어로 설치 확인:
echo   python -c "import selenium; print('Selenium:', selenium.__version__)"
echo   python -c "import undetected_chromedriver; print('undetected-chromedriver: OK')"
echo.
pause
