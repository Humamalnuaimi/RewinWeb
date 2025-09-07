import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';

export class PromotionService {
  
  // Get business ID for a user
  static async getBusinessIdForUser(uid: string): Promise<string | null> {
    try {
      // First check if user has a businessId in their profile
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      const userData = userDoc.data();
      if (userData?.businessId) {
        return userData.businessId;
      }
      
      // Otherwise, query businesses collection
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('ownerId', '==', uid),
        where('isActive', '==', true)
      );
      const businessSnapshot = await getDocs(businessQuery);
      
      if (!businessSnapshot.empty) {
        return businessSnapshot.docs[0].id;
      }
      
      // Fallback to default if no business found
      return 'esZRrfTvOdOgqsx9Dvo8';
    } catch (error) {
      console.error('Error getting business ID:', error);
      return null;
    }
  }
  
  // Create promotion in your user collection
  static async createPromotion(promotionData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      // Validate required fields to prevent creating incomplete promotions
      if (!promotionData.title || !promotionData.title.trim()) {
        throw new Error('Promotion title is required');
      }
      
      // Description is optional; default to empty string
      
      if (!promotionData.discountAmount || promotionData.discountAmount <= 0) {
        throw new Error('Discount amount must be greater than 0');
      }
      
      if (!promotionData.discountType || !['dollar', 'percentage'].includes(promotionData.discountType)) {
        throw new Error('Valid discount type (dollar or percentage) is required');
      }
      
      if (promotionData.discountType === 'percentage' && promotionData.discountAmount > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Mobile App Targeting Specification:
      // - Empty array [] = "All customers everywhere"
      // - Array with outlet IDs = "All customers in specific outlets"
      const normalizedTargetOutlets = Array.isArray(promotionData.targetOutlets)
        ? promotionData.targetOutlets
        : (promotionData.targetOutlets === 'ALL' ? [] : []);

      // Get business ID for the user
      const businessId = await this.getBusinessIdForUser(user.uid);
      
      const payload = {
          // Required fields for mobile app
          title: promotionData.title,
          description: (promotionData.description ?? '').toString(),
          discountType: promotionData.discountType, // "dollar" or "percentage"
          discountAmount: promotionData.discountAmount,
          minimumPurchase: promotionData.minimumPurchase || 0,
          isActive: promotionData.isActive ?? true,
          
          // Date fields
          startDate: promotionData.startDate || null, // When promotion starts
          endDate: promotionData.endDate || null,     // When promotion ends
          expiresAt: promotionData.expiresAt || null, // Expiration timestamp
          createdAt: promotionData.createdAt || Timestamp.now(),
          
          // Targeting fields
          businessId: businessId || '', // Business ID for business-based system
          targetOutletId: promotionData.targetOutletId || '', // Single outlet ID
          targetOutletName: promotionData.targetOutletName || '', // Outlet name for display
          targetOutlets: normalizedTargetOutlets, // Array of outlet IDs (backward compatibility)
          
          // Metadata
          type: 'PROMOTION', // Required by mobile app
          source: promotionData.source || 'manual', // 'manual', 'campaign_inactive', etc.
          createdBy: user.email || user.uid,
          
          // User-based targeting fields (SIMPLIFIED - customer-specific targeting removed)
          targetAudience: promotionData.targetAudience || 'all', // Only 'all' supported now
          minVisitsRequired: promotionData.minVisitsRequired || 0,
          maxDaysSinceLastVisit: promotionData.maxDaysSinceLastVisit || 0,
          minTotalSpent: promotionData.minTotalSpent || 0,
          
          // Campaign linking
          campaignId: promotionData.campaignId || null,
          
          // Note: isUsed is NOT included as per mobile app team guidance
        };

      // Single source of truth used by the app: users/{uid}/promotions
      const promotionRef = await addDoc(
        collection(firestore, 'users', user.uid, 'promotions'), 
        payload
      );

      console.log('✅ Promotion created:', promotionRef.id);
      return promotionRef.id;
    } catch (error) {
      console.error('❌ Error creating promotion:', error);
      throw error;
    }
  }

  // Create/Update promotion with a deterministic ID (idempotent upsert)
  static async upsertPromotionWithId(promotionId: string, promotionData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const normalizedTargetOutlets = Array.isArray(promotionData.targetOutlets)
        ? promotionData.targetOutlets
        : (promotionData.targetOutlets === 'ALL' ? [] : []);

      // Get business ID for the user
      const businessId = await this.getBusinessIdForUser(user.uid);

      const payload: any = {
        // Required fields for mobile app
        title: promotionData.title,
        description: promotionData.description || '',
        discountType: promotionData.discountType,
        discountAmount: promotionData.discountAmount,
        minimumPurchase: promotionData.minimumPurchase || 0,
        isActive: promotionData.isActive ?? true,
        
        // Date fields
        startDate: promotionData.startDate || null,
        endDate: promotionData.endDate || null,
        expiresAt: promotionData.expiresAt || null,
        createdAt: promotionData.createdAt || Timestamp.now(),
        
        // Targeting fields
        businessId: businessId || '',
        targetOutletId: promotionData.targetOutletId || '',
        targetOutletName: promotionData.targetOutletName || '',
        targetOutlets: normalizedTargetOutlets,
        
        // Metadata
        type: 'PROMOTION',
        source: promotionData.source || 'manual',
        createdBy: promotionData.createdBy || user.email || user.uid,
        
        // User-based targeting fields
        targetAudience: promotionData.targetAudience || 'all',
        targetCustomers: promotionData.targetCustomers || [],
        minVisitsRequired: promotionData.minVisitsRequired || 0,
        maxDaysSinceLastVisit: promotionData.maxDaysSinceLastVisit || 0,
        minTotalSpent: promotionData.minTotalSpent || 0,
        
        // Campaign linking
        campaignId: promotionData.campaignId || null
      };

      await setDoc(doc(firestore, 'users', user.uid, 'promotions', promotionId), payload, { merge: true });
      console.log('✅ Promotion upserted with ID:', promotionId);
      return promotionId;
    } catch (error) {
      console.error('❌ Error upserting promotion:', error);
      throw error;
    }
  }

  // Get all your promotions
  static async getPromotions() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const snap = await getDocs(collection(firestore, 'users', user.uid, 'promotions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

      const updatePayload = { ...updateData, updatedAt: Timestamp.now() } as any;
      await updateDoc(doc(firestore, 'users', user.uid, 'promotions', promotionId), updatePayload);

      console.log('✅ Promotion updated:', promotionId);
    } catch (error) {
      console.error('❌ Error updating promotion:', error);
      throw error;
    }
  }

  // Delete promotion and ALL assignments created from it
  static async deletePromotion(promotionId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      // 1) Delete master promotion
      await deleteDoc(doc(firestore, 'users', user.uid, 'promotions', promotionId));

      // 2) Delete per-customer assignments in users path
      const customersRef = collection(firestore, 'users', user.uid, 'customerPromotions');
      const customersSnapshot = await getDocs(customersRef);
      let deletedCount = 0;
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        const promosRef = collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions');
        const q = query(promosRef, where('masterPromotionId', '==', promotionId));
        const promosSnap = await getDocs(q);
        for (const p of promosSnap.docs) {
          await deleteDoc(p.ref);
          deletedCount++;
        }
      }

      // 3) Mirror delete in businesses path (for mobile app)
      const bizId = await this.getBusinessIdForUser(user.uid);
      if (bizId) {
        const bizCustomersRef = collection(firestore, 'businesses', bizId, 'customerPromotions');
        const bizCustomersSnap = await getDocs(bizCustomersRef);
        for (const customerDoc of bizCustomersSnap.docs) {
          const customerId = customerDoc.id;
          const promosRef = collection(firestore, 'businesses', bizId, 'customerPromotions', customerId, 'promotions');
          const q = query(promosRef, where('masterPromotionId', '==', promotionId));
          const promosSnap = await getDocs(q);
          for (const p of promosSnap.docs) {
            await deleteDoc(p.ref);
            deletedCount++;
          }
        }
      }

      console.log(`✅ Promotion deleted and ${deletedCount} customer assignments removed`);
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

    // Check outlet targeting (HOME OUTLET ONLY)
    // - Empty targetOutlets [] = all outlets, but customer MUST have a home outlet
    const homeOutletId = customer.outletId || (customer.outlet && customer.outlet.id) || null;
    if (!homeOutletId) {
      eligibility.eligible = false;
      eligibility.reasons.push('Customer has no home outlet');
    } else if (promotion.targetOutlets?.length > 0) {
      if (!promotion.targetOutlets.includes(homeOutletId)) {
        eligibility.eligible = false;
        eligibility.reasons.push('Customer home outlet not in target outlets');
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
      const lv = customer.lastVisit || customer.lastVisitAt || customer.lastCheckInAt;
      if (lv) {
        const lastVisitDate = lv.toDate ? lv.toDate() : new Date(lv);
        const daysSinceLastVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
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

      // Fallback safeguard: if no explicit constraints and nothing is eligible,
      // default to include all customers (prevents zero-eligibility due to field drift)
      const noOutletConstraint = !promotion.targetOutlets || promotion.targetOutlets.length === 0;
      const noSpecificCustomers = !promotion.targetCustomers || promotion.targetCustomers.length === 0;
      const noVisitConstraint = !promotion.minVisitsRequired || promotion.minVisitsRequired <= 0;
      const noSpendConstraint = !promotion.minTotalSpent || promotion.minTotalSpent <= 0;
      const noRecencyConstraint = !promotion.maxDaysSinceLastVisit || promotion.maxDaysSinceLastVisit <= 0;
      const notExpired = !promotion.expiresAt || (new Date() <= (promotion.expiresAt.toDate ? promotion.expiresAt.toDate() : new Date(promotion.expiresAt)));

      if (
        analytics.totalCustomers > 0 &&
        analytics.eligibleCustomers.length === 0 &&
        noOutletConstraint &&
        noSpecificCustomers &&
        noVisitConstraint &&
        noSpendConstraint &&
        noRecencyConstraint &&
        notExpired
      ) {
        analytics.eligibleCustomers = customers;
        analytics.ineligibleCustomers = [];
        analytics.eligibilityBreakdown.all = customers.length;
        analytics.eligibilityRate = 100;
      }

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
