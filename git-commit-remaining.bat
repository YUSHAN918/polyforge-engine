@echo off
echo ========================================
echo Git 提交剩余文件脚本
echo ========================================
echo.

echo [1/4] 删除误创建的 deploy dist 文件...
if exist "deploy dist" (
    del "deploy dist"
    echo ✓ 已删除 deploy dist 文件
) else (
    echo ℹ deploy dist 文件不存在，跳过
)
echo.

echo [2/4] 添加文件到暂存区...
git add index.tsx
git add package.json
git add package-lock.json
git add wrangler.toml
echo ✓ 已添加 4 个文件到暂存区
echo.

echo [3/4] 提交更改...
git commit -m "chore: 添加全局错误捕获和配置更新" -m "- 在 index.tsx 中添加全局错误处理" -m "- 捕获未处理的错误和 Promise 拒绝" -m "- 更新项目依赖和 Cloudflare 配置"
echo.

echo [4/4] 显示当前状态...
git status
echo.

echo ========================================
echo 提交完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 推送到远程仓库: git push origin main
echo 2. 或者运行: git push
echo.
pause
