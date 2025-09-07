# Campaign & Promotion SMS Integration Guide

## 🎯 **Overview**

The system now automatically sends SMS messages when campaigns and promotions are triggered, using the multi-account SMS system you set up in the admin panel.

## 🔧 **How It Works**

### **1. Phone Number Connection (Immediate)**
✅ **YES** - When you add a phone number to an account in the admin panel, it's immediately connected and ready to use.

### **2. Automatic SMS Sending**
✅ **YES** - Campaigns and promotions automatically send SMS messages when triggered, using the phone numbers you configured.

### **3. No Admin Panel Access Required**
✅ **YES** - Users don't need admin panel access. SMS sending happens automatically in the background.

## 📱 **SMS Integration Flow**

### **Campaign SMS Flow:**
```
1. Campaign triggers (birthday, inactive, etc.)
2. System finds qualifying customers
3. Creates promotions for those customers
4. Automatically sends SMS to each customer
5. Uses the phone number configured in admin panel
```

### **Promotion SMS Flow:**
```
1. Admin creates promotion
2. System assigns to eligible customers
3. Automatically sends SMS to each customer
4. Uses the phone number configured in admin panel
```

## 🏗️ **Database Structure**

### **Account & Phone Number Setup:**
```
users/{userId}/accounts/{accountId}/
├── name: "Business Account Name"
├── description: "Account description"
└── phone_numbers/{phoneId}/
    ├── phoneNumber: "+1234567890"
    ├── accountName: "Business Account Name"
    ├── accountId: "accountId"
    ├── monthlyLimit: 1000
    ├── currentUsage: 0
    ├── isActive: true
    └── createdAt: timestamp
```

### **Campaign SMS Integration:**
```
Campaign Trigger → Find Customers → Create Promotions → Send SMS
     ↓              ↓              ↓              ↓
  Birthday      Qualifying     Assign to      Use Account
  Inactive      Customers      Customers      Phone Number
```

## 🎯 **How to Set Up Automatic SMS**

### **Step 1: Configure Phone Numbers in Admin Panel**
1. **Access Admin Dashboard**: Log into your web dashboard
2. **Go to SMS Management**: Click the "SMS Management" tab
3. **Create Account**: Click "Add Account" and create a business account
4. **Add Phone Number**: Click "Add Phone Number" and add your Twilio phone number
5. **Set Limits**: Configure monthly message limits

### **Step 2: Campaigns Automatically Use SMS**
- **Birthday Campaigns**: Automatically send SMS on customer birthdays
- **Inactive Campaigns**: Automatically send SMS to inactive customers
- **Custom Campaigns**: Automatically send SMS based on your triggers

### **Step 3: Promotions Automatically Use SMS**
- **Manual Promotions**: Send SMS when you create promotions
- **Campaign Promotions**: Send SMS when campaigns create promotions
- **Targeted Promotions**: Send SMS only to customers in specific outlets

## 📊 **SMS Message Examples**

### **Birthday Campaign SMS:**
```
🎉 Happy Birthday! You have a special 20% off offer waiting for you at our store. Valid for 7 days. Show this message to redeem!
```

### **Inactive Customer Campaign SMS:**
```
👋 We miss you! Come back and get $10 off your next purchase of $50 or more. Valid for 30 days.
```

### **Manual Promotion SMS:**
```
🎁 Special Offer: Get 15% off your next purchase! Minimum spend $30. Valid until [date].
```

## 🔒 **Security & Access Control**

### **Admin-Only Configuration:**
- ✅ Only admins can configure phone numbers
- ✅ Only admins can set up accounts
- ✅ Only admins can manage SMS limits

### **Automatic User Access:**
- ✅ Regular users can create campaigns/promotions
- ✅ SMS sends automatically without user intervention
- ✅ No additional setup required for users

## 💰 **Billing & Cost Tracking**

### **Per-Account Billing:**
- Each account tracks its own SMS costs
- Monthly limits prevent overages
- Cost tracking per phone number
- Usage monitoring in admin panel

### **Cost Calculation:**
```
SMS Cost = Number of Messages × Twilio Rate
Example: 100 messages × $0.0075 = $0.75
```

## 🚀 **Usage Examples**

### **Example 1: Coffee Shop Chain**
```
Account: Downtown Coffee
Phone Number: +1-555-0101
Monthly Limit: 500 messages

Campaign: Birthday Offers
- Automatically sends SMS on customer birthdays
- Uses Downtown Coffee phone number
- Tracks costs separately from other accounts
```

### **Example 2: Multi-Business Owner**
```
Account 1: Coffee Shop
Phone Number: +1-555-0303
Campaigns: Coffee-related promotions

Account 2: Bakery  
Phone Number: +1-555-0404
Campaigns: Bakery-related promotions

Each business uses its own phone number automatically
```

## 🔧 **Technical Implementation**

### **SMS Integration Code:**
```javascript
// Campaign system automatically calls this
const sendSMSMessage = async (phoneNumber: string, message: string) => {
  // 1. Get business ID
  const businessId = await getCurrentBusinessId();
  
  // 2. Find account phone number
  const accountPhoneNumber = await getAccountPhoneNumberForBusiness(businessId);
  
  // 3. Send SMS via multi-account system
  const result = await handleSMSRequest({
    userId: user.uid,
    accountId: businessId,
    phoneNumber: accountPhoneNumber,
    message: message,
    recipients: [phoneNumber]
  });
  
  // 4. Log results
  console.log(`✅ SMS sent: ${result.success}`);
};
```

### **Automatic Trigger Points:**
1. **Campaign Processing**: When campaigns find qualifying customers
2. **Promotion Creation**: When promotions are assigned to customers
3. **Birthday Detection**: When customer birthdays are detected
4. **Inactive Detection**: When inactive customers are found

## 📋 **Setup Checklist**

### **Admin Setup (Required Once):**
- [ ] Create business account in SMS Management
- [ ] Add Twilio phone number to account
- [ ] Set monthly message limits
- [ ] Test SMS sending

### **User Setup (Automatic):**
- [ ] Create campaigns/promotions normally
- [ ] SMS sends automatically
- [ ] No additional configuration needed

## 🔍 **Troubleshooting**

### **SMS Not Sending:**
1. **Check Phone Number**: Verify phone number is added to account
2. **Check Limits**: Ensure monthly limit not exceeded
3. **Check Twilio**: Verify Twilio account has balance
4. **Check Logs**: Review console logs for errors

### **Wrong Phone Number:**
1. **Check Account**: Verify correct account is selected
2. **Check Active Status**: Ensure phone number is marked as active
3. **Check Business ID**: Verify business ID matches account

### **Cost Issues:**
1. **Check Usage**: Monitor usage in admin panel
2. **Check Limits**: Adjust monthly limits if needed
3. **Check Twilio**: Verify Twilio pricing

## 🎯 **Key Benefits**

### **For Admins:**
- ✅ Centralized SMS management
- ✅ Separate billing per business
- ✅ Usage monitoring and limits
- ✅ Cost control and tracking

### **For Users:**
- ✅ Automatic SMS sending
- ✅ No additional setup required
- ✅ Seamless campaign/promotion experience
- ✅ Professional SMS delivery

### **For Business:**
- ✅ Professional SMS branding
- ✅ Automated customer engagement
- ✅ Cost-effective messaging
- ✅ Scalable multi-account system

## 🚀 **Next Steps**

1. **Set up your first account** in the SMS Management tab
2. **Add your Twilio phone number** to the account
3. **Create a test campaign** to verify SMS sending
4. **Monitor usage** in the admin panel
5. **Scale up** by adding more accounts and phone numbers

The system is now fully integrated and ready to automatically send SMS messages for all your campaigns and promotions! 