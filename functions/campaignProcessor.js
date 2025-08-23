const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 🚀 SIMPLE CAMPAIGN PROCESSOR
 * Runs every hour to process all active campaigns
 */
// 🤖 CALLABLE FUNCTION - for manual dashboard triggers
exports.processCampaignsManual = functions.https.onCall(async (data, context) => {
  console.log('🚀 Manual campaign processing triggered from dashboard');
  
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const userId = context.auth.uid;
  console.log(`👤 Processing campaigns for user: ${userId}`);
  
  try {
    let totalAssigned = 0;
    
    // Get active campaigns for this user only
    const campaignsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('campaigns')
      .where('isActive', '==', true)
      .get();
    
    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaign = campaignDoc.data();
      const campaignId = campaignDoc.id;
      
      console.log(`🎯 Processing campaign: ${campaign.name}`);
      
      let result = { assigned: 0 };
      
      // Handle different trigger types
      switch (campaign.triggerType) {
        case 'birthday':
          result = await processBirthdayCampaign(userId, campaignId, campaign);
          break;
        case 'inactive_custom':
          result = await processInactiveCustomCampaign(userId, campaignId, campaign);
          break;
        case 'inactive_15':
          result = await processInactiveCampaign(userId, campaignId, campaign, 15);
          break;
        case 'inactive_30':
          result = await processInactiveCampaign(userId, campaignId, campaign, 30);
          break;
        case 'inactive':
          const days = campaign.inactiveDays || campaign.daysSinceLastVisit || 30;
          result = await processInactiveCampaign(userId, campaignId, campaign, days);
          break;
      }
      
      totalAssigned += result.assigned;
      
      // Update last processed
      await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .doc(campaignId)
        .update({
          lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
          lastProcessedBy: 'cloud_function_manual',
          lastRunResult: `Manual Cloud Function: ${result.assigned} assigned`
        });
    }
    
    console.log(`✅ Manual processing complete: ${totalAssigned} total assigned`);
    return { success: true, assigned: totalAssigned };
    
  } catch (error) {
    console.error('❌ Manual processing error:', error);
    throw new functions.https.HttpsError('internal', 'Processing failed');
  }
});

// 🕐 SCHEDULED FUNCTION - runs automatically every hour
exports.processCampaigns = functions.pubsub.schedule('0 * * * *').onRun(async (context) => {
  console.log('⏰ Campaign processor running...');
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
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
        
        // Check if should process
        const lastProcessed = campaign.lastProcessed?.toDate?.();
        const intervalHours = campaign.autoProcessing?.intervalHours || 24;
        
        if (lastProcessed) {
          const hoursSinceLastRun = (Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastRun < intervalHours) {
            continue; // Skip, not time yet
          }
        }
        
        // Process the campaign
        console.log(`Processing ${campaign.name} for user ${userId}`);
        
        let result = { assigned: 0 };
        
        // Handle different trigger types
        switch (campaign.triggerType) {
          case 'birthday':
            result = await processBirthdayCampaign(userId, campaignId, campaign);
            break;
          case 'inactive_custom':
            result = await processInactiveCustomCampaign(userId, campaignId, campaign);
            break;
          case 'inactive_15':
            result = await processInactiveCampaign(userId, campaignId, campaign, 15);
            break;
          case 'inactive_30':
            result = await processInactiveCampaign(userId, campaignId, campaign, 30);
            break;
          case 'inactive':
            // Default inactive - use campaign settings or 30 days
            const days = campaign.inactiveDays || campaign.daysSinceLastVisit || 30;
            result = await processInactiveCampaign(userId, campaignId, campaign, days);
            break;
        }
        
        // Update last processed
        await db
          .collection('users')
          .doc(userId)
          .collection('campaigns')
          .doc(campaignId)
          .update({
            lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
            lastProcessedBy: 'cloud_function_auto',
            lastRunResult: `Cloud Function: ${result.assigned} assigned`,
            lastCloudRun: admin.firestore.FieldValue.serverTimestamp()
          });
      }
    }
    
    console.log('✅ Campaign processing complete');
    return null;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
});

// Process birthday campaigns
async function processBirthdayCampaign(userId, campaignId, campaign) {
  const today = new Date();
  const todayMM = String(today.getMonth() + 1).padStart(2, '0');
  const todayDD = String(today.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMM}-${todayDD}`;
  const currentYear = today.getFullYear();
  
  console.log(`🎂 Processing birthday campaign for ${todayMMDD}`);
  
  // Get customers
  const customersSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('customers')
    .get();
  
  let assigned = 0;
  
  for (const customerDoc of customersSnapshot.docs) {
    const customer = customerDoc.data();
    const customerId = customerDoc.id;
    
    // Skip inactive customers
    if (customer.isActive === false) continue;
    
    // Check birthday - handle multiple formats
    const birthDate = customer.birthDate || customer.dateOfBirth || customer.birthday;
    if (!birthDate) continue;
    
    let matchesBirthday = false;
    
    if (typeof birthDate === 'string') {
      // Direct MM-DD match
      if (birthDate === todayMMDD) {
        matchesBirthday = true;
      }
      // MM-DD-YYYY or YYYY-MM-DD
      else if (birthDate.includes('-') && birthDate.length > 5) {
        const parts = birthDate.split('-');
        if (parts.length >= 3) {
          let monthDay = '';
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            monthDay = `${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            // MM-DD-YYYY
            monthDay = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
          if (monthDay === todayMMDD) {
            matchesBirthday = true;
          }
        }
      }
      // MM/DD/YYYY
      else if (birthDate.includes('/')) {
        const parts = birthDate.split('/');
        if (parts.length >= 2) {
          const monthDay = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          if (monthDay === todayMMDD) {
            matchesBirthday = true;
          }
        }
      }
    } else if (birthDate?.toDate) {
      // Firestore Timestamp
      const date = birthDate.toDate();
      const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (monthDay === todayMMDD) {
        matchesBirthday = true;
      }
    }
    
    if (!matchesBirthday) continue;
    
    console.log(`🎉 Birthday match for ${customer.firstName || customerId}`);
    
    // Check if already has promotion this year
    const promotionId = `promo_birthday_${customerId}_${currentYear}`;
    const existingPromo = await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .doc(promotionId)
      .get();
    
    if (existingPromo.exists) {
      console.log(`⏭️ Already has birthday promotion`);
      continue;
    }
    
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
          new Date(Date.now() + (campaign.expirationDays || 7) * 24 * 60 * 60 * 1000)
        ),
        source: 'campaign_birthday',
        campaignId: campaignId,
        targetOutlets: campaign.outletIds || ['ALL']
      });
    
    assigned++;
    console.log(`🎁 Birthday promotion created for ${customer.firstName || customerId}`);
  }
  
  console.log(`🎂 Birthday campaign complete: ${assigned} assigned`);
  return { assigned };
}

// Process inactive custom campaign (like your 12+ days)
async function processInactiveCustomCampaign(userId, campaignId, campaign) {
  const customDays = campaign.daysSinceLastVisit || 15;
  return processInactiveCampaign(userId, campaignId, campaign, customDays);
}

// Process inactive customer campaigns
async function processInactiveCampaign(userId, campaignId, campaign, inactiveDays) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  
  console.log(`💤 Processing inactive campaign (${inactiveDays}+ days)`);
  
  // Get customers
  const customersSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('customers')
    .get();
  
  let assigned = 0;
  
  for (const customerDoc of customersSnapshot.docs) {
    const customer = customerDoc.data();
    const customerId = customerDoc.id;
    
    // Skip inactive customers
    if (customer.isActive === false) continue;
    
    // Check last visit
    const lastVisit = customer.lastVisit?.toDate?.() || customer.lastVisit;
    if (!lastVisit) continue;
    
    const lastVisitDate = lastVisit instanceof Date ? lastVisit : new Date(lastVisit);
    if (lastVisitDate > cutoffDate) continue;
    
    const daysSinceVisit = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`😴 Customer ${customer.firstName || customerId} inactive for ${daysSinceVisit} days`);
    
    // Check if already has this campaign's promotion
    const promotionId = `promo_inactive_${customerId}_${campaignId}`;
    const existingPromo = await db
      .collection('users')
      .doc(userId)
      .collection('customerPromotions')
      .doc(customerId)
      .collection('promotions')
      .doc(promotionId)
      .get();
    
    if (existingPromo.exists && existingPromo.data().isActive) {
      console.log(`⏭️ Already has inactive promotion`);
      continue;
    }
    
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
          new Date(Date.now() + (campaign.expirationDays || 7) * 24 * 60 * 60 * 1000)
        ),
        source: 'campaign_inactive',
        campaignId: campaignId,
        targetOutlets: campaign.outletIds || ['ALL']
      });
    
    assigned++;
    console.log(`💤 Inactive promotion created for ${customer.firstName || customerId}`);
  }
  
  console.log(`💤 Inactive campaign complete: ${assigned} assigned`);
  return { assigned };
}