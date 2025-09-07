# 🚀 Cloud Campaign Automation Guide

## Overview
This guide shows you how to set up 24/7 campaign automation that runs in the cloud, even when your dashboard is closed.

## 🎯 What This Does

- ✅ Runs campaigns automatically 24/7 in the cloud
- ✅ No need to keep the dashboard open
- ✅ Respects each campaign's interval settings (1, 4, 12, or 24 hours)
- ✅ Processes birthday and inactive customer campaigns
- ✅ Prevents duplicate promotions
- ✅ Works even if no one logs in for days

## 📋 Setup Instructions

### Option 1: Easy Deploy Script (Recommended)

1. Open Terminal in your project directory
2. Run the deploy script:
   ```bash
   ./deploy-automation.sh
   ```
3. Follow the prompts
4. Done! Your campaigns now run 24/7

### Option 2: Manual Deploy

1. Navigate to functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install firebase-admin@^11.11.0 firebase-functions@^4.4.1 --save
   ```

3. Deploy the function:
   ```bash
   npx firebase-tools deploy --only functions:processCampaigns --project rewin-f4ca1
   ```

## 🔧 How It Works

1. **Cloud Scheduler** runs every hour (at :00)
2. **Checks all users** and their active campaigns
3. **For each campaign**, checks if it's time to run based on interval
4. **Processes campaigns**:
   - Birthday: Finds customers with birthdays today
   - Inactive: Finds customers who haven't visited
5. **Creates promotions** in customerPromotions collection
6. **Updates lastProcessed** timestamp

## ⚙️ Campaign Interval Settings

Each campaign has its own interval setting:
- **1 hour**: Checks every hour
- **4 hours**: Checks every 4 hours
- **12 hours**: Checks every 12 hours  
- **24 hours**: Checks once per day (default)

To change a campaign's interval:
1. Go to the dashboard
2. Click "Edit Automation" on the campaign
3. Select the desired interval
4. Save

## 📊 Monitoring

View function logs:
```bash
npx firebase-tools functions:log --project rewin-f4ca1
```

Check specific function:
```bash
npx firebase-tools functions:log --only processCampaigns --project rewin-f4ca1
```

## 🎯 Example Timeline

Campaign created at 2:15 PM with 4-hour interval:
- 3:00 PM - First check (next full hour)
- 7:00 PM - Second check (4 hours later)
- 11:00 PM - Third check
- 3:00 AM - Fourth check
- ...continues 24/7

## ❓ FAQ

**Q: Do I need to keep the dashboard open?**
A: No! Once deployed, campaigns run 24/7 in the cloud.

**Q: How often does it check?**
A: The scheduler runs every hour, but each campaign only processes based on its interval.

**Q: Will customers get duplicate promotions?**
A: No, the system prevents duplicates using deterministic IDs.

**Q: What if deployment takes too long?**
A: First deployment can take 5-10 minutes. Be patient.

## 🆘 Troubleshooting

If deployment fails:
1. Make sure you're logged in: `npx firebase-tools login`
2. Check your project: `npx firebase-tools projects:list`
3. Try deploying with debug: `npx firebase-tools deploy --only functions --debug`

## 🎉 Success!

Your campaigns now run automatically 24/7 without any manual intervention!
