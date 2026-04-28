# 将 dist 上传到服务器（需本机已安装 OpenSSH 客户端，PowerShell 5+）
# 用法示例：
#   .\scripts\upload-dist.ps1 -SshHost "192.168.1.100" -User "root" -RemoteDir "/var/www/html/mobile"
# 若未构建会先报错，请先在项目根目录执行: npm run build

param(
  [Parameter(Mandatory = $true)]
  [string] $SshHost,
  [Parameter(Mandatory = $true)]
  [string] $User,
  [Parameter(Mandatory = $true)]
  [string] $RemoteDir
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dist = Join-Path $root "dist"
$index = Join-Path $dist "index.html"
if (-not (Test-Path -LiteralPath $index)) {
  Write-Error "未找到 dist/index.html，请先在项目根目录执行: npm run build"
  exit 1
}

$target = "${User}@${SshHost}:${RemoteDir}"
Write-Host "上传: $dist -> $target"
Push-Location -LiteralPath $dist
try {
  scp -r * $target
  if ($LASTEXITCODE -ne 0) {
    Write-Error "scp 失败（退出码 $LASTEXITCODE）。检查 SSH、路径、权限。"
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
Write-Host "完成。"
