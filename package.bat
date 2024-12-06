:: Create the 'out' directory if it doesn't exist
@echo off

if not exist "./out" mkdir "./out"
cd ./out
if not exist "./old" mkdir "./old"
move /Y *.vsix ./old
cd ..

cd ./init-data-api-builder
ECHO STARTING ./init-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./start-data-api-builder
ECHO STARTING ./start-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./test-data-api-builder
ECHO STARTING ./test-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./validate-data-api-builder
ECHO STARTING ./validate-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./visualize-data-api-builder
ECHO STARTING ./visualize-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

:: For each .vsix file in the 'out' directory, check if it also exists in the 'old' directory
cd ./out
for %%F in (*.vsix) do (
    if exist "%cd%\old\%%F" (
        del /Q /F "%cd%\old\%%F"
    ) 
)
cd ..
