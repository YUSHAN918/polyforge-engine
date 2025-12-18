@echo off
echo ========================================
echo Git 安全提交脚本（带备份）
echo ========================================
echo.

REM 创建备份目录
set BACKUP_DIR=backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
echo [1/5] 创建备份目录: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul
echo ✓ 备份目录已创建
echo.

REM 备份 deploy dist 文件（如果存在）
echo [2/5] 备份 deploy dist 文件...
if exist "deploy dist" (
    copy "deploy dist" "%BACKUP_DIR%\deploy_dist_backup.html"
    echo ✓ 已备份到: %BACKUP_DIR%\deploy_dist_backup.html
) else (
    echo ℹ deploy dist 文件不存在，跳过备份
)
echo.

REM 显示文件内容供确认
echo [3/5] 显示 deploy dist 文件内容（前 10 行）：
echo ----------------------------------------
if exist "deploy dist" (
    powershell -Command "Get-Content 'deploy dist' -TotalCount 10"
) else (
    echo 文件不存在
)
echo ----------------------------------------
echo.

REM 询问用户确认
echo 请确认是否要删除 deploy dist 文件？
echo 该文件内容与 index.html 完全相同，看起来是误创建的。
echo.
set /p CONFIRM="输入 Y 继续，输入 N 取消: "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo 操作已取消。备份文件保留在 %BACKUP_DIR% 目录中。
    pause
    exit /b
)
echo.

REM 删除文件
echo [4/5] 删除 deploy dist 文件...
if exist "deploy dist" (
    del "deploy dist"
    echo ✓ 已删除 deploy dist 文件
) else (
    echo ℹ 文件不存在，跳过
)
echo.

REM 添加并提交
echo [5/5] 添加文件到 Git 并提交...
git add index.tsx package.json package-lock.json wrangler.toml
echo ✓ 已添加 4 个文件到暂存区
echo.

git commit -m "chore: 添加全局错误捕获和配置更新" -m "- 在 index.tsx 中添加全局错误处理" -m "- 捕获未处理的错误和 Promise 拒绝" -m "- 更新项目依赖和 Cloudflare 配置"
echo.

echo ========================================
echo 提交完成！
echo ========================================
echo.
echo 备份信息：
echo - 备份目录: %BACKUP_DIR%
echo - 如需恢复，请从备份目录复制文件
echo.
echo 当前 Git 状态：
git status
echo.
echo 下一步操作：
echo 1. 推送到远程仓库: git push origin main
echo 2. 如需恢复文件: copy "%BACKUP_DIR%\deploy_dist_backup.html" "deploy dist"
echo.
pause
