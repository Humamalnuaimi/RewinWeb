import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';

export class PromotionService {
  
  // Create promotion in your user collection
  static async createPromotion(promotionData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const promotionRef = await addDoc(
        collection(firestore, 'users', user.uid, 'promotions'), 
        {
          // Basic promotion data
          title: promotionData.title,
          description: promotionData.description,
          discountType: promotionData.discountType, // "dollar" or "percentage"
          discountAmount: promotionData.discountAmount,
          minimumPurchase: promotionData.minimumPurchase || 0,
          
          // Targeting options
          targetAudience: promotionData.targetAudience || 'all', // 'all', 'specific_customers', 'outlet_customers'
          targetOutlets: promotionData.targetOutlets || [], // Array of outlet IDs
          targetCustomers: promotionData.targetCustomers || [], // Array of customer IDs
          
          // Eligibility criteria
          minVisitsRequired: promotionData.minVisitsRequired || 0,
          maxDaysSinceLastVisit: promotionData.maxDaysSinceLastVisit || 0,
          minTotalSpent: promotionData.minTotalSpent || 0,
          
          // Expiration
          expiresAt: promotionData.expiresAt || null, // Timestamp or null for no expiration
          
          // System fields
          createdAt: new Date(),
          createdBy: user.email,
          isActive: true,
          
          // Campaign linking
          campaignId: promotionData.campaignId || null,
          source: promotionData.source || 'manual' // 'manual', 'campaign_trigger', 'birthday', 'inactive'
        }
      );

      console.log('✅ Promotion created:', promotionRef.id);
      return promotionRef.id;
    } catch (error) {
      console.error('❌ Error creating promotion:', error);
      throw error;
    }
  }

  // Get all your promotions
  static async getPromotions() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const promotionsSnapshot = await getDocs(
        collection(firestore, 'users', user.uid, 'promotions')
      );

      return promotionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting promotions:', error);
      throw error;
    }
  }

  // Update promotion
  static async updatePromotion(promotionId, updateData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      await updateDoc(
        doc(firestore, 'users', user.uid, 'promotions', promotionId),
        {
          ...updateData,
          updatedAt: new Date()
        }
      );

      console.log('✅ Promotion updated:', promotionId);
    } catch (error) {
      console.error('❌ Error updating promotion:', error);
      throw error;
    }
  }

  // Delete promotion
  static async deletePromotion(promotionId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      await deleteDoc(
        doc(firestore, 'users', user.uid, 'promotions', promotionId)
      );

      console.log('✅ Promotion deleted:', promotionId);
    } catch (error) {
      console.error('❌ Error deleting promotion:', error);
      throw error;
    }
  }

  // Get customers for targeting (using existing customers collection)
  static async getCustomers() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      // Try web_customers first, then customers
      let customersSnapshot;
      try {
        customersSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'web_customers')
        );
      } catch (error) {
        console.log('Trying customers collection...');
        customersSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'customers')
        );
      }

      return customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting customers:', error);
      throw error;
    }
  }

  // Get outlets for targeting
  static async getOutlets() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const outletsSnapshot = await getDocs(
        collection(firestore, 'users', user.uid, 'outlets')
      );

      return outletsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting outlets:', error);
      throw error;
    }
  }

  // Analyze which customers are eligible for a promotion
  static analyzeCustomerEligibility(customer, promotion) {
    const eligibility = {
      eligible: true,
      reasons: []
    };

    // Check outlet targeting
    if (promotion.targetOutlets?.length > 0) {
      if (!promotion.targetOutlets.includes(customer.outletId || customer.preferredOutlet || customer.lastVisitOutlet)) {
        eligibility.eligible = false;
        eligibility.reasons.push(`Customer outlet not in target outlets`);
      }
    }

    // Check specific customer targeting
    if (promotion.targetCustomers?.length > 0) {
      if (!promotion.targetCustomers.includes(customer.id)) {
        eligibility.eligible = false;
        eligibility.reasons.push('Customer not specifically targeted');
      }
    }

    // Check audience type
    if (promotion.targetAudience === 'specific_customers' && !promotion.targetCustomers?.includes(customer.id)) {
      eligibility.eligible = false;
      eligibility.reasons.push('Customer not in specific target list');
    }

    // Check visit count
    if (promotion.minVisitsRequired > 0) {
      const customerVisits = customer.visitCount || customer.totalVisits || 0;
      if (customerVisits < promotion.minVisitsRequired) {
        eligibility.eligible = false;
        eligibility.reasons.push(`Needs ${promotion.minVisitsRequired} visits, customer has ${customerVisits}`);
      }
    }

    // Check spending
    if (promotion.minTotalSpent > 0) {
      const customerSpent = customer.totalSpent || customer.lifetimeValue || 0;
      if (customerSpent < promotion.minTotalSpent) {
        eligibility.eligible = false;
        eligibility.reasons.push(`Needs $${promotion.minTotalSpent} total spent, customer has $${customerSpent}`);
      }
    }

    // Check last visit recency
    if (promotion.maxDaysSinceLastVisit > 0) {
      if (customer.lastVisit) {
        const lastVisitDate = customer.lastVisit.toDate ? customer.lastVisit.toDate() : new Date(customer.lastVisit);
        const daysSinceLastVisit = Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24));
        if (daysSinceLastVisit > promotion.maxDaysSinceLastVisit) {
          eligibility.eligible = false;
          eligibility.reasons.push(`Customer last visited ${daysSinceLastVisit} days ago, max allowed: ${promotion.maxDaysSinceLastVisit}`);
        }
      }
    }

    // Check expiration
    if (promotion.expiresAt) {
      const now = new Date();
      const expirationDate = promotion.expiresAt.toDate ? promotion.expiresAt.toDate() : new Date(promotion.expiresAt);
      if (now > expirationDate) {
        eligibility.eligible = false;
        eligibility.reasons.push('Promotion has expired');
      }
    }

    return eligibility;
  }

  // Get detailed analytics for a promotion
  static async getPromotionAnalytics(promotionId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      // Get the promotion
      const promotions = await this.getPromotions();
      const promotion = promotions.find(p => p.id === promotionId);
      
      if (!promotion) {
        throw new Error('Promotion not found');
      }

      // Get all customers
      const customers = await this.getCustomers();

      // Analyze eligibility for each customer
      const analytics = {
        promotion,
        totalCustomers: customers.length,
        eligibleCustomers: [],
        ineligibleCustomers: [],
        eligibilityBreakdown: {
          all: 0,
          byOutlet: {},
          byVisits: {},
          bySpending: {},
          byRecency: {}
        }
      };

      customers.forEach(customer => {
        const eligibility = this.analyzeCustomerEligibility(customer, promotion);
        
        if (eligibility.eligible) {
          analytics.eligibleCustomers.push(customer);
        } else {
          analytics.ineligibleCustomers.push({
            customer,
            reasons: eligibility.reasons
          });
        }

        // Build breakdown statistics
        const outlet = customer.outletId || customer.preferredOutlet || 'No Outlet';
        if (!analytics.eligibilityBreakdown.byOutlet[outlet]) {
          analytics.eligibilityBreakdown.byOutlet[outlet] = { eligible: 0, total: 0 };
        }
        analytics.eligibilityBreakdown.byOutlet[outlet].total++;
        if (eligibility.eligible) {
          analytics.eligibilityBreakdown.byOutlet[outlet].eligible++;
        }

        // Visit count breakdown
        const visitCount = customer.visitCount || customer.totalVisits || 0;
        const visitRange = visitCount < 5 ? '0-4' : visitCount < 10 ? '5-9' : '10+';
        if (!analytics.eligibilityBreakdown.byVisits[visitRange]) {
          analytics.eligibilityBreakdown.byVisits[visitRange] = { eligible: 0, total: 0 };
        }
        analytics.eligibilityBreakdown.byVisits[visitRange].total++;
        if (eligibility.eligible) {
          analytics.eligibilityBreakdown.byVisits[visitRange].eligible++;
        }
      });

      analytics.eligibilityBreakdown.all = analytics.eligibleCustomers.length;
      analytics.eligibilityRate = analytics.totalCustomers > 0 ? (analytics.eligibleCustomers.length / analytics.totalCustomers) * 100 : 0;

      return analytics;
    } catch (error) {
      console.error('❌ Error getting promotion analytics:', error);
      throw error;
    }
  }

  // Preview promotion reach before creating
  static async previewPromotionReach(promotionData) {
    try {
      const customers = await this.getCustomers();
      
      const tempPromotion = {
        ...promotionData,
        id: 'preview'
      };

      let eligibleCount = 0;
      const breakdown = {
        byOutlet: {},
        byVisits: {},
        reasons: {}
      };

      customers.forEach(customer => {
        const eligibility = this.analyzeCustomerEligibility(customer, tempPromotion);
        if (eligibility.eligible) {
          eligibleCount++;
        } else {
          eligibility.reasons.forEach(reason => {
            breakdown.reasons[reason] = (breakdown.reasons[reason] || 0) + 1;
          });
        }

        // Outlet breakdown
        const outlet = customer.outletId || customer.preferredOutlet || 'No Outlet';
        if (!breakdown.byOutlet[outlet]) {
          breakdown.byOutlet[outlet] = { eligible: 0, total: 0 };
        }
        breakdown.byOutlet[outlet].total++;
        if (eligibility.eligible) {
          breakdown.byOutlet[outlet].eligible++;
        }
      });

      return {
        totalCustomers: customers.length,
        eligibleCustomers: eligibleCount,
        eligibilityRate: customers.length > 0 ? (eligibleCount / customers.length) * 100 : 0,
        breakdown
      };
    } catch (error) {
      console.error('❌ Error previewing promotion reach:', error);
      throw error;
    }
  }
}