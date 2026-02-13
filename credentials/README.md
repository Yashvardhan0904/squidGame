# 🔐 Credentials Directory

This directory should contain your Firebase service account key.

## What goes here?

### firebase-service-account.json

Download this file from:
1. Firebase Console
2. Project Settings (⚙️ icon)
3. Service Accounts tab
4. Click "Generate new private key"

The file should look like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Security Warning ⚠️

**NEVER commit this file to Git!**

This file contains sensitive credentials that give full access to your Firebase project.

The `.gitignore` file is configured to exclude this directory, but always double-check before committing.

## Usage

This file is used by:
- Python script (`scripts/daily_processor.py`) for admin operations
- Server-side Firebase operations

It is **NOT** used by the Next.js frontend (which uses the public Firebase config from `.env.local`).

## Troubleshooting

If you see "Firebase Admin SDK initialization failed":
1. Check this file exists at: `credentials/firebase-service-account.json`
2. Verify the JSON is valid (no syntax errors)
3. Confirm the project ID matches your Firebase project
4. Make sure `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` points to this file
