@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM 方案 A：使用默认 base=/mobile/，勿带 VITE_BASE_PATH=/
set "VITE_BASE_PATH="
call npm run build
if errorlevel 1 exit /b 1
echo.
echo 请将 dist 整包部署到站点路径 /mobile/ 下（index.html 与 assets 同级）。
echo.
echo 服务器磁盘路径（由 oa.diantongxue.com 的 nginx root 可知，勿与 default 站点的 /var/www/html 混淆）:
echo   /var/www/dtxmms/mobile/
echo 上传示例（把 服务器IP 与 SSH 用户名换成你的）:
echo   scp -r "%~dp0dist\*" 用户名@服务器IP:/var/www/dtxmms/mobile/
exit /b 0
