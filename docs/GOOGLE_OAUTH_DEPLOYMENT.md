# Google OAuth Authentication - Deployment Guide

This guide walks you through deploying the Google OAuth authentication feature to production environments like Railway.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Google Cloud Console Setup](#google-cloud-console-setup)
- [Environment Variables Configuration](#environment-variables-configuration)
- [Railway Deployment](#railway-deployment)
- [Authorized Origins and Redirect URIs](#authorized-origins-and-redirect-uris)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- A Google Cloud Platform account
- A Railway account (or other hosting platform)
- PostgreSQL database provisioned
- Node.js 18+ runtime environment

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "ACM Squid Game")
4. Click "Create"

### Step 2: Enable Google+ API

1. In your project, navigate to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Your application name
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. Skip the "Scopes" section (click "Save and Continue")
7. Add test users if needed (for testing before verification)
8. Click "Save and Continue" → "Back to Dashboard"

### Step 4: Create OAuth 2.0 Client ID

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application" as the application type
4. Enter a name (e.g., "ACM Squid Game Web Client")
5. Configure authorized origins and redirect URIs (see [section below](#authorized-origins-and-redirect-uris))
6. Click "Create"
7. **Important**: Copy your Client ID - you'll need this for environment variables

### Step 5: Download Credentials (Optional)

You can download the JSON credentials file for backup, but you only need the Client ID for the application.

## Environment Vari