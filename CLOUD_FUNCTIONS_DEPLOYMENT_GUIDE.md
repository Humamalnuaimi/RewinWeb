# 🚀 Firebase Cloud Functions Deployment Guide

## 📋 **Overview**

This guide will help you deploy the automated campaign processing system to Firebase Cloud Functions, making it production-ready and independent of the website being open.

---

## 🔧 **Prerequisites**

1. **Firebase CLI installed globally**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project initialized**:
   ```bash
   firebase login
   firebase use rewin-f4ca1  # Your project ID
   ```

---

## 🚀 **Deployment Steps**

### **Step 1: Deploy Cloud Functions**

From the project root directory:

```bash
# Deploy only the functions
npm run deploy-functions

# OR deploy everything (functions + hosting)
npm run deploy-all
```

### **Step 2: Verify Deployment**

1. **Check Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (`rewin-f4ca1`)
   - Navigate to **Functions** tab
   - You should see:
     - `processCampaigns` (scheduled function)
     - `processCampaignsManual` (callable function)

2. **Test from Web Dashboard**:
   - Open your web dashboard
   - Go to Campaign Manager
   - Click "🚀 Process All Active Campaigns"
   - Should now use Cloud Functions instead of local processing

---

## ⚙️ **How It Works**

### **🤖 Automatic Processing**
- **Scheduled Function**: `processCampaigns` runs every hour automatically
- **Independent**: Works even when website is closed
- **Scalable**: Handles multiple users and campaigns efficiently

### **🔧 Manual Processing**
- **Callable Function**: `processCampaignsManual` triggered from web dashboard
- **Authenticated**: Only works for logged-in users
- **Real-time**: Immediate processing when you click the button

### **📊 Per-Campaign Settings**
- Each campaign has its own automation settings
- Configurable intervals: Every 1, 4, 12, or 24 hours
- Settings saved in Firestore: `users/{uid}/campaigns/{campaignId}`

---

## 🔍 **Monitoring & Debugging**

### **View Function Logs**
```bash
# View all function logs
npm run logs:functions

# OR use Firebase CLI directly
firebase functions:log
```

### **Test Functions Locally**
```bash
# Start local emulator
npm run serve:functions

# Functions will be available at:
# http://localhost:5001/rewin-f4ca1/us-central1/processCampaignsManual
```

---

## 📱 **Campaign Processing Logic**

### **Birthday Campaigns**
- Checks all customers daily
- Assigns promotions on customer's birthday
- Prevents duplicate assignments per year
- Sends SMS if configured

### **Inactive Customer Campaigns**
- Identifies customers who haven't visited in X days
- Assigns "We Miss You" promotions
- Prevents duplicate assignments per inactive period
- Resets when customer returns

---

## 🛠️ **Configuration**

### **Timezone Setting**
Update timezone in `functions/index.js`:
```javascript
.schedule('every 1 hours')
.timeZone('America/New_York') // Change this to your timezone
```

### **Schedule Frequency**
Default: Every 1 hour. To change:
```javascript
.schedule('every 4 hours')  // Every 4 hours
.schedule('0 9 * * *')      // Daily at 9 AM
.schedule('0 */6 * * *')    // Every 6 hours
```

---

## 🚨 **Important Notes**

### **Production Benefits**
✅ **Always Running**: Works 24/7 without website being open  
✅ **Scalable**: Handles multiple users simultaneously  
✅ **Reliable**: Firebase infrastructure ensures uptime  
✅ **Cost-Effective**: Only pays for actual function executions  

### **Migration from Local Processing**
- Old system: Required website to be open
- New system: Runs independently in the cloud
- Same logic: Birthday and inactive customer campaigns
- Enhanced: Better error handling and logging

---

## 📞 **Support**

If you encounter issues:

1. **Check function logs**: `npm run logs:functions`
2. **Verify deployment**: Check Firebase Console > Functions
3. **Test authentication**: Ensure user is logged in
4. **Check campaign settings**: Verify campaigns are active

---

## 🎯 **Next Steps**

After deployment:

1. **Test the system**: Create a test campaign and verify it processes
2. **Monitor logs**: Check that functions are running as expected  
3. **Configure schedules**: Set appropriate intervals for each campaign
4. **Enable SMS**: Ensure SMS integration works with campaigns

**🎉 Your campaign automation is now production-ready!**
