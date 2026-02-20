# GitHub Actions Cron Setup Guide

## ✅ Workflow File Created

The workflow file is already created at:
```
.github/workflows/nightly-cron.yml
```

This will automatically run every day at **12:00 AM IST (Midnight)** to scrape and process contest results.

---

## 🔧 Setup Steps

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

#### Secret 1: RAILWAY_APP_URL
- **Name**: `RAILWAY_APP_URL`
- **Value**: `https://your-app.railway.app` (replace with your actual Railway URL)
- Click **Add secret**

#### Secret 2: CRON_SECRET
- **Name**: `CRON_SECRET`
- **Value**: Generate a secure random string (e.g., `openssl rand -hex 32`)
- Click **Add secret**

**Example CRON_SECRET generation:**
```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use any random string generator
# Example: a8f5e2d9c4b7a1f3e6d8c2b5a9f4e7d1c3b6a8f2e5d9c7b4a1f6e3d8c5b2a9f7
```

---

### Step 2: Update Railway Environment Variable

Add the same `CRON_SECRET` to your Railway app:

1. Go to Railway dashboard
2. Select your project
3. Go to **Variables** tab
4. Add new variable:
   - **Key**: `CRON_SECRET`
   - **Value**: (same value as GitHub secret)
5. Click **Add**

---

### Step 3: Commit and Push

```bash
git add .github/workflows/nightly-cron.yml
git commit -m "feat: add GitHub Actions cron for nightly scraping"
git push origin main
```

---

### Step 4: Verify Setup

1. Go to your GitHub repository
2. Click on **Actions** tab
3. You should see "Nightly Scrape & Process" workflow
4. Click on it to see the schedule

---

## 🧪 Testing

### Manual Test (Before Midnight)

1. Go to GitHub → **Actions** tab
2. Click on "Nightly Scrape & Process"
3. Click **Run workflow** button
4. Select branch (main)
5. Click **Run workflow**
6. Wait for it to complete
7. Check the logs to see if it succeeded

### Check Logs

Click on the workflow run to see detailed logs:
```
✅ Cron job completed successfully
HTTP Status: 200
Response: {"success":true,"dayNumber":1,...}
```

---

## 📅 Schedule

**Cron Expression**: `30 18 * * *`

**Meaning**:
- Runs at **18:30 UTC** every day
- Which is **00:00 IST (Midnight)** in India
- Automatically scrapes previous day's contest
- Processes strikes and eliminations
- Updates leaderboard

**Timezone Conversion**:
- UTC: 18:30
- IST: 00:00 (next day)
- Example: 18:30 UTC on Feb 20 = 00:00 IST on Feb 21

---

## 🔍 Monitoring

### Check if Cron Ran:

1. **GitHub Actions Tab**: See workflow runs
2. **Railway Logs**: Check for cron execution logs
3. **Admin Panel**: Check Audit Logs for scrape/process actions

### Expected Logs in Railway:

```
[Cron] Nightly processing for day X
[Scraper] Fetching leaderboard for day X
[Scraper] Found X participants
[Strike] Processing strikes for day X
[Strike] Issued X strikes, X eliminations
```

---

## 🚨 Troubleshooting

### Workflow Not Running?

**Check**:
1. Secrets are added correctly (RAILWAY_APP_URL, CRON_SECRET)
2. Railway app is deployed and accessible
3. CRON_SECRET matches in both GitHub and Railway

### Workflow Failed?

**Common Issues**:
1. **401 Unauthorized**: CRON_SECRET mismatch
2. **404 Not Found**: Wrong RAILWAY_APP_URL
3. **500 Server Error**: Check Railway logs for backend errors

**Fix**:
1. Verify secrets are correct
2. Test the endpoint manually:
```bash
curl -X POST https://your-app.railway.app/api/cron/nightly \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Scrape Failed?

**Fallback**:
1. Download CSV from HackerRank manually
2. Go to Admin Panel → Actions tab
3. Upload CSV file
4. System will process automatically

---

## 🎯 Benefits of GitHub Actions

✅ **Free**: Unlimited for public repos, 2000 minutes/month for private  
✅ **Reliable**: GitHub's infrastructure  
✅ **Visible**: See all runs in Actions tab  
✅ **Manual Trigger**: Can run manually anytime  
✅ **Logs**: Detailed execution logs  
✅ **No Extra Service**: No need for external cron services  

---

## 📝 Summary

1. ✅ Workflow file created
2. ⏳ Add GitHub secrets (RAILWAY_APP_URL, CRON_SECRET)
3. ⏳ Add CRON_SECRET to Railway
4. ⏳ Commit and push
5. ⏳ Test manually from Actions tab

**Once setup is complete, the cron will run automatically every midnight!** 🎉
