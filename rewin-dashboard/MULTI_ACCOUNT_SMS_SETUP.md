# Multi-Account SMS Setup Guide

This guide explains how to connect multiple phone numbers to different business accounts in your SMS system.

## Overview

The system now supports multiple business accounts, each with their own phone numbers for SMS messaging. This allows you to:

- **Separate billing** for different business units
- **Track usage** per account and phone number
- **Manage limits** independently for each phone number
- **Organize customers** by business account

## Database Structure

### Account Structure
```
users/{userId}/accounts/{accountId}/
├── name: "Business Account Name"
├── description: "Account description"
├── totalCustomers: 0
├── createdAt: timestamp
└── phone_numbers/{phoneId}/
    ├── phoneNumber: "+1234567890"
    ├── accountName: "Business Account Name"
    ├── accountId: "accountId"
    ├── monthlyLimit: 1000
    ├── currentUsage: 0
    ├── isActive: true
    └── createdAt: timestamp
```

### Message Logs Structure
```
users/{userId}/accounts/{accountId}/message_logs/{messageId}/
├── messageId: "Twilio message SID"
├── phoneNumber: "+1234567890"
├── accountId: "accountId"
├── recipient: "+0987654321"
├── content: "Message content"
├── cost: 0.0075
├── status: "delivered"
└── timestamp: timestamp
```

## Setup Steps

### 1. Create Business Accounts

1. **Access SMS Manager**: Navigate to the SMS Manager in your dashboard
2. **Add Account**: Click "Add Account" button
3. **Fill Details**:
   - **Account Name**: Your business name (e.g., "Downtown Coffee Shop")
   - **Description**: Optional description (e.g., "Main location on Main St")
4. **Create**: Click "Create Account"

### 2. Add Phone Numbers to Accounts

1. **Select Account**: Choose the account from the dropdown
2. **Add Phone Number**: Click "Add Phone Number" button
3. **Fill Details**:
   - **Phone Number**: Your Twilio phone number (e.g., "+1234567890")
   - **Monthly Limit**: Maximum messages per month (e.g., 1000)
4. **Add**: Click "Add Phone Number"

### 3. Twilio Phone Number Setup

#### Option A: Single Twilio Account (Recommended)

1. **Create Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Purchase Phone Numbers**: Buy multiple phone numbers
3. **Configure Webhook** (if needed):
   ```
   https://your-domain.com/api/twilio-webhook
   ```

#### Option B: Multiple Twilio Accounts

1. **Create Separate Accounts**: One Twilio account per business unit
2. **Environment Variables**: Set up per-account credentials
   ```env
   # Account 1
   TWILIO_ACCOUNT_SID_1=AC1234567890abcdef
   TWILIO_AUTH_TOKEN_1=your_auth_token_1
   
   # Account 2
   TWILIO_ACCOUNT_SID_2=AC0987654321fedcba
   TWILIO_AUTH_TOKEN_2=your_auth_token_2
   ```

## Usage Examples

### Example 1: Coffee Shop Chain

**Account 1: Downtown Location**
- Phone Number: +1-555-0101
- Monthly Limit: 500 messages
- Customers: Downtown area customers

**Account 2: Uptown Location**
- Phone Number: +1-555-0202
- Monthly Limit: 300 messages
- Customers: Uptown area customers

### Example 2: Multi-Business Owner

**Account 1: Coffee Shop**
- Phone Number: +1-555-0303
- Monthly Limit: 1000 messages
- Customers: Coffee shop customers

**Account 2: Bakery**
- Phone Number: +1-555-0404
- Monthly Limit: 500 messages
- Customers: Bakery customers

## API Integration

### Send SMS with Account Routing

```javascript
// Send SMS from specific account and phone number
const response = await fetch('/api/send-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user123',
    accountId: 'account456',
    phoneNumber: '+1234567890',
    message: 'Your order is ready!',
    recipients: ['+0987654321', '+1122334455']
  })
});
```

### Get Account Usage

```javascript
// Get usage statistics for specific account
const usage = await getAccountUsage('user123', 'account456');
console.log('Total messages:', usage.totalMessages);
console.log('Total cost:', usage.totalCost);
```

## Billing and Cost Tracking

### Per-Account Billing

Each account tracks its own:
- **Message costs** per phone number
- **Monthly usage** against limits
- **Delivery statistics**
- **Failed message tracking**

### Cost Calculation

```javascript
// Example cost breakdown
const costBreakdown = {
  account1: {
    phoneNumber: '+1234567890',
    monthlyUsage: 450,
    monthlyLimit: 500,
    totalCost: 3.375, // 450 * $0.0075
    remainingMessages: 50
  },
  account2: {
    phoneNumber: '+0987654321',
    monthlyUsage: 200,
    monthlyLimit: 300,
    totalCost: 1.50, // 200 * $0.0075
    remainingMessages: 100
  }
};
```

## Security Features

### Phone Number Verification

The system verifies that:
- Phone numbers belong to the specified account
- Phone numbers are active and authorized
- Monthly limits are not exceeded

### Access Control

- Users can only access their own accounts
- Phone numbers are isolated per account
- Message logs are account-specific

## Best Practices

### 1. Account Organization

- **Use descriptive names**: "Downtown Coffee" vs "Account 1"
- **Group related businesses**: Keep similar businesses in same account
- **Separate by location**: Different accounts for different locations

### 2. Phone Number Management

- **Set realistic limits**: Based on expected usage
- **Monitor usage**: Check monthly usage regularly
- **Plan for growth**: Leave room for increased usage

### 3. Cost Optimization

- **Use single Twilio account**: For better pricing and management
- **Monitor costs**: Track usage per account
- **Set alerts**: For approaching limits

## Troubleshooting

### Common Issues

1. **Phone Number Not Found**
   - Verify phone number is added to correct account
   - Check if phone number is active
   - Ensure proper formatting (+1234567890)

2. **Monthly Limit Exceeded**
   - Check current usage vs limit
   - Consider increasing limit or waiting for reset
   - Review message sending patterns

3. **Messages Not Sending**
   - Verify Twilio credentials
   - Check phone number format
   - Ensure account has sufficient balance

### Debug Information

The system provides detailed logging:
- Account selection
- Phone number verification
- Usage limit checks
- Message delivery status
- Cost tracking

## Migration from Single Account

If you're upgrading from a single-account system:

1. **Create new accounts** for each business unit
2. **Move existing phone numbers** to appropriate accounts
3. **Update customer associations** to link with correct accounts
4. **Migrate message logs** (if needed)

## Support

For technical support:
- Check the debug logs in the SMS Manager
- Verify account and phone number configurations
- Review Twilio account settings
- Contact support with specific error messages

## Next Steps

1. **Set up your first account** using the SMS Manager
2. **Add phone numbers** to your accounts
3. **Test sending messages** to verify setup
4. **Monitor usage** and adjust limits as needed
5. **Integrate with your customer data** to route messages appropriately 