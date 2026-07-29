@echo off
:: Suppress Node.js deprecation warnings (punycode)
set NODE_OPTIONS=--no-deprecation

:: Create 'out' directory if it doesn't exist
rd out /s /q
md out

:MENU
:: cls
echo ==========================================
echo   Data API Builder - VS Code Extensions
echo ==========================================
echo [a]  PACKAGE omnibus-data-api-builder
echo [b]  PACKAGE poco-data-api-builder
echo [c]  PACKAGE init-data-api-builder
echo [d]  PACKAGE start-data-api-builder
echo [e]  PACKAGE add-data-api-builder
echo [f]  PACKAGE validate-data-api-builder
echo [g]  PACKAGE visualize-data-api-builder
echo [h]  PACKAGE health-data-api-builder
echo [i]  PACKAGE agent-data-api-builder
echo [j]  PACKAGE mcp-data-api-builder
echo [k]  PACKAGE docker-data-api-builder
echo [0]  PACKAGE RUN ALL
echo ==========================================
echo [w]  PUBLISH all packages in out folder
echo ==========================================
echo [x]  Exit this script
echo [y]  Open Out Folder in File Explorer
echo [z]  Open VS Marketplace Publisher Page
echo ==========================================
set /p choice="Select an option: "

:: Execute based on choice
if "%choice%"=="0" call :RUN_ALL
if "%choice%"=="a" call :RUN omnibus-data-api-builder
if "%choice%"=="b" call :RUN poco-data-api-builder "npx webpack"
if "%choice%"=="c" call :RUN init-data-api-builder
if "%choice%"=="d" call :RUN start-data-api-builder
if "%choice%"=="e" call :RUN add-data-api-builder "npx webpack"
if "%choice%"=="f" call :RUN validate-data-api-builder
if "%choice%"=="g" call :RUN visualize-data-api-builder
if "%choice%"=="h" call :RUN health-data-api-builder
if "%choice%"=="i" call :RUN agent-data-api-builder
if "%choice%"=="j" call :RUN mcp-data-api-builder "npx webpack"
if "%choice%"=="k" call :RUN docker-data-api-builder "npx webpack"
if /I "%choice%"=="w" call :PUBLISH_ALL
if /I "%choice%"=="y" start "" explorer "%cd%\out"
if /I "%choice%"=="z" start "" "https://marketplace.visualstudio.com/manage/publishers/jerry-nixon"
if /I "%choice%"=="x" goto EXIT
goto MENU

:: Function to process builds
:RUN
echo.
echo ==========================================
echo   BUILDING: %1
echo ==========================================
cd ./%1
if not "%~2"=="" call %~2
call vsce package --no-dependencies
move /Y *.vsix ../out >nul
cd ..
goto :eof

:: Run all extensions
:RUN_ALL
call :RUN omnibus-data-api-builder
call :RUN poco-data-api-builder "npx webpack"
call :RUN init-data-api-builder
call :RUN start-data-api-builder
call :RUN add-data-api-builder "npx webpack"
call :RUN validate-data-api-builder
call :RUN visualize-data-api-builder
call :RUN health-data-api-builder
call :RUN agent-data-api-builder
call :RUN mcp-data-api-builder "npx webpack"
call :RUN docker-data-api-builder "npx webpack"
goto MENU

:: Publish all VSIX files in out folder
:PUBLISH_ALL
echo.
echo ==========================================
echo   PUBLISHING ALL PACKAGES IN OUT FOLDER
echo ==========================================
for %%f in (out\*.vsix) do (
    echo Publishing: %%~nxf
    call vsce publish --packagePath "%%f"
)
echo.
echo ==========================================
echo   PUBLISH COMPLETE
echo ==========================================
goto MENU

:EXIT
goto :eof
