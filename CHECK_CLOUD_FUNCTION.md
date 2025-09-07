# 🔍 How to Verify Cloud Function is Working

## Method 1: Check Cloud Function Logs

Run this command to see the cloud function activity:
```bash
npx firebase-tools functions:log --only processCampaigns --project rewin-f4ca1 | tail -n 50
```

Look for entries like:
- `⏰ Campaign processor running...`
- `Processing come back for user...`
- `💤 Processing inactive campaign (12+ days)`
- `✅ Campaign processing complete`

## Method 2: Check Firestore Campaign Data

1. Go to Firebase Console: https://console.firebase.google.com/project/rewin-f4ca1/firestore
2. Navigate to: `users > [your-user-id] > campaigns > [campaign-id]`
3. Look for these fields:
   - `lastProcessedBy`: Will show `cloud_function_auto` if cloud processed it
   - `lastRunResult`: Will show "Cloud Function: X assigned" 
   - `lastCloudRun`: Timestamp of last cloud processing

## Method 3: Monitor Next Scheduled Run

The cloud function runs every hour at :00 (e.g., 10:00, 11:00, 12:00)

To see when it will run next:
1. Check current time
2. Wait for the next hour mark
3. Run the log command above shortly after

## Method 4: Force Cloud Function Test

You can temporarily change the schedule to run more frequently for testing:

1. Edit `functions/campaignProcessor.js`
2. Change line: `exports.processCampaigns = functions.pubsub.schedule('0 * * * *')`
3. To: `exports.processCampaigns = functions.pubsub.schedule('*/5 * * * *')` (every 5 minutes)
4. Deploy: `cd functions && npx firebase-tools deploy --only functions:processCampaigns --project rewin-f4ca1`
5. **Remember to change it back after testing!**

## What to Look For

When the cloud function processes your campaign, you'll see:
- New promotions created in `customerPromotions` collection
- Campaign's `lastProcessed` field updated
- `lastProcessedBy` = `cloud_function_auto`
- Log entries showing processing activity

## Dashboard vs Cloud Function

- **Dashboard Manual**: When you click buttons in the dashboard
  - `lastProcessedBy` = `dashboard_manual`
  - Immediate processing
  
- **Cloud Function Auto**: Runs every hour automatically
  - `lastProcessedBy` = `cloud_function_auto`
  - Works 24/7 without dashboard open
