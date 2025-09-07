# Campaign Daily Automation Plan

## Current State
- ✅ Campaigns can be created and stored
- ✅ Manual processing works (finds qualifying customers)
- ✅ Creates promotions that appear in mobile app
- ❌ No daily automation
- ❌ No SMS sending during campaign processing

## Required Features

### 1. **Daily Automation**
We need to add a system that runs campaigns automatically every day.

**Options:**
- **Option A**: Firebase Cloud Functions (recommended)
- **Option B**: Web dashboard background process
- **Option C**: External cron job service

### 2. **SMS Integration**
When a campaign creates a promotion for a customer, send them an SMS.

**Current SMS System**: Already exists in the code
```javascript
const sendSMSMessage = async (phoneNumber, message) => {
  // Uses Twilio API at localhost:5001/api/twilio/customer/send-sms
}
```

## Implementation Plan

### Step 1: Add SMS to Campaign Processing

**Modify the campaign processing to send SMS:**
```javascript
// In assignCampaignToCustomers function
if (qualifies && customerData.phoneNumber) {
  // Create promotion (already done)
  
  // NEW: Send SMS notification
  const smsMessage = `🎉 Special offer just for you! ${campaign.discountAmount}% off your next visit. Valid for ${campaign.expirationDays} days. Show this message in-store.`;
  
  await sendSMSMessage(customerData.phoneNumber, smsMessage);
  console.log(`📱 SMS sent to ${customerData.phoneNumber}`);
}
```

### Step 2: Daily Automation Options

#### Option A: Firebase Cloud Functions (Recommended)
```javascript
// functions/scheduledCampaigns.js
exports.processCampaignsDaily = functions.pubsub
  .schedule('0 9 * * *') // Every day at 9 AM
  .onRun(async (context) => {
    // Get all users with active campaigns
    // Process campaigns for each user
    // Send SMS notifications
  });
```

#### Option B: Web Dashboard Timer
```javascript
// Add to CampaignManager component
useEffect(() => {
  const runDailyCheck = () => {
    const now = new Date();
    const lastRun = localStorage.getItem('lastCampaignRun');
    
    // If it's been 24 hours since last run
    if (!lastRun || (now.getTime() - new Date(lastRun).getTime()) > 24 * 60 * 60 * 1000) {
      processAllCampaigns(true); // Run automatically
      localStorage.setItem('lastCampaignRun', now.toISOString());
    }
  };
  
  // Check every hour
  const interval = setInterval(runDailyCheck, 60 * 60 * 1000);
  runDailyCheck(); // Check immediately on load
  
  return () => clearInterval(interval);
}, []);
```

### Step 3: Enhanced Campaign Form
Add SMS message field to campaign creation:
```javascript
// Campaign form should include:
{
  name: "Birthday Special",
  triggerType: "birthday",
  discountAmount: 20,
  smsMessage: "🎂 Happy Birthday! Enjoy 20% off today!", // NEW FIELD
  sendSMS: true // NEW FIELD
}
```

## Complete Flow Example

### 1. **Create Campaign**
```javascript
{
  name: "Inactive Customer Winback",
  triggerType: "inactive_30",
  discountAmount: 25,
  minimumPurchase: 50,
  smsMessage: "We miss you! Come back and get 25% off your next order.",
  sendSMS: true,
  isActive: true
}
```

### 2. **Daily Processing** (Automatic)
- Every day at 9 AM (or when dashboard loads)
- Check all customers against campaign criteria
- For qualifying customers:
  1. Create promotion in `/users/{uid}/customerPromotions/{customerId}/promotions/`
  2. Send SMS with campaign message
  3. Customer sees promotion in mobile app

### 3. **Customer Experience**
1. Customer receives SMS: "We miss you! Come back and get 25% off..."
2. Customer opens mobile app
3. Sees the 25% off promotion
4. Uses promotion in-store

## Next Steps

1. **Add SMS to existing campaign processing** (quick win)
2. **Choose automation method** (Cloud Functions vs Web Timer)
3. **Add SMS message field to campaign form**
4. **Test complete flow**

Would you like me to implement any of these steps?
