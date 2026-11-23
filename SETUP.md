# Setup Instructions

## 1. Create GitHub Repository
```bash
# Go to https://github.com/new and create:
# Repository name: anidoc-character-film
# Description: Character animation film: Problem→Solution narrative
# Public repository
# DO NOT initialize with README (we have our own)
```

## 2. Push to GitHub
```bash
cd /data/data/com.termux/files/home/antigravity/anidoc-character-film
git remote add origin https://github.com/loobah18-arch/anidoc-character-film.git
git branch -M main
# Note: repo uses master branch by default on Termux, adjust as needed
git push -u origin main
```

## 3. Trigger Rendering
Go to: https://github.com/loobah18-arch/anidoc-character-film/actions
Click "Render Animation" → "Run workflow" → "Run workflow"

Or push a commit to trigger automatically:
```bash
git commit --allow-empty -m "Trigger render"
git push
```

## 4. Download Video
After workflow completes (5-15 minutes):
- Go to Actions → Latest run → Artifacts
- Download `problemSolution-animation.zip`
- Extract `problemSolution.mp4` to your Downloads folder

## Quick Download Script (run after workflow)
```bash
# Install gh CLI if needed: pkg install gh
# Authenticate: gh auth login

gh run download -R loobah18-arch/anidoc-character-film -n problemSolution-animation -D ~/storage/downloads/anidoc-animation
unzip ~/storage/downloads/anidoc-animation/problemSolution-animation.zip -d ~/storage/downloads/
mv ~/storage/downloads/problemSolution.mp4 ~/storage/downloads/Problem_Solution_Animation.mp4
echo "Done! Video saved to Downloads/Problem_Solution_Animation.mp4"
```

## Project Structure
- `src/canvas-core/problemSolution.ts` - Main film code (45s, 9:16, 30fps)
- `assets/narration/problemSolution.json` - Narration script
- `.github/workflows/render.yml` - GitHub Actions rendering pipeline
- Uses anidoodle engine with flat-vector style human character

## Features
- Human character "Alex" with expressive animations
- 5 acts: Intro → Problem (mountain of tasks) → Discovery → Solution (steps) → Outro
- Narrated with synchronized subtitles
- Composed lofi electronic music bed with emotional arc
- Sound effects at key transitions
- 1080x1920 MP4 output optimized for Shorts/Reels/TikTok
