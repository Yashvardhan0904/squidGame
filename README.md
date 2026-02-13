# 🎮 ACM Squid Game: DSA Survival Arena

A **Squid Game-themed** coding challenge tracker built with **Next.js 14**, **Firebase Firestore**, and **Python**. Track 200+ participants in a daily DSA challenge where missing submissions lead to strikes and eventual elimination.

## 🎨 Design Theme

- **Colors**: Deep Black (#0a0a0a), Neon Pink (#ff007f), Mint Green (#00ff9f)
- **Effects**: CRT scanlines, flicker animations, monospaced terminal fonts
- **Strike System**: Circle (1st), Triangle (2nd), Square (3rd) — inspired by Squid Game

## 🏗️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS v4, Lucide React
- **Backend**: Firebase Firestore (NoSQL), Firebase Auth (Anonymous)
- **Automation**: Python 3.x (data processing)
- **Hosting**: Vercel (recommended)

## 📁 Project Structure

```
acm-squid-game-copy/
├── src/
│   └── app/
│       ├── page.jsx              # Main UI (Public + Admin views)
│       ├── layout.js             # Root layout
│       ├── globals.css           # Squid Game styling
│       └── api/
│           └── admin/
│               └── sync/
│                   └── route.js  # Sync API endpoint
├── scripts/
│   └── daily_processor.py        # Python automation script
├── firebase.js                   # Firebase configuration
├── tailwind.config.js            # Tailwind theme
├── package.json                  # Dependencies
├── requirements.txt              # Python dependencies
└── .env.local.example            # Environment variables template
```

## 🚀 Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd acm-squid-game-copy
npm install
pip3 install -r requirements.txt
```

### 2. Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable **Firestore Database**
3. Create collection structure:
   ```
   artifacts/
     acm-squid-arena/
       public/
         data/
           players/ (collection)
   ```

### 3. Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in Firebase credentials from Firebase Console > Project Settings
3. Download Firebase Admin SDK service account key:
   - Firebase Console > Project Settings > Service Accounts
   - Generate new private key
   - Save as `credentials/firebase-service-account.json`

### 4. Database Schema

Each player document in `players` collection:

```json
{
  "name": "John Doe",
  "hackerrank_id": "john_doe",
  "enroll_no": "ACM001",
  "previous_scores": [100, 0, 75],  // Rolling window of last 3 scores
  "totalScore": 175,
  "eliminated": false,  // true if all 3 previous_scores are 0
  "last_updated": Timestamp
}
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🎯 Features

### Public Interface (/)

- **Real-time Leaderboard**: Top 5 survivors with live Firebase updates
- **High Risk Zone**: Players with 2 strikes (pulsing yellow borders)
- **Participant Registry**: Searchable grid of all active players
- **Termination Logs**: List of eliminated players

### Admin Dashboard (Hidden)

- **Access**: Click "ADMIN" button in footer → Enter password: `admin123`
- **Sync Arena**: Manually trigger daily score sync
- **Simulate Day**: Add random test scores (for testing)
- **Reset Database**: Wipe and reseed with demo data
- **Custom URLs**: Override contest/CSV URLs

## 🤖 Automation

### Python Sync Script

```bash
python3 scripts/daily_processor.py --csv-url "YOUR_CSV_URL"
```

**What it does:**
1. Fetches CSV with today's scores
2. Updates `previous_scores` array (keeps last 3)
3. Checks for elimination (3 consecutive zeros)
4. Updates `totalScore`
5. Adds new players automatically
6. Batch writes to Firestore (400 per batch)

### Daily URL Pattern

Contest URL format: `https://www.hackerrank.com/acmsquidgame{DDMMYYYY}`
- Example for Feb 8, 2026: `acmsquidgame08022026`

## 🎮 Strike System

| Strikes | Icon | Status |
|---------|------|--------|
| 0 | ○ △ □ | Safe |
| 1 | ● △ □ | Warning |
| 2 | ● ▲ □ | High Risk (Yellow border) |
| 3 | ● ▲ ■ | **ELIMINATED** |

**Elimination Rule**: 3 consecutive days with score = 0

## 🔒 Security Notes

1. **Admin Password**: Change `admin123` in page.jsx before deployment
2. **Firebase Rules**: Set Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/acm-squid-arena/public/data/players/{player} {
      allow read: if true;  // Public read
      allow write: if false;  // No client writes
    }
  }
}
```

3. **Environment Variables**: Never commit `.env.local` to git

## 🎨 Customization

### Colors (tailwind.config.js)

```javascript
colors: {
  'squid-black': '#0a0a0a',
  'squid-pink': '#ff007f',
  'squid-mint': '#00ff9f',
  'squid-yellow': '#ffff00',
}
```

### Animations (globals.css)

- `animate-flicker`: Screen flicker effect
- `animate-pulse-glow`: Pink glow pulse
- CRT scanlines: Automatic overlay

## 📊 Scaling for 200+ Users

- **Firestore**: Supports 10K+ reads/writes per second
- **Batch Writes**: Processes 400 updates at once
- **Real-time Updates**: Uses Firestore `onSnapshot` for live sync
- **Search**: Client-side filtering (instant)

## 🐛 Troubleshooting

### Firebase Connection Errors
- Check `.env.local` credentials
- Verify Firestore Database is created
- Check Firebase project is active

### Python Script Fails
- Ensure `firebase-admin` is installed: `pip3 install firebase-admin`
- Check service account key path in `.env.local`
- Verify CSV URL is accessible and public

### Admin Login Not Working
- Default password: `admin123`
- Check browser console for errors
- Verify Firebase connection

## 🚢 Deployment (Vercel)

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

**Important**: 
- Set Node.js version to 18+ in Vercel settings
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` as environment variable (paste JSON content)

## 📝 License

MIT License - Feel free to use for your ACM chapter!

## 🎬 Credits

Built with ❤️ for competitive programming communities.

**Squid Game** theme inspired by the Netflix series.

---

**⬛ Three strikes and you're out ⬛**
