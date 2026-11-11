@echo off
echo ========================================
echo   Hungora APK Build Script
echo ========================================
echo.

:: Set environment variables automatically
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\35.0.0;%JAVA_HOME%\bin

echo [ENV] ANDROID_HOME = %ANDROID_HOME%
echo [ENV] JAVA_HOME    = %JAVA_HOME%
echo.

cd /d C:\Users\BALA\Desktop\Hungoraa\DineSmart\mobile

echo [1/4] Generating Android native project...
call npx expo prebuild --platform android --clean
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Prebuild failed! Check the error above.
    pause
    exit /b 1
)

echo.
echo [2/4] Setting up keystore...
if exist hungora-release.keystore (
    copy hungora-release.keystore android\app\hungora-release.keystore >nul
    echo Keystore found and copied.
    set BUILD_TYPE=release
) else (
    echo No keystore found - will build DEBUG APK.
    echo (You can still install this on your phone)
    set BUILD_TYPE=debug
)

echo.
echo [3/4] Building APK (this takes 3-5 minutes)...
cd android

if "%BUILD_TYPE%"=="release" (
    echo Building RELEASE APK...
    call gradlew.bat assembleRelease --no-daemon
) else (
    echo Building DEBUG APK...
    call gradlew.bat assembleDebug --no-daemon
)

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Gradle build failed! Check the error above.
    cd ..
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.

if "%BUILD_TYPE%"=="release" (
    echo APK File:
    echo %cd%\app\build\outputs\apk\release\app-release.apk
    echo.
    :: Try to open the folder automatically
    explorer app\build\outputs\apk\release
) else (
    echo APK File:
    echo %cd%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    explorer app\build\outputs\apk\debug
)

echo.
echo Phone la install panna:
echo  1. APK file copy pannu phone la (USB or WhatsApp)
echo  2. Phone la open pannu - Install click pannu
echo  3. Settings - Unknown sources allow pannirkanum
echo.
pause
