import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';
import { PromotionService } from './PromotionService';

export class CampaignService {
  
  // Create campaign in your user collection
  static async createCampaign(campaignData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const payload = {
          // Campaign details
          name: campaignData.name,
          description: campaignData.description || '',
          triggerType: campaignData.triggerType, // 'birthday', 'inactive', 'manual', 'first_visit'
          
          // Promotion details that will be created for customers
          promotionTitle: campaignData.promotionTitle,
          promotionDescription: campaignData.promotionDescription || '',
          discountType: campaignData.discountType || 'percentage',
          discountAmount: campaignData.discountAmount || 10,
          minimumPurchase: campaignData.minimumPurchase || 0,
          
          // Trigger conditions
          triggerConditions: {
            daysInactive: campaignData.daysInactive || null, // For inactive campaigns
            birthdayDaysBefore: campaignData.birthdayDaysBefore || 0, // For birthday campaigns
            minVisitsBeforeTrigger: campaignData.minVisitsBeforeTrigger || 0,
            minSpendingBeforeTrigger: campaignData.minSpendingBeforeTrigger || 0
          },
          
          // Targeting
          targetOutlets: campaignData.targetOutlets || [],
          targetAudience: campaignData.targetAudience || 'all',
          
          // SMS integration
          sendSMS: campaignData.sendSMS || false,
          smsMessage: campaignData.smsMessage || '',
          
          // System fields
          createdAt: campaignData.createdAt || Timestamp.now(),
          createdBy: user.email,
          isActive: campaignData.isActive ?? true,
          
          // Statistics
          totalTriggered: 0,
          lastTriggered: null
        };

      // Single source of truth used by dashboard/automations: users/{uid}/campaigns
      const campaignRef = await addDoc(
        collection(firestore, 'users', user.uid, 'campaigns'), 
        payload
      );

      console.log('✅ Campaign created:', campaignRef.id);
      return campaignRef.id;
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      throw error;
    }
  }

  // Utilities to build deterministic IDs
  static buildBirthdayPromotionId(customerId: string, year: number) {
    return `promo_birthday_${customerId}_${year}`;
  }

  static buildInactivePromotionId(customerId: string, yyyymmdd: string) {
    return `promo_inactive_${customerId}_${yyyymmdd}`;
  }

  // Get all your campaigns
  static async getCampaigns() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const snap = await getDocs(collection(firestore, 'users', user.uid, 'campaigns'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('❌ Error getting campaigns:', error);
      throw error;
    }
  }

  // Update campaign
  static async updateCampaign(campaignId, updateData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const updatePayload = { ...updateData, updatedAt: Timestamp.now() } as any;
      await updateDoc(doc(firestore, 'users', user.uid, 'campaigns', campaignId), updatePayload);

      console.log('✅ Campaign updated:', campaignId);
    } catch (error) {
      console.error('❌ Error updating campaign:', error);
      throw error;
    }
  }

  // Delete campaign
  static async deleteCampaign(campaignId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      await deleteDoc(doc(firestore, 'users', user.uid, 'campaigns', campaignId));

      console.log('✅ Campaign deleted:', campaignId);
    } catch (error) {
      console.error('❌ Error deleting campaign:', error);
      throw error;
    }
  }

  // Manually trigger campaign for specific customers
  static async triggerCampaignForCustomers(campaignId, customerIds) {
    try {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const results = [];
      
      for (const customerId of customerIds) {
        try {
          // Create a customer-specific promotion based on campaign
          const promotionId = await PromotionService.createPromotion({
            title: campaign.promotionTitle,
            description: campaign.promotionDescription,
            discountType: campaign.discountType,
            discountAmount: campaign.discountAmount,
            minimumPurchase: campaign.minimumPurchase,
            targetOutlets: campaign.targetOutlets || [],
            targetAudience: 'specific_customers',
            targetCustomers: [customerId],
            campaignId: campaignId,
            source: campaign.triggerType === 'birthday' ? 'campaign_birthday' :
                    campaign.triggerType === 'inactive' ? 'campaign_inactive' : 'manual'
          });

          results.push({ customerId, promotionId, success: true });
          console.log(`✅ Campaign triggered for customer ${customerId}, promotion: ${promotionId}`);
        } catch (error) {
          results.push({ customerId, error: error.message, success: false });
          console.error(`❌ Failed to trigger campaign for customer ${customerId}:`, error);
        }
      }

      // Update campaign statistics
      await this.updateCampaign(campaignId, {
        totalTriggered: (campaign.totalTriggered || 0) + results.filter(r => r.success).length,
        lastTriggered: new Date()
      });

      return results;
    } catch (error) {
      console.error('❌ Error triggering campaign:', error);
      throw error;
    }
  }

  // Analyze which customers would be affected by a campaign
  static async analyzeCampaignReach(campaignId) {
    try {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const customers = await PromotionService.getCustomers();
      
      const analysis = {
        campaign,
        totalCustomers: customers.length,
        potentialTargets: [],
        excludedCustomers: [],
        breakdown: {
          byOutlet: {},
          byTriggerType: {},
          byEligibility: {}
        }
      };

      customers.forEach(customer => {
        let isTarget = true;
        const reasons = [];

        // Check outlet targeting
        if (campaign.targetOutlets?.length > 0) {
          const customerOutlet = customer.outletId || customer.preferredOutlet || customer.lastVisitOutlet;
          if (!campaign.targetOutlets.includes(customerOutlet)) {
            isTarget = false;
            reasons.push('Customer not in target outlets');
          }
        }

        // Check trigger-specific conditions
        if (campaign.triggerType === 'inactive' && campaign.triggerConditions.daysInactive) {
          if (customer.lastVisit) {
            const lastVisitDate = customer.lastVisit.toDate ? customer.lastVisit.toDate() : new Date(customer.lastVisit);
            const daysSinceLastVisit = Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastVisit < campaign.triggerConditions.daysInactive) {
              isTarget = false;
              reasons.push(`Customer not inactive long enough (${daysSinceLastVisit} days)`);
            }
          } else {
            isTarget = false;
            reasons.push('Customer has no last visit date');
          }
        }

        if (campaign.triggerType === 'birthday') {
          if (!customer.dateOfBirth && !customer.birthday) {
            isTarget = false;
            reasons.push('Customer has no birthday on file');
          }
        }

        // Check minimum visits
        if (campaign.triggerConditions.minVisitsBeforeTrigger > 0) {
          const customerVisits = customer.visitCount || customer.totalVisits || 0;
          if (customerVisits < campaign.triggerConditions.minVisitsBeforeTrigger) {
            isTarget = false;
            reasons.push(`Customer needs ${campaign.triggerConditions.minVisitsBeforeTrigger} visits, has ${customerVisits}`);
          }
        }

        // Check minimum spending
        if (campaign.triggerConditions.minSpendingBeforeTrigger > 0) {
          const customerSpent = customer.totalSpent || customer.lifetimeValue || 0;
          if (customerSpent < campaign.triggerConditions.minSpendingBeforeTrigger) {
            isTarget = false;
            reasons.push(`Customer needs $${campaign.triggerConditions.minSpendingBeforeTrigger} spent, has $${customerSpent}`);
          }
        }

        // Build breakdown statistics
        const outlet = customer.outletId || customer.preferredOutlet || 'No Outlet';
        if (!analysis.breakdown.byOutlet[outlet]) {
          analysis.breakdown.byOutlet[outlet] = { targets: 0, total: 0 };
        }
        analysis.breakdown.byOutlet[outlet].total++;

        if (isTarget) {
          analysis.potentialTargets.push(customer);
          analysis.breakdown.byOutlet[outlet].targets++;
        } else {
          analysis.excludedCustomers.push({ customer, reasons });
        }
      });

      analysis.reachRate = analysis.totalCustomers > 0 ? (analysis.potentialTargets.length / analysis.totalCustomers) * 100 : 0;

      // Additional analytics
      analysis.breakdown.byTriggerType[campaign.triggerType] = analysis.potentialTargets.length;
      analysis.estimatedPromotions = analysis.potentialTargets.length;

      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing campaign reach:', error);
      throw error;
    }
  }

  // Preview campaign reach before creating
  static async previewCampaignReach(campaignData) {
    try {
      const customers = await PromotionService.getCustomers();
      
      let potentialTargets = 0;
      const breakdown = {
        byOutlet: {},
        exclusionReasons: {}
      };

      customers.forEach(customer => {
        let isTarget = true;
        const reasons = [];

        // Check outlet targeting
        if (campaignData.targetOutlets?.length > 0) {
          const customerOutlet = customer.outletId || customer.preferredOutlet || customer.lastVisitOutlet;
          if (!campaignData.targetOutlets.includes(customerOutlet)) {
            isTarget = false;
            reasons.push('Customer not in target outlets');
          }
        }

        // Check trigger conditions based on type
        if (campaignData.triggerType === 'inactive' && campaignData.daysInactive) {
          if (customer.lastVisit) {
            const lastVisitDate = customer.lastVisit.toDate ? customer.lastVisit.toDate() : new Date(customer.lastVisit);
            const daysSinceLastVisit = Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastVisit < campaignData.daysInactive) {
              isTarget = false;
              reasons.push('Not inactive long enough');
            }
          }
        }

        if (campaignData.triggerType === 'birthday') {
          if (!customer.dateOfBirth && !customer.birthday) {
            isTarget = false;
            reasons.push('No birthday on file');
          }
        }

        // Outlet breakdown
        const outlet = customer.outletId || customer.preferredOutlet || 'No Outlet';
        if (!breakdown.byOutlet[outlet]) {
          breakdown.byOutlet[outlet] = { targets: 0, total: 0 };
        }
        breakdown.byOutlet[outlet].total++;

        if (isTarget) {
          potentialTargets++;
          breakdown.byOutlet[outlet].targets++;
        } else {
          reasons.forEach(reason => {
            breakdown.exclusionReasons[reason] = (breakdown.exclusionReasons[reason] || 0) + 1;
          });
        }
      });

      return {
        totalCustomers: customers.length,
        potentialTargets,
        reachRate: customers.length > 0 ? (potentialTargets / customers.length) * 100 : 0,
        breakdown
      };
    } catch (error) {
      console.error('❌ Error previewing campaign reach:', error);
      throw error;
    }
  }

  // Get campaign performance statistics
  static async getCampaignStats(campaignId) {
    try {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get all promotions created by this campaign
      const promotions = await PromotionService.getPromotions();
      const campaignPromotions = promotions.filter(p => p.campaignId === campaignId);

      const stats = {
        campaign,
        totalPromotionsCreated: campaignPromotions.length,
        totalTriggered: campaign.totalTriggered || 0,
        lastTriggered: campaign.lastTriggered,
        isActive: campaign.isActive,
        createdAt: campaign.createdAt,
        
        // Promotion breakdown
        promotions: campaignPromotions.map(p => ({
          id: p.id,
          title: p.title,
          createdAt: p.createdAt,
          isActive: p.isActive,
          targetCustomers: p.targetCustomers?.length || 0
        }))
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting campaign stats:', error);
      throw error;
    }
  }
}