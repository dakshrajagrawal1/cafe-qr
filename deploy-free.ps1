# ==============================================================================
# CafeQR 1-Click Free Cloud Deployment Automation Script
# ==============================================================================
# This script automates building and pushing your full-stack CafeQR platform to
# free cloud hosting (TiDB Serverless + Render.com + Cloudflare Pages + GitHub Actions).

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       🚀 CafeQR 1-Click Free Hosting & Multi-App Deployment       " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

# Step 1: Verify Monorepo Build
Write-Host "`n[1/4] Building all packages & apps (Shared, Customer, Staff, Server)..." -ForegroundColor Green
pnpm -r build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✅ All 4 packages built successfully!" -ForegroundColor Green

# Step 2: Git Status Check & Commit
Write-Host "`n[2/4] Checking Git repository state..." -ForegroundColor Green
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "chore: auto-package apps and update PWA icons"
    Write-Host "✅ Changes committed to git." -ForegroundColor Green
} else {
    Write-Host "✅ Git working tree clean." -ForegroundColor Green
}

# Step 3: Check Remote GitHub Repository
Write-Host "`n[3/4] Checking GitHub Remote..." -ForegroundColor Green
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "ℹ️ No GitHub remote origin configured." -ForegroundColor Yellow
    Write-Host "To link your free GitHub repository, run:" -ForegroundColor Cyan
    Write-Host "   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
} else {
    Write-Host "Pushing latest code to: $remote" -ForegroundColor Cyan
    git push origin main
    Write-Host "✅ Pushed to GitHub. Cloudflare Pages & Render will auto-deploy!" -ForegroundColor Green
}

# Step 4: Summary & App Links
Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "               🎉 CafeQR Multi-App Stack is Ready!                " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "• 📱 Customer Web App:         http://localhost:5173" -ForegroundColor White
Write-Host "• 📲 App Download Hub:         http://localhost:5174?tab=downloads" -ForegroundColor White
Write-Host "• 👑 Cafe Owner App:           http://localhost:5174?mode=owner" -ForegroundColor White
Write-Host "• 💼 Cafe Manager App:         http://localhost:5174?mode=manager" -ForegroundColor White
Write-Host "• 🤵 Waiter App:               http://localhost:5174?mode=waiter" -ForegroundColor White
Write-Host "• 🍳 Kitchen KDS App:          http://localhost:5174?mode=kitchen" -ForegroundColor White
Write-Host "• 🛡️ Platform Super Admin:     http://localhost:5174?mode=admin" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
