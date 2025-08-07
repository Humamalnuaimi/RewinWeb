const crypto = require('crypto');
const admin = require('firebase-admin');

/**
 * Multi-Tenant Twilio Service Manager
 * Handles user-specific Twilio accounts with secure credential storage
 */
class TwilioManager {
  constructor() {
    this.db = admin.firestore();
    this.encryptionKey = process.env.TWILIO_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data (auth tokens)
   */
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipherGCM(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipherGCM(algorithm, key, iv);
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Test Twilio account connection
   */
  async testTwilioConnection(accountSid, authToken, phoneNumber = null) {
    try {
      // Test basic account access
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
      }

      const accountData = await response.json();
      
      // If phone number provided, verify it exists in account
      if (phoneNumber) {
        const phoneResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json();
          const phoneExists = phoneData.incoming_phone_numbers?.some(
            phone => phone.phone_number === phoneNumber
          );

          if (!phoneExists) {
            throw new Error(`Phone number ${phoneNumber} not found in Twilio account`);
          }
        }
      }

      return {
        success: true,
        account: {
          sid: accountData.sid,
          name: accountData.friendly_name,
          status: accountData.status,
          type: accountData.type
        }
      };

    } catch (error) {
      console.error('Twilio connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Connect user to their Twilio account
   */
  async connectUserToTwilio(userId, twilioConfig) {
    try {
      const { accountSid, authToken, phoneNumber, accountName } = twilioConfig;

      // Test connection first
      const testResult = await this.testTwilioConnection(accountSid, authToken, phoneNumber);
      if (!testResult.success) {
        throw new Error(testResult.error);
      }

      // Encrypt auth token
      const encryptedToken = this.encrypt(authToken);

      // Store in Firebase
      const twilioAccountRef = this.db.collection('users').doc(userId).collection('twilio_account').doc('config');
      
      await twilioAccountRef.set({
        accountSid,
        encryptedAuthToken: encryptedToken,
        phoneNumber,
        accountName: accountName || testResult.account.name,
        accountStatus: testResult.account.status,
        accountType: testResult.account.type,
        connectionStatus: 'connected',
        lastConnectionTest: admin.firestore.FieldValue.serverTimestamp(),
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        // Billing tracking
        currentMonthUsage: 0,
        currentMonthCost: 0,
        monthlyLimit: twilioConfig.monthlyLimit || 1000,
        costLimit: twilioConfig.costLimit || 100.00
      });

      // Log connection event
      await this.logTwilioEvent(userId, 'connection', {
        accountSid,
        phoneNumber,
        status: 'connected'
      });

      return {
        success: true,
        message: 'Twilio account connected successfully',
        account: testResult.account
      };

    } catch (error) {
      console.error('Error connecting Twilio account:', error);
      
      // Log failed connection attempt
      await this.logTwilioEvent(userId, 'connection_failed', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's Twilio account configuration
   */
  async getUserTwilioConfig(userId) {
    try {
      const twilioDoc = await this.db.collection('users').doc(userId).collection('twilio_account').doc('config').get();
      
      if (!twilioDoc.exists) {
        return {
          success: false,
          error: 'No Twilio account connected'
        };
      }

      const data = twilioDoc.data();
      
      // Decrypt auth token for use (don't return it to client)
      const authToken = this.decrypt(data.encryptedAuthToken);

      return {
        success: true,
        config: {
          accountSid: data.accountSid,
          authToken, // Only used internally
          phoneNumber: data.phoneNumber,
          accountName: data.accountName,
          accountStatus: data.accountStatus,
          connectionStatus: data.connectionStatus,
          isActive: data.isActive,
          currentMonthUsage: data.currentMonthUsage || 0,
          currentMonthCost: data.currentMonthCost || 0,
          monthlyLimit: data.monthlyLimit || 1000,
          costLimit: data.costLimit || 100.00,
          lastConnectionTest: data.lastConnectionTest,
          connectedAt: data.connectedAt
        },
        // Safe data for client (no auth token)
        clientSafeConfig: {
          accountSid: data.accountSid,
          phoneNumber: data.phoneNumber,
          accountName: data.accountName,
          accountStatus: data.accountStatus,
          connectionStatus: data.connectionStatus,
          isActive: data.isActive,
          currentMonthUsage: data.currentMonthUsage || 0,
          currentMonthCost: data.currentMonthCost || 0,
          monthlyLimit: data.monthlyLimit || 1000,
          costLimit: data.costLimit || 100.00,
          lastConnectionTest: data.lastConnectionTest?.toDate(),
          connectedAt: data.connectedAt?.toDate()
        }
      };

    } catch (error) {
      console.error('Error getting Twilio config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send SMS using user's Twilio account
   */
  async sendSMS(userId, smsRequest) {
    try {
      const { message, recipients, campaignId } = smsRequest;

      // Get user's Twilio config
      const configResult = await this.getUserTwilioConfig(userId);
      if (!configResult.success) {
        throw new Error(configResult.error);
      }

      const { accountSid, authToken, phoneNumber } = configResult.config;

      // Check usage limits
      const usageCheck = await this.checkUsageLimits(userId);
      if (!usageCheck.withinLimits) {
        throw new Error(`Usage limits exceeded: ${usageCheck.reason}`);
      }

      // Send messages
      const results = await Promise.all(
        recipients.map(async (recipient) => {
          try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                To: recipient,
                From: phoneNumber,
                Body: message
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Twilio error: ${errorData.message}`);
            }

            const messageData = await response.json();

            // Log successful message
            await this.logMessage(userId, {
              messageId: messageData.sid,
              campaignId,
              recipient,
              message,
              cost: parseFloat(messageData.price || '0'),
              status: messageData.status,
              direction: 'outbound'
            });

            return {
              success: true,
              messageId: messageData.sid,
              recipient,
              cost: parseFloat(messageData.price || '0'),
              status: messageData.status
            };

          } catch (error) {
            console.error(`Failed to send SMS to ${recipient}:`, error);
            
            // Log failed message
            await this.logMessage(userId, {
              messageId: null,
              campaignId,
              recipient,
              message,
              cost: 0,
              status: 'failed',
              error: error.message,
              direction: 'outbound'
            });

            return {
              success: false,
              recipient,
              error: error.message
            };
          }
        })
      );

      // Calculate totals
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const totalCost = successful.reduce((sum, r) => sum + (r.cost || 0), 0);

      // Update monthly usage
      await this.updateMonthlyUsage(userId, successful.length, totalCost);

      return {
        success: successful.length > 0,
        results,
        summary: {
          total: recipients.length,
          successful: successful.length,
          failed: failed.length,
          totalCost
        }
      };

    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check user's usage limits
   */
  async checkUsageLimits(userId) {
    try {
      const configResult = await this.getUserTwilioConfig(userId);
      if (!configResult.success) {
        return {
          withinLimits: false,
          reason: 'No Twilio account configured'
        };
      }

      const { currentMonthUsage, currentMonthCost, monthlyLimit, costLimit } = configResult.config;

      if (currentMonthUsage >= monthlyLimit) {
        return {
          withinLimits: false,
          reason: `Monthly message limit exceeded (${currentMonthUsage}/${monthlyLimit})`
        };
      }

      if (currentMonthCost >= costLimit) {
        return {
          withinLimits: false,
          reason: `Monthly cost limit exceeded ($${currentMonthCost.toFixed(2)}/$${costLimit.toFixed(2)})`
        };
      }

      return {
        withinLimits: true,
        remaining: {
          messages: monthlyLimit - currentMonthUsage,
          cost: costLimit - currentMonthCost
        }
      };

    } catch (error) {
      console.error('Error checking usage limits:', error);
      return {
        withinLimits: false,
        reason: 'Error checking limits'
      };
    }
  }

  /**
   * Update monthly usage statistics
   */
  async updateMonthlyUsage(userId, messageCount, cost) {
    try {
      const twilioRef = this.db.collection('users').doc(userId).collection('twilio_account').doc('config');
      
      await twilioRef.update({
        currentMonthUsage: admin.firestore.FieldValue.increment(messageCount),
        currentMonthCost: admin.firestore.FieldValue.increment(cost),
        lastUsageUpdate: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating monthly usage:', error);
    }
  }

  /**
   * Log message for billing and analytics
   */
  async logMessage(userId, messageData) {
    try {
      await this.db.collection('users').doc(userId).collection('message_logs').add({
        ...messageData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging message:', error);
    }
  }

  /**
   * Log Twilio events (connections, errors, etc.)
   */
  async logTwilioEvent(userId, eventType, eventData) {
    try {
      await this.db.collection('users').doc(userId).collection('twilio_events').add({
        eventType,
        eventData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging Twilio event:', error);
    }
  }

  /**
   * Get user's billing information
   */
  async getUserBilling(userId, month = null, year = null) {
    try {
      const now = new Date();
      const targetMonth = month || now.getMonth();
      const targetYear = year || now.getFullYear();
      
      const startDate = new Date(targetYear, targetMonth, 1);
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const logsQuery = this.db.collection('users').doc(userId).collection('message_logs')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc');

      const snapshot = await logsQuery.get();
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Calculate billing statistics
      const totalMessages = logs.length;
      const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
      const successfulMessages = logs.filter(log => log.status !== 'failed').length;
      const failedMessages = totalMessages - successfulMessages;

      // Group by campaign if available
      const campaignStats = logs.reduce((stats, log) => {
        const campaignId = log.campaignId || 'direct';
        if (!stats[campaignId]) {
          stats[campaignId] = { messages: 0, cost: 0 };
        }
        stats[campaignId].messages += 1;
        stats[campaignId].cost += log.cost || 0;
        return stats;
      }, {});

      return {
        success: true,
        billing: {
          period: { month: targetMonth, year: targetYear },
          totalMessages,
          successfulMessages,
          failedMessages,
          totalCost,
          averageCostPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0,
          campaignBreakdown: campaignStats,
          logs
        }
      };

    } catch (error) {
      console.error('Error getting billing info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect user's Twilio account
   */
  async disconnectTwilioAccount(userId) {
    try {
      const twilioRef = this.db.collection('users').doc(userId).collection('twilio_account').doc('config');
      
      await twilioRef.update({
        isActive: false,
        connectionStatus: 'disconnected',
        disconnectedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log disconnection
      await this.logTwilioEvent(userId, 'disconnection', {
        status: 'disconnected'
      });

      return {
        success: true,
        message: 'Twilio account disconnected successfully'
      };

    } catch (error) {
      console.error('Error disconnecting Twilio account:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset monthly usage (typically called by a cron job)
   */
  async resetMonthlyUsage(userId) {
    try {
      const twilioRef = this.db.collection('users').doc(userId).collection('twilio_account').doc('config');
      
      await twilioRef.update({
        currentMonthUsage: 0,
        currentMonthCost: 0,
        lastReset: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };

    } catch (error) {
      console.error('Error resetting monthly usage:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TwilioManager;