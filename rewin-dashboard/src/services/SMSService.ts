import { auth } from '../firebase/config';

export class SMSService {
  // 📱 SMS SERVICE INTEGRATION (Production-Ready with Multi-Account Support)
  static async sendSMSMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('⚠️ No authenticated user - SMS not sent');
        return;
      }

      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      
      // Get the business ID for this user
      const businessId = await this.getCurrentBusinessId();
      
      // Find the account and phone number to use for this business
      const accountPhoneNumber = await this.getAccountPhoneNumberForBusiness(businessId);
      
      if (!accountPhoneNumber) {
        console.log(`⚠️ No SMS phone number configured for business ${businessId} - SMS not sent`);
        return;
      }
      
      // Send SMS using the new multi-tenant Twilio system
      const response = await fetch('http://localhost:5001/api/twilio/customer/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          to: phoneNumber,
          message: message
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ SMS sent successfully to ${phoneNumber} via ${accountPhoneNumber}`);
        console.log(`💰 Cost: $${result.cost?.toFixed(4) || '0'}`);
      } else {
        console.error(`❌ Failed to send SMS to ${phoneNumber}: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      // Don't throw error - SMS failure shouldn't break promotion creation
    }
  }

  // 🔍 Get the phone number configured for a business account
  private static async getAccountPhoneNumberForBusiness(businessId: string): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:5001/api/twilio/accounts');
      const accounts = await response.json();
      
      if (!Array.isArray(accounts)) {
        console.log('⚠️ No Twilio accounts configured');
        return null;
      }
      
      // Find account for this business
      const businessAccount = accounts.find(account => 
        account.businessIds && account.businessIds.includes(businessId)
      );
      
      if (businessAccount && businessAccount.phoneNumber) {
        return businessAccount.phoneNumber;
      }
      
      // Fallback to first available account if no specific business mapping
      const fallbackAccount = accounts.find(account => account.phoneNumber);
      return fallbackAccount?.phoneNumber || null;
      
    } catch (error) {
      console.error('❌ Error getting account phone number:', error);
      return null;
    }
  }

  // 🏢 Get current business ID for the authenticated user
  private static async getCurrentBusinessId(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    
    // For now, return the user's UID as business ID
    // This can be enhanced later to fetch from user profile
    return user.uid;
  }

  // 📞 Check if customer is eligible for SMS (has phone number and opted in)
  static isCustomerSMSEligible(customer: any): boolean {
    const hasPhoneNumber = customer.phoneNumber && customer.phoneNumber.trim();
    const isOptedIn = customer.optedInForSMS === true || customer.optedInForSMS === undefined; // Default to true if not set
    const hasValidPhoneFormat = hasPhoneNumber && /^\+[1-9]\d{1,14}$/.test(customer.phoneNumber.trim());
    
    return hasPhoneNumber && isOptedIn && hasValidPhoneFormat;
  }

  // 📱 Normalize phone number to international format
  static normalizePhoneNumber(phoneNumber: string): string {
    let normalized = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // Add country code if missing
    if (!normalized.startsWith('1') && normalized.length === 10) {
      normalized = `1${normalized}`;
    }
    
    // Add + prefix
    if (!normalized.startsWith('+')) {
      normalized = `+${normalized}`;
    }
    
    return normalized;
  }
}
