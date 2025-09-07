# 📱 SMS Marketing Setup Guide

Complete guide to integrate SMS messaging with your Rewin Webb loyalty program dashboard.

## 🚀 **Quick Start Summary**

1. **Sign up for Twilio** → Get phone number & credentials
2. **Add environment variables** → Configure React app
3. **Install dependencies** → Add Twilio SDK
4. **Update customer data** → Add SMS opt-in field
5. **Launch campaigns** → Send automated messages

---

## 📋 **Step 1: Twilio Account Setup**

### **Create Twilio Account**
1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Verify your phone number during registration
3. Choose "SMS" as your primary use case

### **Get Your Credentials**
1. Navigate to [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Keep these secure - treat them like passwords!

### **Purchase a Phone Number**
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a number with SMS capabilities
3. **US numbers cost ~$1/month** + usage fees
4. Save this number - you'll need it for configuration

### **Pricing Overview**
- **Phone Number**: ~$1.00/month
- **SMS Messages**: ~$0.0075 per message (US)
- **Free Trial**: $15 credit for new accounts

---

## 🔧 **Step 2: Environment Configuration**

### **Create .env File**
In your `rewin-dashboard` folder, create a `.env` file:

```bash
# Twilio Configuration
REACT_APP_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token_here
REACT_APP_TWILIO_PHONE_NUMBER=+1234567890

# Example values (replace with your actual credentials):
# REACT_APP_TWILIO_ACCOUNT_SID=AC47d1f4b1234567890abcdef1234567890
# REACT_APP_TWILIO_AUTH_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
# REACT_APP_TWILIO_PHONE_NUMBER=+15551234567
```

### **Important Security Notes**
- ✅ **DO**: Keep credentials in `.env` file
- ✅ **DO**: Add `.env` to `.gitignore`
- ❌ **DON'T**: Commit credentials to version control
- ❌ **DON'T**: Share credentials publicly

---

## 📦 **Step 3: Install Dependencies**

```bash
cd rewin-dashboard
npm install twilio
```

---

## 🗃️ **Step 4: Update Customer Data Structure**

### **Add SMS Opt-in Field**
Update your customer registration to include SMS consent:

```javascript
// When creating a new customer, add these fields:
const customerData = {
  // ... existing fields
  optedInForSMS: true,        // Customer consented to SMS
  birthday: new Date(),       // For birthday campaigns
  lastVisit: new Date(),      // For re-engagement tracking
  totalPoints: 0,             // For points-based campaigns
  // ... other fields
};
```

### **Retroactive Data Update**
For existing customers, you'll need to:
1. **Add `optedInForSMS: false`** to existing customer records
2. **Collect SMS consent** through your mobile app or website
3. **Update birthday information** for birthday campaigns

---

## 🎯 **Step 5: Available Campaign Types**

### **1. Re-engagement Campaign**
- **Trigger**: Customers who haven't visited in 30+ days
- **Message**: "$5 off your next visit" 
- **Frequency**: Maximum once per month per customer
- **Best Time**: Tuesday-Thursday, 10 AM - 4 PM

### **2. Birthday Campaign**  
- **Trigger**: Customer's birthday month
- **Message**: "$10 off during your birthday month"
- **Frequency**: Once per year per customer
- **Best Time**: 1st of birthday month, morning

### **3. Welcome Campaign**
- **Trigger**: New customer signup
- **Message**: "$5 off your next visit as welcome gift"
- **Timing**: Immediately after signup
- **Purpose**: Encourage first visit

---

## 🚦 **Step 6: Legal Compliance**

### **SMS Regulations (TCPA Compliance)**
- ✅ **Always get explicit consent** before sending SMS
- ✅ **Include opt-out instructions** in every message
- ✅ **Honor STOP requests immediately**
- ✅ **Keep records of consent**

### **Required Elements in Messages**
- Business name identification
- "Reply STOP to opt out" (handled automatically)
- Clear value proposition
- Expiration date for offers

### **Message Example Template**
```
Hi John! We miss you at [Business Name]! Come back and enjoy $5 off your next visit. Valid for 7 days. Reply STOP to opt out.
```

---

## 📊 **Step 7: Testing & Monitoring**

### **Test Your Setup**
1. Use the **Test SMS** feature in the dashboard
2. Send to your own phone number first
3. Verify message delivery and formatting
4. Test STOP/opt-out functionality

### **Monitor Performance**
- **Delivery Rate**: Should be >95%
- **Cost Tracking**: Monitor spend vs. ROI
- **Customer Response**: Track visit increases after campaigns
- **Opt-out Rate**: Should be <5%

---

## 🔄 **Step 8: Automation Setup (Optional)**

### **Firebase Cloud Functions**
For fully automated campaigns, you can set up Cloud Functions:

```javascript
// Example: Auto-send birthday messages on 1st of each month
exports.sendBirthdayMessages = functions.pubsub
  .schedule('0 9 1 * *') // 9 AM on 1st of every month
  .onRun(async (context) => {
    const messagingService = initializeMessagingService(admin.firestore());
    await messagingService.sendBirthdayCampaign(userId, businessName);
  });
```

---

## 💰 **Cost Estimation**

### **Monthly Costs**
- **Phone Number**: $1.00/month
- **1,000 SMS**: $7.50/month
- **5,000 SMS**: $37.50/month
- **10,000 SMS**: $75.00/month

### **ROI Calculation**
- If 10% of recipients return and spend $30 on average
- 1,000 SMS × 10% return rate × $30 = $3,000 revenue
- Cost: $8.50 | Revenue: $3,000 | **ROI: 35,300%**

---

## 🎯 **Best Practices**

### **Message Timing**
- **Best Days**: Tuesday, Wednesday, Thursday
- **Best Times**: 10 AM - 4 PM (avoid early morning/late evening)
- **Avoid**: Mondays, Fridays, weekends, holidays

### **Message Content**
- Keep it **under 160 characters**
- Use **clear, actionable language**
- Include **specific dollar amounts** ($5 off vs "discount")
- Add **urgency** ("Valid for 7 days")
- **Personalize** with customer name

### **Frequency Guidelines**
- **Maximum 4 messages per month** per customer
- **Wait 7 days** between different campaign types
- **Respect opt-outs immediately**
- **Track engagement** and adjust frequency

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Messages Not Sending**
- ✅ Check Twilio credentials in `.env`
- ✅ Verify phone number format (+1234567890)
- ✅ Confirm Twilio account has sufficient balance
- ✅ Check Firebase security rules

#### **Messages Not Delivered**
- ✅ Verify recipient opted in for SMS
- ✅ Check phone number is valid and active
- ✅ Ensure message complies with carrier regulations
- ✅ Check Twilio delivery reports

#### **High Costs**
- ✅ Monitor message frequency
- ✅ Remove inactive phone numbers
- ✅ Implement proper error handling
- ✅ Use message templates efficiently

---

## 📈 **Success Metrics**

Track these KPIs to measure campaign success:

- **Delivery Rate**: >95%
- **Customer Return Rate**: 5-15% within 7 days
- **Revenue Per Message**: $2-5
- **Opt-out Rate**: <5%
- **Cost Per Acquisition**: <$5

---

## 🔒 **Security Checklist**

- [ ] Twilio credentials stored in `.env` file
- [ ] `.env` file added to `.gitignore`
- [ ] Customer consent properly recorded
- [ ] Opt-out functionality tested
- [ ] Message logs secured in Firestore
- [ ] Access controls implemented

---

## 🚀 **Launch Checklist**

- [ ] Twilio account created and verified
- [ ] Phone number purchased
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Customer data updated with SMS fields
- [ ] Test messages sent successfully
- [ ] Legal compliance verified
- [ ] Team trained on message guidelines
- [ ] Monitoring dashboard set up

---

## 📞 **Support Resources**

- **Twilio Documentation**: [twilio.com/docs](https://www.twilio.com/docs)
- **SMS Best Practices**: [twilio.com/learn](https://www.twilio.com/learn)
- **Compliance Guide**: [twilio.com/guidelines](https://www.twilio.com/guidelines)
- **Pricing Calculator**: [twilio.com/pricing](https://www.twilio.com/pricing)

---

## 🎉 **You're Ready!**

Once everything is configured, you can:
- ✅ Send re-engagement campaigns to win back customers
- ✅ Celebrate birthdays with personalized offers  
- ✅ Welcome new customers with instant gratification
- ✅ Track ROI and optimize campaign performance

**Expected Results**: 5-15% increase in customer visits and 10-25% boost in customer lifetime value within the first month.

---

*Last Updated: January 2025* 