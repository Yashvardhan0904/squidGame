# 🚀 ACM Squid Game - Deployment Guide

Complete step-by-step guide to deploy the ACM Squid Game application.

## Prerequisites

- Node.js 18+ installed
- Python 3.8+ installed
- Firebase account
- Vercel account (free tier works)
- Git installed

## Part 1: Firebase Setup (10 minutes)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it: `acm-squid-game` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select your region (closest to users)
5. Click "Enable"

### Step 3: Create Collection Structure

1. In Firestore, click "Start collection"
2. Collection ID: `artifacts`
3. Add first document:
   - Document ID: `acm-squid-arena`
   - No fields needed yet
4. Click into `acm-squid-arena` document
5. Click "Start collection": `public`
6. Document ID: `data`
7. Click into `data` document
8. Click "Start collection": `players`
9. Add a sample player document:
   ```
   Document ID: test_player
   Fields:
   - name: "Test Player"
   - hackerrank_id: "test_player"
   - enroll_no: "TEST001"
   - previous_scores: [50, 75, 100]
   - totalScore: 225
   - eliminated: false
   - last_updated: (current timestamp)
   ```

### Step 4: Get Firebase Credentials

1. Go to Project Settings (gear icon)
2. In "General" tab, scroll to "Your apps"
3. Click Web icon (</>) to add a web app
4. Name: "ACM Squid Game Web"
5. Check "Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the `firebaseConfig` object - you'll need these values

### Step 5: Get Admin SDK Key

1. Still in Project Settings, go to "Service Accounts" tab
2. Click "Generate new private key"
3. Click "Generate key" - a JSON file will download
4. Save this file as `firebase-service-account.json`
5. **IMPORTANT**: Never commit this file to Git!

### Step 6: Set Firestore Security Rules

1. Go to Firestore Database
2. Click "Rules" tab
3. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read, no client writes
    match /artifacts/acm-squid-arena/public/data/players/{player} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

4. Click "Publish"

## Part 2: Local Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd acm-squid-game-copy
npm install
pip3 install -r requirements.txt
```

### Step 2: Configure Environment

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   
   FIREBASE_SERVICE_ACCOUNT_KEY=./credentials/firebase-service-account.json
   ```

3. Create `credentials` folder and add your service account key:
   ```bash
   mkdir credentials
   # Move your downloaded JSON file here
   mv ~/Downloads/firebase-service-account-*.json credentials/firebase-service-account.json
   ```

### Step 3: Test Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see:
- ✅ Main page loads without errors
- ✅ Sample player visible in leaderboard
- ✅ No Firebase connection errors in console

## Part 3: Vercel Deployment (10 minutes)

### Step 1: Prepare Repository

1. Initialize Git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ACM Squid Game"
   ```

2. Create GitHub repository:
   - Go to [github.com/new](https://github.com/new)
   - Name: `acm-squid-game`
   - Make it Private (recommended)
   - Don't initialize with README

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/acm-squid-game.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import your `acm-squid-game` repository
5. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3: Add Environment Variables

In Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**For Python script** (if using Vercel cron or functions):
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
```
(Paste the entire JSON content as one line)

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Click "Visit" to see your live site!

## Part 4: Daily Automation Setup

### Option A: Manual Sync (Simplest)

1. Admin logs in daily
2. Pastes CSV URL in admin panel
3. Clicks "Sync Arena"

### Option B: Scheduled Cron Job (Advanced)

Deploy Python script to a server/cloud function:

```bash
# On your server
0 23 * * * cd /path/to/project && python3 scripts/daily_processor.py --csv-url "YOUR_CSV_URL"
```

### Option C: Vercel Cron (Pro Plan)

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-sync",
    "schedule": "0 23 * * *"
  }]
}
```

## Part 5: Post-Deployment

### Add More Players

1. Prepare CSV with columns:
   - `hackerrank_id`
   - `name`
   - `enroll_no`

2. Use admin panel to bulk import:
   - Go to `/` and login as admin
   - Use "Sync Arena" with your CSV URL

### Update Admin Password

1. Edit `src/app/page.jsx`
2. Find line ~80: `if (password === 'admin123')`
3. Change to: `if (password === 'YOUR_SECURE_PASSWORD')`
4. Commit and redeploy

### Monitor Usage

1. Firebase Console → Usage
2. Vercel Dashboard → Analytics
3. Set up alerts for quota limits

## 🎯 Verification Checklist

After deployment, verify:

- [ ] Website loads at your Vercel URL
- [ ] No console errors
- [ ] Leaderboard displays players
- [ ] Search functionality works
- [ ] Admin login works (password: admin123)
- [ ] Sync button triggers successfully
- [ ] Real-time updates work (open in 2 tabs, sync in one)
- [ ] Mobile responsive design works
- [ ] CRT effects/animations visible

## 🔥 Common Issues

### "Firebase not initialized"
- Check `.env.local` has all variables
- Restart dev server after changing env vars

### "Permission denied" in Firestore
- Check Firestore Rules allow read
- Verify collection path is correct

### Python script fails
- Check `firebase-admin` is installed
- Verify service account JSON path
- Test Firebase connection manually

### Build fails on Vercel
- Check package.json has all dependencies
- Verify Node.js version compatibility
- Check build logs for specific errors

## 📞 Support

If you encounter issues:
1. Check Firebase Console for API errors
2. Check Vercel deployment logs
3. Check browser console for client errors
4. Verify all environment variables are set

## 🎉 You're Done!

Your ACM Squid Game tracker is now live! Share the URL with your participants.

**Remember**: Change the admin password before sharing!

---

**⬛ Three strikes and you're out ⬛**
