const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin
admin.initializeApp();
const db = admin.firestore();

// 🤖 CALLABLE FUNCTION - Manual trigger from dashboard
exports.processCampaignsManual = functions.https.onCall(async (data, context) => {
  console.log('🚀 Manual campaign processing triggered');
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const userId = context.auth.uid;
  console.log(`👤 Processing campaigns for user: ${userId}`);
  
  try {
    let totalAssigned = 0;
    
    // Get active campaigns for this user
    const campaignsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .where('isActive', '==', true)
      .get();
    
    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data();
      const campaignId = campaignDoc.id;
      
      console.log(`🎯 Processing: ${campaign.name}`);
      
      let result = { assigned: 0 };
      
      // Process based on trigger type
      if (campaign.triggerType === 'birthday') {
        result = await processBirthdayCampaign(userId, campaignId, campaign);
      } else if (campaign.triggerType.includes('inactive')) {
        const days = campaign.daysSinceLastVisit || 30;
        result = await processInactiveCampaign(userId, campaignId, campaign, days);
      }
      
      totalAssigned += result.assigned;
      
      // Update campaign
      await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .doc(campaignId)
        .update({
          lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
          lastProcessedBy: 'cloud_function_manual',
          lastRunResult: `Manual: ${result.assigned} assigned`
        });
    }
    
    console.log(`✅ Complete: ${totalAssigned} total assigned`);
    return { success: true, assigned: totalAssigned };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw new functions.https.HttpsError('internal', 'Processing failed');
  }
});

// 🕐 SCHEDULED FUNCTION - Runs every hour automatically
exports.processCampaigns = functions.pubsub.schedule('0 * * * *').onRun(async (context) => {
  console.log('⏰ Automated campaign processing...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get active campaigns with automation enabled
      const campaignsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .where('isActive', '==', true)
        .where('autoProcessing.enabled', '==', true)
        .get();
      
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        const campaignId = campaignDoc.id;
        
        // Check if should run based on interval
        const lastProcessed = campaign.lastProcessed?.toDate?.();
        const intervalHours = campaign.autoProcessing?.intervalHours || 24;
        
        if (lastProcessed) {
          const hoursSince = (Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60);
          if (hoursSince < intervalHours) {
            continue; // Skip - not time yet
          }
        }
        
        console.log(`🎯 Auto-processing: ${campaign.name}`);
        
        let result = { assigned: 0 };
        
        // Process based on trigger type
        if (campaign.triggerType === 'birthday') {
          result = await processBirthdayCampaign(userId, campaignId, campaign);
        } else if (campaign.triggerType.includes('inactive')) {
          const days = campaign.daysSinceLastVisit || 30;
          result = await processInactiveCampaign(userId, campaignId, campaign, days);
        }
        
        // Update campaign
        await db
          .collection('users')
          .doc(userId)
          .collection('campaigns')
          .doc(campaignId)
          .update({
            lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
            lastProcessedBy: 'cloud_function_auto',
            lastRunResult: `Auto: ${result.assigned} assigned`,
            lastCloudRun: admin.firestore.FieldValue.serverTimestamp()
          });
      }
    }
    
    console.log('✅ Automated processing complete');
    return null;
    
  } catch (error) {
    console.error('❌ Automated processing error:', error);
    return null;
  }
});

// Helper: Process birthday campaigns
async function processBirthdayCampaign(userId, campaignId, campaign) {
  const today = new Date();
  const todayMM = String(today.getMonth() + 1).padStart(2, '0');
  const todayDD = String(today.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMM}-${todayDD}`;
  const currentYear = today.getFullYear();
  
  console.log(`🎂 Birthday check for ${todayMMDD}`);
  
  const customersSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('customers')
    .get();
  
  let assigned = 0;
  
  for (const customerDoc of customersSnapshot.docs) {
    const customer = customerDoc.data();
    const customerId = customerDoc.id;
    
    if (customer.isActive === false) continue;
    
    // Check birthday
    const birthDate = customer.birthDate || customer.dateOfBirth || customer.birthday;
    if (!birthDate) continue;
    
    let matchesBirthday = false;
    
    if (typeof birthDate === 'string') {
      if (birthDate === todayMMDD || birthDate.includes(todayMMDD)) {
        matchesBirthday = true;
      }
    }
    
    if (!matchesBirthday) continue;
    
    // Check if customer already has an ACTIVE birthday promotion this year from this campaign
    // Now that app sets isActive: false on redemption, this is simple and efficient!
    const existingBirthdayQuery = await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .where('campaignId', '==', campaignId)
      .where('source', '==', 'campaign_birthday')
      .where('isActive', '==', true)
      .get();
    
    // Check if any existing ACTIVE birthday promotion is from this year
    let hasActiveThisYearPromo = false;
    for (const doc of existingBirthdayQuery.docs) {
      const promoData = doc.data();
      const promoCreatedAt = promoData.createdAt?.toDate?.() || new Date(promoData.createdAt);
      
      if (promoCreatedAt.getFullYear() === currentYear) {
        hasActiveThisYearPromo = true;
        console.log(`⏭️ Customer ${customerId} has active birthday promotion from this year`);
        break;
      }
    }
    
    if (hasActiveThisYearPromo) continue;
    
    // Create unique promotion ID with timestamp
    const timestamp = Date.now();
    const promotionId = `promo_birthday_${customerId}_${campaignId}_${currentYear}_${timestamp}`;
    
    // Create promotion
    await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .doc(promotionId)
      .set({
        title: campaign.name || 'Happy Birthday!',
        description: 'Special Birthday Offer!',
        discountType: campaign.discountType || 'percentage',
        discountAmount: campaign.discountAmount || 20,
        minimumPurchase: campaign.minimumPurchase || 0,
        isActive: true,
        isUsed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
        source: 'campaign_birthday',
        campaignId: campaignId,
        targetOutlets: campaign.outletIds || ['ALL']
      });
    
    assigned++;
    console.log(`🎁 Birthday promotion for ${customer.firstName || customerId}`);
  }
  
  return { assigned };
}

// Helper: Process inactive customer campaigns
async function processInactiveCampaign(userId, campaignId, campaign, inactiveDays) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  
  console.log(`💤 Inactive check (${inactiveDays}+ days)`);
  
  const customersSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('customers')
    .get();
  
  let assigned = 0;
  
  for (const customerDoc of customersSnapshot.docs) {
    const customer = customerDoc.data();
    const customerId = customerDoc.id;
    
    if (customer.isActive === false) continue;
    
    // Check last visit
    const lastVisit = customer.lastVisit?.toDate?.() || customer.lastVisit;
    if (!lastVisit) continue;
    
    const lastVisitDate = lastVisit instanceof Date ? lastVisit : new Date(lastVisit);
    if (lastVisitDate > cutoffDate) continue;
    
    // Check if customer already has an ACTIVE promotion from this campaign
    // Now that app sets isActive: false on redemption, this is simple and efficient!
    const existingActivePromosQuery = await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .where('campaignId', '==', campaignId)
      .where('isActive', '==', true)
      .get();
    
    if (!existingActivePromosQuery.empty) {
      console.log(`⏭️ Customer ${customerId} already has active promotion from this campaign`);
      continue; // Skip - customer already has active (unused) promotion from this campaign
    }
    
    // Create unique promotion ID with timestamp to allow multiple assignments over time
    const timestamp = Date.now();
    const promotionId = `promo_inactive_${customerId}_${campaignId}_${timestamp}`;
    
    // Create promotion
    await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .doc(promotionId)
      .set({
        title: campaign.name || 'We Miss You!',
        description: 'Special Welcome Back Offer!',
        discountType: campaign.discountType || 'dollar',
        discountAmount: campaign.discountAmount || 5,
        minimumPurchase: campaign.minimumPurchase || 10,
        isActive: true,
        isUsed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
        source: 'campaign_inactive',
        campaignId: campaignId,
        targetOutlets: campaign.outletIds || ['ALL']
      });
    
    assigned++;
    console.log(`💤 Inactive promotion for ${customer.firstName || customerId}`);
  }
  
  return { assigned };
}