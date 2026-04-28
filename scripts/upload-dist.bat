@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ========== 改成你的服务器信息 ==========
set SSH_HOST=你的服务器IP或域名
set SSH_USER=你的SSH用户名
set REMOTE_DIR=/www/wwwroot/你的站点目录/mobile
REM ======================================

cd /d "%~dp0.."
if not exist "dist\index.html" (
  echo 请先在本目录执行: npm run build
  exit /b 1
)

echo 上传 dist 到 %SSH_USER%@%SSH_HOST%:%REMOTE_DIR%
scp -r "dist\*" "%SSH_USER%@%SSH_HOST%:%REMOTE_DIR%"
if errorlevel 1 (
  echo scp 失败。请确认已安装 OpenSSH 客户端，且主机、路径、账号正确。
  exit /b 1
)
echo 完成。
exit /b 0
