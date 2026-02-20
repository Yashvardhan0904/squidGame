# Cron Job Setup for Railway

## Automatic Scraping & Processing

The system needs to run a cron job every day at midnight (12:00 AM IST) to:
1. Scrape previous day's contest results from HackerRank
2. Process strikes and eliminations
3. Update leaderboard

## Railway Cron Configuration

### Option 1: Railway Cron (Recommended)

1. Go to your Railway project
2. Click on your service
3. Go to "Settings" → "Cron Jobs"
4. Add a new cron job:

```
Name: Nightly Scrape & Process
Schedule: 0 0 * * *
Command: curl -X POST https://your-app.railway.app/api/cron/nightly -H "Authorization: Bearer YOUR_CRON_SECRET"
Timezone: Asia/Kolkata
```

### Option 2: External Cron Service (cron-job.org)

1. Go to https://cron-job.org
2. Create a free account
3. Add a new cron job:
   - **URL**: `https://your-app.railway.app/api/cron/nightly`
   - **Schedule**: Every day at 00:00 (midnight)
   - **Timezone**: Asia/Kolkata (IST)
   - **HTTP Method**: POST
   - **Headers**: Add `Authorization: Bearer YOUR_CRON_SECRET`

### Option 3: GitHub Actions

Create `.github/workflows/nightly-cron.yml`:

```yaml
name: Nightly Scrape & Process

on:
  schedule:
    # Runs at 18:30 UTC (00:00 IST)
    - cron: '30 18 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  scrape-and-process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Nightly Processing
        run: |
          curl -X POST https://your-app.railway.app/api/cron/nightly \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

## Environment Variables

Make sure these are set in Railway:

```env
CRON_SECRET=your-secure-random-string-here
COMPETITION_START=2026-02-16T09:00:00+05:30
```

## Testing the Cron Job

### Manual Test:

```bash
curl -X POST https://your-app.railway.app/api/cron/nightly \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Check Status:

```bash
curl https://your-app.railway.app/api/cron/nightly
```

## Flow Timeline

```
9:00 AM  - Contest goes LIVE
11:59 PM - Contest ENDS
12:00 AM - Cron job runs:
           1. Scrapes previous day's results
           2. Processes strikes
           3. Updates leaderboard
           4. Generates backup
9:00 AM  - Next day's contest goes LIVE
```

## Fallback: Manual CSV Upload

If auto-scrape fails:
1. Download CSV from HackerRank manually
2. Go to Admin Panel → Actions tab
3. Upload CSV file
4. System will process it automatically

## Monitoring

Check Railway logs to see cron job execution:
```
[Cron] Nightly processing for day X
[Cron] Scrape succeeded: X participants
[Cron] Strike processing complete: X strikes, X eliminations
```

## Troubleshooting

### Cron not running?
- Check Railway logs for errors
- Verify CRON_SECRET is set correctly
- Test the endpoint manually

### Scrape failed?
- Check HackerRank contest URL is correct
- Verify contest is public
- Use manual CSV upload as fallback

### Strikes not processing?
- Ensure scrape completed successfully
- Check admin audit logs
- Verify contest is marked as scraped in database
