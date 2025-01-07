:: Create the 'out' directory if it doesn't exist
@echo off
rd out /s /q
md out

cd ./omnibus-data-api-builder
ECHO STARTING ./omnibus-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

GOTO EXIT
cd ./init-data-api-builder
ECHO STARTING ./init-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./config-data-api-builder
ECHO STARTING ./config-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./start-data-api-builder
ECHO STARTING ./start-data-api-builder
call vsce package
move /Y *.vsix ../out
cd ..

cd ./add-data-api-builder
ECHO STARTING ./add-data-api-builder
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


:EXIT