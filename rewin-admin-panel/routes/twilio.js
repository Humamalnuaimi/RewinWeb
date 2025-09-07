const express = require('express');
const router = express.Router();
const TwilioManager = require('../services/TwilioManager');

// Initialize Twilio manager
const twilioManager = new TwilioManager();

/**
 * ADMIN ENDPOINTS - For admin panel to manage user Twilio accounts
 */

// Get user's Twilio account status
router.get('/admin/users/:userId/twilio', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await twilioManager.getUserTwilioConfig(userId);
    
    if (result.success) {
      // Return client-safe config (no auth tokens)
      res.json({
        success: true,
        twilioAccount: result.clientSafeConfig
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error getting user Twilio account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Connect user to Twilio account (Admin only)
router.post('/admin/users/:userId/twilio/connect', async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountSid, authToken, phoneNumber, accountName, monthlyLimit, costLimit } = req.body;

    // Validate required fields
    if (!accountSid || !authToken || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountSid, authToken, phoneNumber'
      });
    }

    const twilioConfig = {
      accountSid,
      authToken,
      phoneNumber,
      accountName,
      monthlyLimit: monthlyLimit || 1000,
      costLimit: costLimit || 100.00
    };

    const result = await twilioManager.connectUserToTwilio(userId, twilioConfig);
    
    res.json(result);
  } catch (error) {
    console.error('Error connecting user to Twilio:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Test Twilio connection
router.post('/admin/twilio/test', async (req, res) => {
  try {
    const { accountSid, authToken, phoneNumber } = req.body;

    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountSid, authToken'
      });
    }

    const result = await twilioManager.testTwilioConnection(accountSid, authToken, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error testing Twilio connection:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Disconnect user's Twilio account
router.post('/admin/users/:userId/twilio/disconnect', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await twilioManager.disconnectTwilioAccount(userId);
    res.json(result);
  } catch (error) {
    console.error('Error disconnecting Twilio account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user's billing information
router.get('/admin/users/:userId/twilio/billing', async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;
    
    const result = await twilioManager.getUserBilling(
      userId, 
      month ? parseInt(month) : null, 
      year ? parseInt(year) : null
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error getting billing info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user's Twilio events/logs
router.get('/admin/users/:userId/twilio/events', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const db = twilioManager.db;
    const eventsQuery = db.collection('users').doc(userId).collection('twilio_events')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));
    
    const snapshot = await eventsQuery.get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error getting Twilio events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * CUSTOMER ENDPOINTS - For customer dashboard to send SMS campaigns
 */

// Get current user's Twilio account status (customer view)
router.get('/customer/twilio/status', async (req, res) => {
  try {
    // In a real app, you'd get userId from authenticated session
    const userId = req.headers['x-user-id']; // Temporary for testing
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const result = await twilioManager.getUserTwilioConfig(userId);
    
    if (result.success) {
      // Return limited info for customer view
      const { clientSafeConfig } = result;
      res.json({
        success: true,
        isConnected: clientSafeConfig.isActive && clientSafeConfig.connectionStatus === 'connected',
        phoneNumber: clientSafeConfig.phoneNumber,
        accountName: clientSafeConfig.accountName,
        usage: {
          currentMonth: clientSafeConfig.currentMonthUsage,
          monthlyLimit: clientSafeConfig.monthlyLimit,
          currentCost: clientSafeConfig.currentMonthCost,
          costLimit: clientSafeConfig.costLimit,
          remainingMessages: Math.max(0, clientSafeConfig.monthlyLimit - clientSafeConfig.currentMonthUsage),
          remainingBudget: Math.max(0, clientSafeConfig.costLimit - clientSafeConfig.currentMonthCost)
        }
      });
    } else {
      res.json({
        success: true,
        isConnected: false,
        message: 'No Twilio account connected. Contact admin to set up SMS functionality.'
      });
    }
  } catch (error) {
    console.error('Error getting customer Twilio status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Send SMS campaign (customer)
router.post('/customer/send-sms', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // Temporary for testing
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { message, recipients, campaignId, campaignName } = req.body;

    // Validate required fields
    if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: message, recipients'
      });
    }

    // Validate phone numbers
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    for (const recipient of recipients) {
      if (!phoneRegex.test(recipient)) {
        return res.status(400).json({
          success: false,
          error: `Invalid phone number format: ${recipient}. Use international format: +1234567890`
        });
      }
    }

    const smsRequest = {
      message,
      recipients,
      campaignId: campaignId || Date.now().toString(),
      campaignName
    };

    const result = await twilioManager.sendSMS(userId, smsRequest);
    
    res.json(result);
  } catch (error) {
    console.error('Error sending SMS campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get customer's usage/billing summary
router.get('/customer/sms/usage', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // Temporary for testing
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { month, year } = req.query;
    
    const result = await twilioManager.getUserBilling(
      userId,
      month ? parseInt(month) : null,
      year ? parseInt(year) : null
    );
    
    if (result.success) {
      // Return customer-friendly billing info
      res.json({
        success: true,
        usage: {
          period: result.billing.period,
          totalMessages: result.billing.totalMessages,
          successfulMessages: result.billing.successfulMessages,
          failedMessages: result.billing.failedMessages,
          totalCost: result.billing.totalCost,
          averageCostPerMessage: result.billing.averageCostPerMessage,
          campaignBreakdown: result.billing.campaignBreakdown
        }
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error getting customer usage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Check usage limits before sending
router.get('/customer/sms/limits', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // Temporary for testing
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const result = await twilioManager.checkUsageLimits(userId);
    res.json(result);
  } catch (error) {
    console.error('Error checking usage limits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;