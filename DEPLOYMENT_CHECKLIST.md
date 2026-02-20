# 🚀 Deployment Checklist

## Pre-Deployment

### 1. Database Setup
- [x] Database reset complete
- [x] Admin account exists (`admin@acm.org`)
- [x] Admin password set (`adminhunbsdk07`)

### 2. Environment Variables (.env)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Random secure string
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- [ ] `RESEND_API_KEY` - Email service API key
- [ ] `NEXT_PUBLIC_APP_URL` - Your app URL
- [ ] `COMPETITION_START` - Competition start date (auto-set by admin)
- [ ] `CRON_SECRET` - Random secure string for cron auth

### 3. Code Ready
- [x] All fixes applied
- [x] Contest status UI implemented
- [x] Admin panel complete
- [x] Cron job endpoint ready
- [x] GitHub Actions workflow created

---

## Deployment Steps

### Step 1: Push to GitHub
```bash
cd acm-squidGame
git add .
git commit -m "feat: complete contest system with auto-scraping"
git push origin main
```

### Step 2: Railway Deployment
1. Railway will auto-deploy from GitHub
2. Wait for build to complete
3. Check deployment logs for errors

### Step 3: Set Railway Environment Variables
Go to Railway → Variables and add:
```
DATABASE_URL=<from Railway PostgreSQL>
JWT_SECRET=<generate random string>
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
RESEND_API_KEY=<from Resend>
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
CRON_SECRET=<generate random string>
```

### Step 4: Run Database Migrations
```bash
railway run npx prisma db push
```

### Step 5: Setup GitHub Actions Cron
See `GITHUB_ACTIONS_SETUP.md` for detailed steps:
1. Add GitHub secrets (RAILWAY_APP_URL, CRON_SECRET)
2. Commit workflow file
3. Test manual run

---

## Post-Deployment

### 1. Verify Deployment
- [ ] App loads at Railway URL
- [ ] Can login as admin
- [ ] Admin panel visible
- [ ] Contest status banner shows

### 2. Admin Setup
- [ ] Login as admin (`admin@acm.org` / `adminhunbsdk07`)
- [ ] Go to Admin Panel → Actions
- [ ] Click "START COMPETITION" to set start date
- [ ] Create all 25 contests (Day 1-25)

### 3. Test Features
- [ ] Contest status shows correct info
- [ ] Countdown timer works
- [ ] "ENTER ARENA" button works
- [ ] Admin can create contests
- [ ] Admin can scrape manually
- [ ] Admin can process strikes
- [ ] CSV upload works

### 4. Test Cron Job
- [ ] Go to GitHub Actions
- [ ] Manually trigger "Nightly Scrape & Process"
- [ ] Check logs for success
- [ ] Verify data updated in admin panel

---

## Launch Day

### Morning (Before 9 AM)
1. Verify competition start date is set
2. Verify Day 1 contest is created
3. Check contest status shows "UPCOMING"
4. Announce to participants

### 9 AM (Contest Goes Live)
1. Verify contest status shows "LIVE NOW"
2. Verify countdown timer works
3. Verify "ENTER ARENA" link works
4. Monitor for any issues

### Throughout the Day
1. Monitor participant registrations
2. Check for any errors in Railway logs
3. Be ready to manually upload CSV if needed

### Midnight (Auto Scrape)
1. Check GitHub Actions ran successfully
2. Verify results scraped
3. Verify strikes processed
4. Check leaderboard updated
5. Check audit logs

---

## Daily Workflow (Automated)

```
9:00 AM  → Contest goes LIVE
         → Users solve problems on HackerRank
11:59 PM → Contest ENDS
12:00 AM → GitHub Actions cron runs
         → Scrapes results
         → Processes strikes
         → Updates leaderboard
         → Generates backup
9:00 AM  → Next day's contest goes LIVE
```

---

## Emergency Procedures

### If Auto-Scrape Fails
1. Download CSV from HackerRank
2. Login to admin panel
3. Go to Actions tab
4. Upload CSV file
5. System processes automatically

### If Cron Doesn't Run
1. Check GitHub Actions logs
2. Verify secrets are correct
3. Manually trigger from GitHub Actions
4. Or use admin panel to scrape/process

### If App is Down
1. Check Railway logs
2. Check database connection
3. Restart service if needed
4. Check environment variables

---

## Monitoring

### Daily Checks
- [ ] Check GitHub Actions ran at midnight
- [ ] Check Railway logs for errors
- [ ] Check admin audit logs
- [ ] Verify leaderboard updated
- [ ] Check email queue status

### Weekly Checks
- [ ] Review eliminated users
- [ ] Check for any stuck processes
- [ ] Verify backups are generating
- [ ] Monitor Railway bandwidth usage

---

## Support

### Documentation
- `README.md` - Project overview
- `GITHUB_ACTIONS_SETUP.md` - Cron setup
- `CRON_SETUP.md` - Alternative cron options
- `CONTEST_SYSTEM_COMPLETE.md` - Feature documentation
- `CRITICAL_FIXES.md` - Recent fixes

### Admin Credentials
- **Email**: `admin@acm.org`
- **Password**: `adminhunbsdk07`
- **Change password after first login!**

---

## 🎉 Ready to Launch!

Once all checkboxes are complete, your 25-day competition is ready to go!

**Good luck with your competition!** 🚀
