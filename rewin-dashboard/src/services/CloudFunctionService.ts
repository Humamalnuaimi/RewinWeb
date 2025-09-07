import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebase/config';

/**
 * 🚀 CLOUD FUNCTION SERVICE
 * 
 * Service for interacting with Firebase Cloud Functions
 * for production-ready campaign automation
 */

export class CloudFunctionService {
  
  /**
   * 🤖 MANUALLY TRIGGER CAMPAIGN PROCESSING
   * 
   * Calls the Firebase Cloud Function to process campaigns
   * for the authenticated user
   */
  static async processCampaignsManually() {
    try {
      console.log('🚀 Triggering manual campaign processing via Cloud Function...');
      
      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to process campaigns');
      }
      
      console.log('👤 Authenticated user:', currentUser.uid);
      console.log('📧 User email:', currentUser.email);
      
      // Get the auth token
      const token = await currentUser.getIdToken(true);
      console.log('🔑 Got auth token:', token.substring(0, 20) + '...');
      
      // Get the callable function
      const processCampaignsManual = httpsCallable(functions, 'processCampaignsManual');
      
      // Call the function
      const result = await processCampaignsManual();
      
      console.log('✅ Cloud Function result:', result.data);
      return { ...result.data, cloudFunction: true };
      
    } catch (error) {
      console.error('❌ Error calling Cloud Function:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    }
  }
  
  /**
   * 📊 GET CAMPAIGN PROCESSING STATUS
   * 
   * Check the status of automated campaign processing
   */
  static async getCampaignProcessingStatus() {
    try {
      // This would call a status function if we implement one
      console.log('📊 Getting campaign processing status...');
      
      // For now, return a placeholder
      return {
        isRunning: true,
        lastRun: new Date(),
        nextRun: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        totalProcessed: 0
      };
      
    } catch (error) {
      console.error('❌ Error getting processing status:', error);
      throw error;
    }
  }
  
  /**
   * 🔧 TEST CLOUD FUNCTION CONNECTION
   * 
   * Test if Cloud Functions are properly deployed and accessible
   */
  static async testConnection() {
    try {
      console.log('🔧 Testing Cloud Function connection...');
      
      // Try to call the manual processing function with no data
      const processCampaignsManual = httpsCallable(functions, 'processCampaignsManual');
      await processCampaignsManual();
      
      return { connected: true, message: 'Cloud Functions are accessible' };
      
    } catch (error) {
      console.error('❌ Cloud Function connection test failed:', error);
      
      if (error.code === 'functions/not-found') {
        return { 
          connected: false, 
          message: 'Cloud Functions not deployed. Run: firebase deploy --only functions' 
        };
      }
      
      return { 
        connected: false, 
        message: `Connection failed: ${error.message}` 
      };
    }
  }
}
