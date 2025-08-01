@echo off
:: Create 'out' directory if it doesn't exist
rd out /s /q
md out

:MENU
:: cls
echo ==========================================
echo   Data API Builder - VS Code Extensions
echo ==========================================
echo [a]  PACKAGE mcp-data-api-builder
echo [b]  PACKAGE omnibus-data-api-builder
echo [c]  PACKAGE poco-data-api-builder
echo [d]  PACKAGE init-data-api-builder
echo [e]  PACKAGE config-data-api-builder
echo [f]  PACKAGE start-data-api-builder
echo [g]  PACKAGE add-data-api-builder
echo [h]  PACKAGE validate-data-api-builder
echo [i]  PACKAGE visualize-data-api-builder
echo [j]  PACKAGE health-data-api-builder
echo [0]  PACKAGE RUN ALL
echo ==========================================
echo [x]  Exit this script
echo [y]  Open Out Folder in File Explorer
echo [z]  Open VS Marketplace Publisher Page
echo ==========================================
set /p choice="Select an option: "

:: Execute based on choice
if "%choice%"=="0" call :RUN_ALL
if "%choice%"=="a" call :RUN mcp-data-api-builder
if "%choice%"=="b" call :RUN omnibus-data-api-builder
if "%choice%"=="c" call :RUN poco-data-api-builder "npx webpack"
if "%choice%"=="d" call :RUN init-data-api-builder
if "%choice%"=="e" call :RUN config-data-api-builder
if "%choice%"=="f" call :RUN start-data-api-builder
if "%choice%"=="g" call :RUN add-data-api-builder "npx webpack"
if "%choice%"=="h" call :RUN validate-data-api-builder
if "%choice%"=="i" call :RUN visualize-data-api-builder
if "%choice%"=="j" call :RUN health-data-api-builder
if /I "%choice%"=="y" start "" explorer "%cd%\out"
if /I "%choice%"=="z" start "" "https://marketplace.visualstudio.com/manage/publishers/jerry-nixon"
if /I "%choice%"=="x" goto EXIT
goto MENU

:: Function to process builds
:RUN
@echo on
cd ./%1
echo ------------------------------------------
echo   BUILDING: %1
echo ------------------------------------------
if not "%~2"=="" call %~2
call vsce package
move /Y *.vsix ../out
cd ..
@echo off
goto :eof

:: Run all extensions
:RUN_ALL
call :RUN omnibus-data-api-builder
call :RUN poco-data-api-builder "npx webpack"
call :RUN init-data-api-builder
call :RUN config-data-api-builder
call :RUN start-data-api-builder
call :RUN add-data-api-builder "npx webpack"
call :RUN validate-data-api-builder
call :RUN visualize-data-api-builder
call :RUN health-data-api-builder
call :RUN mcp-data-api-builder
goto MENU

:EXIT
exit
