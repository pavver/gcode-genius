@echo off

echo Running npm install...
call npm install

echo Running webpack build...
call npm run build

echo Packaging with vsce...
call vsce package

echo Build complete!
pause