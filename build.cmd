@echo off

echo Running npm install...
npm install

echo Running webpack build...
npm run build

echo Packaging with vsce...
vsce package

echo Build complete!
pause
