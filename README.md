<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1D5pzu8-FPkD2awIrkUSIBhXqSrF5eCwC

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Cloudflare Pages

This project is configured for automatic deployment to Cloudflare Pages via GitHub Actions.

### Prerequisites

1. A Cloudflare account
2. A GitHub repository for this project

### Setup Steps

1. **Configure GitHub Secrets:**
   Go to your GitHub repository Settings → Secrets and variables → Actions → New repository secret
   
   Add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `GEMINI_API_KEY`: (Optional) Your Google Gemini API key for AI features
   - `VITE_ENABLE_AI`: (Optional) Set to "true" to enable AI features

2. **Push to Main Branch:**
   The GitHub Actions workflow will automatically trigger when you push to the `main` branch.

3. **Monitor Deployment:**
   Check the "Actions" tab in your GitHub repository to monitor the deployment progress.

### Manual Deployment

If you prefer to deploy manually:

```bash
# Install dependencies
npm ci

# Build the project
npm run build

# Deploy using Wrangler
npx wrangler pages deploy dist --project-name=low3d-editor
```

### Deployment Configuration

- **Project Name:** `low3d-editor`
- **Build Command:** `npm run build`
- **Build Output Directory:** `dist`
- **Node.js Version:** 20

### Custom Domains

To use a custom domain with your Cloudflare Pages deployment:

1. Go to your Cloudflare Pages dashboard
2. Select your `low3d-editor` project
3. Navigate to "Custom domains"
4. Add your domain and follow the DNS configuration instructions

### Troubleshooting

- **Build Failures:** Check the GitHub Actions logs for detailed error messages
- **Missing Environment Variables:** Ensure all required secrets are configured in GitHub
- **Deployment Errors:** Verify your Cloudflare API token has the correct permissions
