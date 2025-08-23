const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin
admin.initializeApp();
const db = admin.firestore();

// 🕐 SCHEDULED FUNCTION - Runs every hour automatically
exports.processCampaigns = functions.scheduler.onSchedule('0 * * * *', async (event) => {
  console.log('⏰ Automated campaign processing started...');
  
  try {
    let totalProcessed = 0;
    let totalAssigned = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`👥 Found ${usersSnapshot.docs.length} users to process`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`👤 Processing user: ${userId}`);
      
      // Get active campaigns with automation enabled
      const campaignsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('campaigns')
        .where('isActive', '==', true)
        .where('autoProcessing.enabled', '==', true)
        .get();
      
      console.log(`🎯 Found ${campaignsSnapshot.docs.length} automated campaigns for user ${userId}`);
      
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data();
        const campaignId = campaignDoc.id;
        
        console.log(`🔄 Checking campaign: ${campaign.name || campaignId}`);
        
        // Check if should run based on interval
        const lastProcessed = campaign.lastProcessed?.toDate?.();
        const intervalHours = campaign.autoProcessing?.intervalHours || 24;
        
        if (lastProcessed) {
          const hoursSince = (Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60);
          console.log(`⏱️ Hours since last processed: ${hoursSince.toFixed(2)}, Required interval: ${intervalHours}`);
          
          if (hoursSince < intervalHours) {
            console.log(`⏭️ Skipping ${campaign.name} - not time yet (${hoursSince.toFixed(1)}h < ${intervalHours}h)`);
            continue; // Skip - not time yet
          }
        }
        
        console.log(`🎯 Auto-processing campaign: ${campaign.name || campaignId}`);
        
        let result = { assigned: 0 };
        
        // Process based on trigger type
        if (campaign.triggerType === 'birthday') {
          result = await processBirthdayCampaign(userId, campaignId, campaign);
        } else if (campaign.triggerType.includes('inactive')) {
          const days = campaign.daysSinceLastVisit || 30;
          result = await processInactiveCampaign(userId, campaignId, campaign, days);
        }
        
        totalAssigned += result.assigned;
        totalProcessed++;
        
        // Update campaign with automation metadata
        await db
          .collection('users')
          .doc(userId)
          .collection('campaigns')
          .doc(campaignId)
          .update({
            lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
            lastProcessedBy: 'cloud_function_auto',
            lastRunResult: `Auto: ${result.assigned} assigned`,
            lastCloudRun: admin.firestore.FieldValue.serverTimestamp(),
            'autoProcessing.lastRun': admin.firestore.FieldValue.serverTimestamp(),
            'autoProcessing.totalRuns': admin.firestore.FieldValue.increment(1)
          });
        
        console.log(`✅ Campaign ${campaign.name} processed: ${result.assigned} assignments`);
      }
    }
    
    console.log(`🎉 Automated processing complete! Processed ${totalProcessed} campaigns, assigned ${totalAssigned} promotions`);
    
    return { 
      success: true, 
      processed: totalProcessed, 
      assigned: totalAssigned,
      users: usersSnapshot.docs.length
    };
    
  } catch (error) {
    console.error('❌ Automated processing error:', error);
    return { success: false, error: error.message };
  }
});

// Helper functions (simplified versions)
async function processBirthdayCampaign(userId, campaignId, campaign) {
  const today = new Date();
  const todayMM = String(today.getMonth() + 1).padStart(2, '0');
  const todayDD = String(today.getDate()).padStart(2, '0');
  const todayMMDD = `${todayMM}-${todayDD}`;
  
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
    
    // Create promotion
    const timestamp = Date.now();
    const promotionId = `promo_birthday_${customerId}_${campaignId}_${new Date().getFullYear()}_${timestamp}`;
    
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
    
    // Create promotion
    const timestamp = Date.now();
    const promotionId = `promo_inactive_${customerId}_${campaignId}_${timestamp}`;
    
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
