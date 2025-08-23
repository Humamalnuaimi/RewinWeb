# 🚀 Firebase Cloud Functions Deployment Commands

## Step-by-Step Deployment

### 1. Navigate to Project Directory
```bash
cd /Users/humamal-nuaimi/AndroidStudioProjects/Rewin\ Webb
```

### 2. Login to Firebase
```bash
npx firebase-tools login
```
- Choose "n" for Gemini features
- Complete browser authentication

### 3. Set Firebase Project
```bash
npx firebase-tools use rewin-f4ca1
```

### 4. Deploy Functions
```bash
npx firebase-tools deploy --only functions
```

### 5. Verify Deployment
```bash
npx firebase-tools functions:list
```

## Expected Output

After successful deployment, you should see:
- ✅ `processCampaigns` (scheduled function)
- ✅ `processCampaignsManual` (callable function)

## Test the Deployment

1. Open your web dashboard at http://localhost:5174
2. Go to Campaign Manager
3. Click "🚀 Process All Active Campaigns"
4. Should now show "🚀 Processed via Cloud Function"

## Troubleshooting

If deployment fails:
- Check that you're logged in: `npx firebase-tools whoami`
- Verify project: `npx firebase-tools projects:list`
- Check functions directory: `ls -la functions/`
