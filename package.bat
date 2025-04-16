@echo off
:: Create 'out' directory if it doesn't exist
rd out /s /q
md out

:MENU
cls
echo ==========================================
echo   Data API Builder - VS Code Extensions
echo ==========================================
echo [0]  PACKAGE -All-
echo [1]  PACKAGE omnibus-data-api-builder
echo [2]  PACKAGE poco-data-api-builder
echo [3]  PACKAGE init-data-api-builder
echo [4]  PACKAGE config-data-api-builder
echo [5]  PACKAGE start-data-api-builder
echo [6]  PACKAGE add-data-api-builder
echo [7]  PACKAGE validate-data-api-builder
echo [8]  PACKAGE visualize-data-api-builder
echo [9]  PACKAGE health-data-api-builder
echo ==========================================
echo [a]  Open Out Folder in File Explorer
echo [b]  Open VS Marketplace Publisher Page
echo [x]  Exit this script
echo ==========================================
set /p choice="Select an option: "

:: Execute based on choice
if "%choice%"=="1" call :RUN omnibus-data-api-builder
if "%choice%"=="2" call :RUN poco-data-api-builder "npx webpack"
if "%choice%"=="3" call :RUN init-data-api-builder
if "%choice%"=="4" call :RUN config-data-api-builder
if "%choice%"=="5" call :RUN start-data-api-builder
if "%choice%"=="6" call :RUN add-data-api-builder "npx webpack"
if "%choice%"=="7" call :RUN validate-data-api-builder
if "%choice%"=="8" call :RUN visualize-data-api-builder
if "%choice%"=="9" call :RUN health-data-api-builder
if "%choice%"=="0" call :RUN_ALL
if /I "%choice%"=="a" start "" explorer "%cd%\out"
if /I "%choice%"=="b" start "" "https://marketplace.visualstudio.com/manage/publishers/jerry-nixon"
if /I "%choice%"=="x" goto EXIT
goto MENU

:: Function to process builds
:RUN
cd ./%1
echo ------------------------------------------
echo   BUILDING: %1
echo ------------------------------------------
if not "%~2"=="" call %~2
call vsce package
move /Y *.vsix ../out
cd ..
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
goto MENU

:EXIT
exit
