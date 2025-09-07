import { collection, getDocs, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';
import { CustomerPromotionService } from './CustomerPromotionService';
import { CampaignService } from './CampaignService';
import { SMSService } from './SMSService';

export class AutomationService {
  // Run birthday automation for today (timezone-neutral, uses local date by default)
  static async runBirthday(options?: { timezoneOffsetMinutes?: number; ttlDays?: number; campaignId?: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const tzOffset = options?.timezoneOffsetMinutes ?? 0;
    const now = new Date(Date.now() + tzOffset * 60_000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const customersRef = collection(firestore, 'users', user.uid, 'customers');
    const snap = await getDocs(customersRef);

    const ttlDays = options?.ttlDays ?? 14;
    const expires = new Date(now);
    expires.setDate(expires.getDate() + ttlDays);

    // 📱 Get campaign SMS message if campaignId is provided
    let campaignSMSMessage: string | null = null;
    if (options?.campaignId) {
      try {
        const campaignDoc = await getDoc(doc(firestore, 'users', user.uid, 'campaigns', options.campaignId));
        if (campaignDoc.exists()) {
          const campaignData = campaignDoc.data();
          campaignSMSMessage = campaignData.smsMessage || null;
          console.log(`📱 Birthday campaign SMS message: ${campaignSMSMessage ? 'Found' : 'Not set'}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not retrieve campaign SMS message:', error);
      }
    }

    let created = 0;
    let smsSent = 0;
    let skipped = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as any;
      const dob = c.dateOfBirth || c.birthday;
      if (!dob) continue;
      const d = dob.toDate ? dob.toDate() : new Date(dob);
      if (String(d.getMonth() + 1).padStart(2, '0') === mm && String(d.getDate()).padStart(2, '0') === dd) {
        const promoId = CampaignService.buildBirthdayPromotionId(docSnap.id, yyyy);
        
        // Check if customer already has this birthday promotion (prevents duplicates)
        try {
          const existingPromo = await getDoc(doc(firestore, 'users', user.uid, 'customerPromotions', docSnap.id, 'promotions', promoId));
          if (existingPromo.exists()) {
            console.log(`⏭️ Skipping ${c.firstName || docSnap.id} - already has birthday promotion for ${yyyy}`);
            skipped++;
            continue;
          }
        } catch (error) {
          console.warn(`⚠️ Could not check existing birthday promotion for ${docSnap.id}:`, error);
        }
        
        // Create the promotion
        await CustomerPromotionService.upsertBoth(docSnap.id, promoId, {
          title: 'Happy Birthday!',
          description: 'Enjoy your special day with a reward',
          discountType: 'percentage',
          discountAmount: 20,
          minimumPurchase: 0,
          expiresAt: Timestamp.fromDate(expires),
          isActive: true,
          createdAt: Timestamp.now(),
          source: 'campaign_birthday',
          campaignId: options?.campaignId || null
        });
        created++;

        // 📱 Send SMS if campaign has SMS message and customer is eligible
        if (campaignSMSMessage && SMSService.isCustomerSMSEligible(c)) {
          try {
            const normalizedPhone = SMSService.normalizePhoneNumber(c.phoneNumber);
            await SMSService.sendSMSMessage(normalizedPhone, campaignSMSMessage);
            smsSent++;
            console.log(`📱 Birthday SMS sent to ${c.firstName || docSnap.id}: ${normalizedPhone}`);
          } catch (smsError) {
            console.warn(`⚠️ Failed to send birthday SMS to ${docSnap.id}:`, smsError);
          }
        }
      }
    }
    
    console.log(`🎂 Birthday automation complete: ${created} promotions created, ${smsSent} SMS sent, ${skipped} skipped (already have promotion)`);
    return { created, smsSent, skipped };
  }

  // Run inactivity automation for customers inactive for N days
  static async runInactive(options: { daysInactive: number; ttlDays?: number; campaignId?: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    if (!options?.daysInactive || options.daysInactive < 1) throw new Error('daysInactive must be >= 1');

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - options.daysInactive);

    const customersRef = collection(firestore, 'users', user.uid, 'customers');
    const snap = await getDocs(customersRef);

    const ttlDays = options?.ttlDays ?? 10;
    const expires = new Date(now);
    expires.setDate(expires.getDate() + ttlDays);

    // 📱 Get campaign SMS message if campaignId is provided
    let campaignSMSMessage: string | null = null;
    if (options?.campaignId) {
      try {
        const campaignDoc = await getDoc(doc(firestore, 'users', user.uid, 'campaigns', options.campaignId));
        if (campaignDoc.exists()) {
          const campaignData = campaignDoc.data();
          campaignSMSMessage = campaignData.smsMessage || null;
          console.log(`📱 Inactive campaign SMS message: ${campaignSMSMessage ? 'Found' : 'Not set'}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not retrieve campaign SMS message:', error);
      }
    }

    let created = 0;
    let smsSent = 0;
    let skipped = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as any;
      const lv = c.lastVisit || c.lastVisitAt || c.lastCheckInAt;
      if (!lv) continue;
      const last = lv.toDate ? lv.toDate() : new Date(lv);
      if (last <= cutoff) {
        // Use campaignId instead of date to prevent daily duplicates
        const campaignId = options?.campaignId || 'default_inactive';
        const promoId = CampaignService.buildInactivePromotionId(docSnap.id, campaignId);
        
        // Check if customer already has this promotion (prevents duplicates)
        try {
          const existingPromo = await getDoc(doc(firestore, 'users', user.uid, 'customerPromotions', docSnap.id, 'promotions', promoId));
          if (existingPromo.exists()) {
            console.log(`⏭️ Skipping ${c.firstName || docSnap.id} - already has inactive promotion for this campaign`);
            skipped++;
            continue;
          }
        } catch (error) {
          console.warn(`⚠️ Could not check existing promotion for ${docSnap.id}:`, error);
        }
        
        // Create the promotion
        await CustomerPromotionService.upsertBoth(docSnap.id, promoId, {
          title: 'We Miss You!',
          description: 'Come back and enjoy a special reward',
          discountType: 'dollar',
          discountAmount: 5,
          minimumPurchase: 10,
          expiresAt: Timestamp.fromDate(expires),
          isActive: true,
          createdAt: Timestamp.now(),
          source: 'campaign_inactive',
          campaignId: options?.campaignId || null
        });
        created++;

        // 📱 Send SMS if campaign has SMS message and customer is eligible
        if (campaignSMSMessage && SMSService.isCustomerSMSEligible(c)) {
          try {
            const normalizedPhone = SMSService.normalizePhoneNumber(c.phoneNumber);
            await SMSService.sendSMSMessage(normalizedPhone, campaignSMSMessage);
            smsSent++;
            console.log(`📱 Inactive customer SMS sent to ${c.firstName || docSnap.id}: ${normalizedPhone}`);
          } catch (smsError) {
            console.warn(`⚠️ Failed to send inactive customer SMS to ${docSnap.id}:`, smsError);
          }
        }
      }
    }
    
    console.log(`💤 Inactive customer automation complete: ${created} promotions created, ${smsSent} SMS sent, ${skipped} skipped (already have promotion)`);
    return { created, smsSent, skipped };
  }

  // 🔄 Clean up inactive promotions when customer visits (resets their inactive status)
  static async resetCustomerInactiveStatus(customerId: string, campaignId?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    try {
      // If specific campaignId provided, only clean that campaign's promotion
      if (campaignId) {
        const promoId = CampaignService.buildInactivePromotionId(customerId, campaignId);
        const promoRef = doc(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions', promoId);
        
        // Check if promotion exists and is unused
        const promoDoc = await getDoc(promoRef);
        if (promoDoc.exists()) {
          const promoData = promoDoc.data();
          if (!promoData.isUsed) {
            // Mark as expired/inactive so customer can get new one when they become inactive again
            await updateDoc(promoRef, {
              isActive: false,
              expiredReason: 'customer_returned',
              expiredAt: Timestamp.now()
            });
            console.log(`🔄 Reset inactive status for customer ${customerId}, campaign ${campaignId}`);
          }
        }
      } else {
        // Clean all inactive promotions for this customer (if no specific campaign)
        const promotionsRef = collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions');
        const snapshot = await getDocs(promotionsRef);
        
        let resetCount = 0;
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (data.source === 'campaign_inactive' && !data.isUsed && data.isActive) {
            await updateDoc(doc.ref, {
              isActive: false,
              expiredReason: 'customer_returned',
              expiredAt: Timestamp.now()
            });
            resetCount++;
          }
        }
        
        if (resetCount > 0) {
          console.log(`🔄 Reset ${resetCount} inactive promotions for customer ${customerId}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not reset inactive status for customer ${customerId}:`, error);
    }
  }
}


