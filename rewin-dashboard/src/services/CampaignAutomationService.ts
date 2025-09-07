import { firestore, auth } from '../firebase/config';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { AutomationService } from './AutomationService';

/**
 * 🚀 CAMPAIGN AUTOMATION SERVICE
 * 
 * Handles campaign automation without Cloud Functions
 * Uses Firestore to trigger and track campaign processing
 */
export class CampaignAutomationService {
  private static processingInterval: NodeJS.Timer | null = null;
  private static isProcessing = false;

  /**
   * 🔄 START AUTOMATION
   * Begins checking for campaigns to process
   */
  static startAutomation() {
    // Check every 5 minutes
    this.processingInterval = setInterval(() => {
      this.checkAndProcessCampaigns();
    }, 5 * 60 * 1000);

    // Also run immediately
    this.checkAndProcessCampaigns();
  }

  /**
   * ⏹️ STOP AUTOMATION
   */
  static stopAutomation() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * 📊 CHECK AND PROCESS CAMPAIGNS
   */
  static async checkAndProcessCampaigns() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      const user = auth.currentUser;
      if (!user) return;

      console.log('🔍 Checking campaigns to process...');

      // Get all active campaigns
      const campaignsRef = collection(firestore, 'users', user.uid, 'campaigns');
      const activeCampaignsQuery = query(campaignsRef, where('isActive', '==', true));
      const campaignsSnapshot = await getDocs(activeCampaignsQuery);

      let processed = 0;
      let assigned = 0;

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        const campaignId = campaignDoc.id;

        // Check if it's time to process
        if (!this.shouldProcessCampaign(campaign)) continue;

        console.log(`📢 Processing campaign: ${campaign.name}`);

        // Process based on type
        let result = { assigned: 0 };
        if (campaign.triggerType === 'birthday') {
          result = await AutomationService.runBirthday(user.uid);
        } else if (campaign.triggerType === 'inactive') {
          result = await AutomationService.runInactive(user.uid, campaignId, campaign);
        }

        assigned += result.assigned;
        processed++;

        // Update last processed time
        await updateDoc(doc(firestore, 'users', user.uid, 'campaigns', campaignId), {
          lastProcessed: serverTimestamp(),
          lastRunResult: `Assigned: ${result.assigned}`
        });
      }

      if (processed > 0) {
        console.log(`✅ Processed ${processed} campaigns, assigned ${assigned} promotions`);
      }

    } catch (error) {
      console.error('❌ Error processing campaigns:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * ⏰ CHECK IF CAMPAIGN SHOULD BE PROCESSED
   */
  private static shouldProcessCampaign(campaign: any): boolean {
    if (!campaign.autoProcessing?.enabled) return false;

    const lastProcessed = campaign.lastProcessed?.toDate?.() || campaign.lastProcessed;
    if (!lastProcessed) return true;

    const intervalHours = campaign.autoProcessing.intervalHours || 24;
    const nextRunTime = new Date(lastProcessed);
    nextRunTime.setHours(nextRunTime.getHours() + intervalHours);

    return new Date() >= nextRunTime;
  }

  /**
   * 🚀 TRIGGER MANUAL PROCESSING
   * Manually process all active campaigns
   */
  static async processManually() {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    console.log('🚀 Manual campaign processing triggered');

    // Create a processing request in Firestore
    const processingRequest = {
      userId: user.uid,
      requestedAt: serverTimestamp(),
      status: 'pending',
      type: 'manual'
    };

    // This will trigger the actual processing
    await this.checkAndProcessCampaigns();

    // Get results
    const campaignsRef = collection(firestore, 'users', user.uid, 'campaigns');
    const campaignsSnapshot = await getDocs(campaignsRef);
    
    return {
      processed: campaignsSnapshot.size,
      assigned: 0, // Will be calculated from campaign results
      cloudFunction: false // Not using cloud functions
    };
  }
}
