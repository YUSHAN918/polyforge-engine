@echo off
echo Building project...
call npm run build
echo.
echo Deploying to Cloudflare Pages...
call npx wrangler pages deploy dist --project-name=polyforge-engine --branch=main
echo.
echo Deployment complete!
pause
