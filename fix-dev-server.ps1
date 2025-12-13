# Automated Fix for Chunk Loading Error
# Run this with: .\fix-dev-server.ps1

Write-Host "🔧 Fixing Next.js Development Server..." -ForegroundColor Cyan

# Step 1: Kill all node processes
Write-Host "`n📌 Step 1: Stopping all Node.js processes..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe 2>$null
    Write-Host "✅ Node processes stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No Node processes found (this is okay)" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# Step 2: Clear .next cache
Write-Host "`n📌 Step 2: Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path .next -Recurse -Force
    Write-Host "✅ Cache cleared" -ForegroundColor Green
} else {
    Write-Host "⚠️  No cache found (this is okay)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# Step 3: Restart dev server
Write-Host "`n📌 Step 3: Starting development server..." -ForegroundColor Yellow
Write-Host "🚀 Running: npm run dev" -ForegroundColor Cyan
Write-Host "`n" -NoNewline

npm run dev
