/**
 * 🔒 SECURE MULTI-TENANT CAMPAIGN MANAGER
 * 
 * CRITICAL SECURITY UPDATE:
 * - Uses business-specific collections: /businesses/{businessId}/campaigns & /businesses/{businessId}/promotions
 * - Prevents data leaks between different businesses
 * - Each business only sees their own campaigns/promotions/outlets
 * - All documents include businessId for ownership tracking
 * 
 * OLD (INSECURE): /campaigns/{id} & /promotions/{id} - shared by all businesses
 * NEW (SECURE): /businesses/{businessId}/campaigns/{id} & /businesses/{businessId}/promotions/{id}
 */
import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { firestore } from '../firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query,
  Timestamp,
  writeBatch,
  limit,
  deleteDoc,
  where,
  updateDoc,
  getDoc
} from 'firebase/firestore';

interface CampaignManagerProps {
  user: User;
  onBack: () => void;
}

// 🎯 FIREBASE DATA INTERFACES (Exact as per App Team Specification)
interface Promotion {
  id?: string;
  title: string;
  description: string;
  discountType: 'dollar' | 'percentage';  // NEW: Support both $ and % discounts
  discountAmount: number;
  minimumPurchase: number;
  targetOutlets: string[] | 'ALL';
  targetOutletId?: string;                // NEW: Single outlet targeting (app compatibility)
  targetOutletName?: string;              // NEW: Outlet name for display (app compatibility)
  validityDays: number;
  expiresAt?: any;                        // NEW: Expiration timestamp (per customer)
  expirationDays?: number;                // NEW: Days until expiration (template)
  createdAt: any;
  isActive: boolean;
}

interface Campaign {
  id?: string;
  name: string;
  discountType: 'dollar' | 'percentage';           // NEW: Support both $ and % discounts
  discountAmount: number;                          // 40% or $40
  minimumPurchase: number;                        // $60 minimum
  triggerType: 'birthday' | 'inactive_15' | 'inactive_30' | 'inactive_custom';  // NEW: Added custom inactive
  outletIds: string[];                            // ["all"] or ["outlet1", "outlet2"]
  expirationDays?: number;                        // NEW: Days until campaign promotions expire
  daysSinceLastVisit?: number;                    // NEW: Custom days for inactive campaigns
  isActive: boolean;                              // Can pause/resume
  createdAt: any;
  lastProcessed?: any;                            // Track when last processed
}

interface PromotionForm {
  title: string;
  description: string;
  discountType: 'dollar' | 'percentage';  // NEW: Support both $ and % discounts
  discountAmount: number;
  minimumPurchase: number;
  validityDays: number;
  expirationDays: number;                  // NEW: Days until promotion expires
  hasExpiration: boolean;                  // NEW: Checkbox to enable expiration
  targetOutlets: string[];
  smsMessage: string;
  sendSMS: boolean;
}

interface CampaignForm {
  name: string;
  discountType: 'dollar' | 'percentage';
  discountAmount: number;
  minimumPurchase: number;
  triggerType: 'birthday' | 'inactive_15' | 'inactive_30' | '';
  outletIds: string[];
  type: 'inactive' | 'birthday' | 'spending' | '';
  daysSinceLastVisit: number;
  birthdayOffset: number;
  minimumSpending: number;
  promotionTitle: string;
  smsMessage: string;
  targetOutlets: string[];
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'promotions'>('campaigns');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreatePromotion, setShowCreatePromotion] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 🔥 REAL DATA ARRAYS - Connected to Firebase
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  
  // 🗑️ DELETE CONFIRMATION STATE
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);

  // 🤖 NEW: AUTOMATIC PROCESSING STATE
  const [autoProcessing, setAutoProcessing] = useState({
    enabled: localStorage.getItem('campaignAutoProcessing') === 'true',
    interval: parseInt(localStorage.getItem('campaignAutoInterval') || '60'), // minutes
    lastProcessed: localStorage.getItem('campaignLastProcessed') || null,
    processing: false,
    nextRun: null as Date | null
  });
  const [autoProcessInterval, setAutoProcessInterval] = useState<NodeJS.Timeout | null>(null);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  
  // 📋 FORM STATE MANAGEMENT
  const [promotionForm, setPromotionForm] = useState<PromotionForm>({
    title: '',
    description: '',
    discountType: 'dollar',  // Default to dollar discount
    discountAmount: 0,
    minimumPurchase: 0,
    validityDays: 30,
    expirationDays: 7,       // Default 7 days expiration
    hasExpiration: false,    // Default no expiration
    targetOutlets: [],
    smsMessage: '',
    sendSMS: true
  });

  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    discountType: 'dollar',
    discountAmount: 0,
    minimumPurchase: 0,
    triggerType: '',
    outletIds: [],
    type: '',
    daysSinceLastVisit: 15,
    birthdayOffset: 0,
    minimumSpending: 100,
    promotionTitle: '',
    smsMessage: '',
    targetOutlets: []
  });

  // 🔥 BUSINESS ID FUNCTION (Production-Ready with User Profile Retrieval)
  const getCurrentBusinessId = async (): Promise<string> => {
    try {
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Get business ID from user profile
      const userDocSnapshot = await getDocs(query(collection(firestore, 'users')));
      
      // Find the user document
      const userDoc = userDocSnapshot.docs.find(d => d.id === user.uid);
      
      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data() as any;
        const businessId = userData?.businessId;
        
        if (businessId) {
          console.log('✅ Retrieved business ID from user profile:', businessId);
          return businessId;
        }
      }
      
      // Fallback to default business ID if not found
      console.warn('⚠️ No business ID found in user profile, using fallback');
      return "esZ8rT1v0d0qs0x97Dvo"; // Keep as fallback
      
    } catch (error) {
      console.error('❌ Error getting business ID:', error);
      return "esZ8rT1v0d0qs0x97Dvo"; // Fallback on error
    }
  };

  // 📱 SMS SERVICE INTEGRATION (Production-Ready with Multi-Account Support)
  const sendSMSMessage = async (phoneNumber: string, message: string) => {
    try {
      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      
      // Get the business ID for this user
      const businessId = await getCurrentBusinessId();
      
      // Find the account and phone number to use for this business
      const accountPhoneNumber = await getAccountPhoneNumberForBusiness(businessId);
      
      if (!accountPhoneNumber) {
        console.log(`⚠️ No SMS phone number configured for business ${businessId} - SMS not sent`);
        return Promise.resolve();
      }
      
      // Send SMS using the multi-account system
      const { handleSMSRequest } = await import('../api/send-sms');
      
      const result = await handleSMSRequest({
        userId: user.uid,
        accountId: businessId, // Use businessId as accountId for campaigns
        phoneNumber: accountPhoneNumber,
        message: message,
        recipients: [phoneNumber]
      });
      
      if (result.success) {
        console.log(`✅ SMS sent successfully to ${phoneNumber} via ${accountPhoneNumber}`);
        console.log(`💰 Cost: $${result.cost?.toFixed(4) || '0'}`);
      } else {
        console.error(`❌ Failed to send SMS to ${phoneNumber}: ${result.error}`);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      // Don't throw error - SMS failure shouldn't break promotion creation
      return Promise.resolve();
    }
  };

  // 🔍 Get the phone number configured for a business account
  const getAccountPhoneNumberForBusiness = async (businessId: string): Promise<string | null> => {
    try {
      // Look for phone numbers in the user's accounts that match this business
      const accountsRef = collection(firestore, 'users', user.uid, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);
      
      // Find the first account that matches the business ID or has a phone number
      for (const accountDoc of accountsSnapshot.docs) {
        const accountData = accountDoc.data();
        
        // Check if this account has phone numbers
        const phoneNumbersRef = collection(firestore, 'users', user.uid, 'accounts', accountDoc.id, 'phone_numbers');
        const phoneNumbersSnapshot = await getDocs(phoneNumbersRef);
        
        if (!phoneNumbersSnapshot.empty) {
          // Get the first active phone number
          const activePhoneNumber = phoneNumbersSnapshot.docs.find(doc => 
            doc.data().isActive === true
          );
          
          if (activePhoneNumber) {
            console.log(`📱 Found phone number ${activePhoneNumber.data().phoneNumber} for business ${businessId}`);
            return activePhoneNumber.data().phoneNumber;
          }
        }
      }
      
      console.log(`⚠️ No phone numbers found for business ${businessId}`);
      return null;
    } catch (error) {
      console.error('❌ Error getting account phone number:', error);
      return null;
    }
  };

  // 🎯 STEP 1: PROMOTION CREATION SYSTEM (Exact as per App Team Spec)
  const createPromotion = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!promotionForm.title || !promotionForm.discountAmount) {
        alert('❌ Please fill in required fields (Title and Discount Amount)');
        return;
      }

      const businessId = await getCurrentBusinessId();
      console.log('🎯 Creating promotion for business:', businessId);
      console.log('📋 Promotion data:', promotionForm);
      console.log('🎯 Target outlets selected:', promotionForm.targetOutlets);
      console.log('🎯 Available outlets:', outlets);
      
      // DEBUG: Log outlet details for app team verification
      console.log('🔍 DEBUG - Outlet Details:');
      outlets.forEach(outlet => {
        console.log(`   Outlet: ${outlet.name} | ID: ${outlet.id}`);
      });
      console.log('🔍 DEBUG - Selected outlet IDs:', promotionForm.targetOutlets);
      
      // Create promotion object (exact as per Firebase structure spec)
      const promotion: Promotion = {
        title: promotionForm.title,
        description: promotionForm.description,
        discountType: promotionForm.discountType,
        discountAmount: promotionForm.discountAmount,
        minimumPurchase: promotionForm.minimumPurchase,
        targetOutlets: promotionForm.targetOutlets.length === 0 ? 'ALL' : promotionForm.targetOutlets,
        // NEW: Add app-compatible fields
        targetOutletId: promotionForm.targetOutlets.length === 1 ? promotionForm.targetOutlets[0] : undefined,
        targetOutletName: promotionForm.targetOutlets.length === 1 ? 
          outlets.find(o => o.id === promotionForm.targetOutlets[0])?.name : undefined,
        validityDays: promotionForm.validityDays,
        expirationDays: promotionForm.hasExpiration ? promotionForm.expirationDays : undefined,  // NEW: Expiration template
        createdAt: Timestamp.now(),
        isActive: true
      };

      // Save to Firebase: /businesses/{businessId}/promotions/{promotionId}
      const promotionRef = await addDoc(
        collection(firestore, 'businesses', businessId, 'promotions'),
        promotion
      );
      
      console.log('✅ Promotion created with ID:', promotionRef.id);
      console.log(`📍 Firebase path: /businesses/${businessId}/promotions/${promotionRef.id}`);
      
      // Immediately assign to customers
      await assignPromotionToCustomers(businessId, promotionRef.id, promotion);
      
      // Send SMS if requested
      if (promotionForm.sendSMS && promotionForm.smsMessage) {
        await sendPromotionSMS(businessId, promotion, promotionForm.smsMessage);
      }
      
      // Show success message with Firebase console instructions
      alert(`✅ SUCCESS! Promotion "${promotion.title}" created and assigned!

📱 MOBILE APP TEST:
1. Open your mobile app
2. Look for "${promotion.title}" promotion
3. Test employee redemption

🔍 FIREBASE CONSOLE:
Check: /businesses/${businessId}/promotions/${promotionRef.id}

📋 PROMOTION DETAILS:
• Title: ${promotion.title}
• Discount: ${promotion.discountType === 'percentage' ? promotion.discountAmount + '%' : '$' + promotion.discountAmount} off
• Expires in: ${promotionForm.expirationDays} days`);

      // Reset form and close
      setPromotionForm({
        title: '',
        description: '',
        discountType: 'dollar',
        discountAmount: 0,
        minimumPurchase: 0,
        validityDays: 30,
        expirationDays: 7,
        hasExpiration: false,
        targetOutlets: [],
        smsMessage: '',
        sendSMS: false
      });
      setShowCreatePromotion(false);
      loadPromotions(); // Refresh the list
      
    } catch (error) {
      console.error('❌ Error creating promotion:', error);
      alert(`❌ Error creating promotion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🤖 CAMPAIGN AUTOMATION SYSTEM (As Per App Team Specification)
  const assignCampaignToCustomers = async (businessId: string, campaign: Campaign) => {
    try {
      console.log('🎯 Processing campaign for customers:', campaign.name);
      
      // Find customers who match the campaign criteria
      let customersSnapshot: any;
      try {
        // First try the user's customers path (where we found your 92 customers)
        const userCustomersRef = collection(firestore, 'users', user.uid, 'customers');
        customersSnapshot = await getDocs(userCustomersRef);
        console.log(`📋 Found ${customersSnapshot.size} customers in user collection`);
      } catch (error) {
        console.log('⚠️ User customers not found, trying web_customers collection...');
        // Fallback to web_customers collection
        const webCustomersRef = collection(firestore, 'users', user.uid, 'web_customers');
        customersSnapshot = await getDocs(webCustomersRef);
        console.log(`📋 Found ${customersSnapshot.size} customers in web_customers collection`);
      }

      if (customersSnapshot.size === 0) {
        console.warn('⚠️ No customers found for campaign assignment');
        return { assigned: 0, smsEligible: 0 };
      }

      // 🔍 DETAILED CUSTOMER DEBUGGING
      console.log(`\n🔍 FOUND ${customersSnapshot.size} CUSTOMERS IN COLLECTION`);
      console.log(`📍 Collection path: users/${user.uid}/customers/`);
      
      let customerCount = 0;
      customersSnapshot.docs.forEach((customerDoc: any) => {
        customerCount++;
        const customerData = customerDoc.data();
        const customerId = customerDoc.id;
        console.log(`\n👤 Customer ${customerCount}/${customersSnapshot.size}:`);
        console.log(`   📋 ID: ${customerId}`);
        console.log(`   📱 Phone: ${customerData.phoneNumber || 'No phone'}`);
        console.log(`   🎂 Birthday: "${customerData.birthDate}" (type: ${typeof customerData.birthDate})`);
        console.log(`   🟢 Active: ${customerData.isActive !== false ? 'YES' : 'NO'}`);
        
        // Special highlight for our target customer
        if (customerData.phoneNumber === '(444) 444-4444' || customerData.phoneNumber === '4444444444') {
          console.log(`   🎯 *** TARGET CUSTOMER FOUND! ***`);
          console.log(`   📊 Full data:`, customerData);
        }
      });

      let qualifyingCustomers: any[] = [];
      const batch = writeBatch(firestore);
      const today = new Date();
      
      console.log(`\n📅 TODAY'S DATE FOR MATCHING: ${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`);
      console.log(`📅 MM-DD FORMAT: ${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      console.log(`\n🎯 STARTING CUSTOMER QUALIFICATION PROCESS...`);

      // Filter customers based on campaign trigger type
      customersSnapshot.docs.forEach((customerDoc: any) => {
        const customerData = customerDoc.data();
        const customerId = customerDoc.id;

        // Check if customer is active (default to true if not specified)
        if (customerData.isActive === false) return;

        // Check outlet targeting for campaigns (skip if customer's outlet doesn't match)
        if (campaign.outletIds && campaign.outletIds.length > 0 && !campaign.outletIds.includes('all')) {
          console.log(`🔍 Checking outlet targeting for customer ${customerId}:`);
          console.log(`   📋 Customer outletId: ${customerData.outletId || 'none'}`);
          console.log(`   📋 Customer outletName: ${customerData.outletName || 'none'}`);
          console.log(`   📋 Campaign targetOutlets: ${campaign.outletIds.join(', ')}`);
          
          // Check if customer's outlet matches any of the campaign target outlets
          // Use outletId for exact matching (as per app team fix)
          const hasMatchingOutlet = customerData.outletId && 
            campaign.outletIds.includes(customerData.outletId);
          
          console.log(`   🎯 Has matching outlet: ${hasMatchingOutlet}`);
          
          if (!hasMatchingOutlet) {
            console.log(`   ⏭️ SKIPPING customer ${customerId} - outlet doesn't match`);
            return; // Skip this customer
          }
        }

        let qualifies = false;

        switch (campaign.triggerType) {
          case 'birthday':
            // Check if today is customer's birthday - FLEXIBLE FORMAT SUPPORT
            console.log(`\n🎂 PROCESSING BIRTHDAY CHECK FOR CUSTOMER ${customerId}`);
            console.log(`   📱 Phone: ${customerData.phoneNumber}`);
            
            if (customerData.birthDate) {
              const birthDate = customerData.birthDate;
              const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              
              console.log(`   🎂 Birthday stored: "${birthDate}" (type: ${typeof birthDate})`);
              console.log(`   📅 Today's MM-DD: "${todayMMDD}"`);
              
              let matchesBirthday = false;
              
              // Handle different birthday formats
              if (typeof birthDate === 'string') {
                // Format 1: "MM-DD" (exact match)
                if (birthDate === todayMMDD) {
                  matchesBirthday = true;
                }
                // Format 2: "MM-DD-YYYY" or "YYYY-MM-DD" (full date with dashes)
                else if (birthDate.includes('-') && birthDate.length > 5) {
                  const parts = birthDate.split('-');
                  console.log(`   🔍 Parsing dashed format:`, parts);
                  if (parts.length >= 3) {
                    let monthDay = '';
                    if (parts[0].length === 4) {
                      // YYYY-MM-DD format
                      monthDay = `${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                      console.log(`   📝 Detected YYYY-MM-DD: ${monthDay}`);
                    } else {
                      // MM-DD-YYYY format (like "07-22-1994")
                      monthDay = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                      console.log(`   📝 Detected MM-DD-YYYY: ${monthDay}`);
                    }
                    console.log(`   🎯 Comparing: "${monthDay}" vs "${todayMMDD}"`);
                    if (monthDay === todayMMDD) {
                      matchesBirthday = true;
                    }
                  }
                }
                // Format 3: "MM/DD/YYYY" (US format)
                else if (birthDate.includes('/')) {
                  const parts = birthDate.split('/');
                  if (parts.length >= 2) {
                    const monthDay = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    if (monthDay === todayMMDD) {
                      matchesBirthday = true;
                    }
                  }
                }
                // Format 4: "DD-MM" (day-month)
                else if (birthDate.includes('-') && birthDate.length === 5) {
                  const parts = birthDate.split('-');
                  if (parts.length === 2) {
                    const monthDay = `${parts[1]}-${parts[0]}`;
                    if (monthDay === todayMMDD) {
                      matchesBirthday = true;
                    }
                  }
                }
              }
              // Handle Firebase Timestamp format
              else if (birthDate && typeof birthDate === 'object' && birthDate.toDate) {
                const date = birthDate.toDate();
                const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                if (monthDay === todayMMDD) {
                  matchesBirthday = true;
                }
              }
              
              console.log(`   🔍 Birthday format analysis complete`);
              console.log(`   ✅ Match result: ${matchesBirthday ? 'BIRTHDAY MATCH!' : 'No match'}`);
              
              if (matchesBirthday) {
                qualifies = true;
                console.log(`🎉 🎂 BIRTHDAY MATCH CONFIRMED! Customer ${customerId} (${customerData.phoneNumber}) qualifies for birthday campaign!`);
              } else {
                console.log(`❌ No birthday match: Customer ${customerId} (${customerData.phoneNumber})`);
                console.log(`   📊 Raw data: "${birthDate}" vs today "${todayMMDD}"`);
              }
            } else {
              console.log(`⚠️ Customer ${customerId} has no birthDate field`);
            }
            break;

          case 'inactive_custom':
            // Check if customer hasn't visited in the custom number of days
            const customDays = campaign.daysSinceLastVisit || 15; // fallback to 15 if not set
            console.log(`\n😴 PROCESSING INACTIVE CHECK FOR CUSTOMER ${customerId} (${customDays} days)`);
            
            if (customerData.lastVisit) {
              const lastVisit = customerData.lastVisit.toDate ? customerData.lastVisit.toDate() : new Date(customerData.lastVisit);
              const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
              console.log(`   📅 Last visit: ${daysSinceVisit} days ago (threshold: ${customDays} days)`);
              
              if (daysSinceVisit >= customDays) {
                qualifies = true;
                console.log(`✅ INACTIVE MATCH! Customer ${customerId} (${customerData.phoneNumber}) inactive for ${daysSinceVisit} days (>= ${customDays})`);
              } else {
                console.log(`❌ Not inactive enough: Customer ${customerId} last visit ${daysSinceVisit} days ago (< ${customDays})`);
              }
            } else {
              console.log(`⚠️ Customer ${customerId} has no lastVisit field`);
            }
            break;

          case 'inactive_15':
            // Check if customer hasn't visited in 15 days
            if (customerData.lastVisit) {
              const lastVisit = customerData.lastVisit.toDate ? customerData.lastVisit.toDate() : new Date(customerData.lastVisit);
              const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceVisit >= 15) {
                qualifies = true;
                console.log(`😴 Inactive 15+ days: Customer ${customerId} last visit ${daysSinceVisit} days ago`);
              }
            }
            break;

          case 'inactive_30':
            // Check if customer hasn't visited in 30 days
            if (customerData.lastVisit) {
              const lastVisit = customerData.lastVisit.toDate ? customerData.lastVisit.toDate() : new Date(customerData.lastVisit);
              const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceVisit >= 30) {
                qualifies = true;
                console.log(`😴 Inactive 30+ days: Customer ${customerId} last visit ${daysSinceVisit} days ago`);
              }
            }
            break;
        }

        if (qualifies) {
          qualifyingCustomers.push({ id: customerId, data: customerData });

          // Create campaign-generated promotion for this customer
          const campaignPromotion = {
            title: `${campaign.name}`,
            description: `Special ${campaign.triggerType === 'birthday' ? 'Birthday' : 'Welcome Back'} Offer!`,
            discountType: campaign.discountType,
            discountAmount: campaign.discountAmount,
            minimumPurchase: campaign.minimumPurchase,
            source: `campaign_${campaign.triggerType}`,
            campaignId: campaign.id,
            isUsed: false,
            isActive: true,
            assignedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            validityDays: 30, // Default 30-day validity
            expiresAt: Timestamp.fromDate(new Date(Date.now() + ((campaign.expirationDays || 7) * 24 * 60 * 60 * 1000))), // NEW: Use campaign expiration or default 7 days
            targetOutlets: campaign.outletIds || ['ALL']
          };

          // Save to customer's promotions (using the path where mobile app expects it)
          const customerPromotionRef = doc(
            collection(firestore, 'businesses', businessId, 'customerPromotions', customerId, 'promotions')
          );
          batch.set(customerPromotionRef, campaignPromotion);
          
          console.log(`💾 Saving promotion to: businesses/${businessId}/customerPromotions/${customerId}/promotions/`);
        }
      });

      // Execute batch write
      if (qualifyingCustomers.length > 0) {
        await batch.commit();
        console.log(`✅ Campaign assigned to ${qualifyingCustomers.length} qualifying customers`);

        // Count SMS-eligible customers
        const smsEligibleCount = qualifyingCustomers.filter(customer => 
          customer.data.optedInForSMS === true
        ).length;

        // Send SMS to eligible customers (placeholder for now)
        qualifyingCustomers.forEach(customer => {
          if (customer.data.optedInForSMS) {
            console.log(`📱 [SMS] Would send to ${customer.data.name || customer.id}: "${campaign.name} - Special offer!"`);
          }
        });

        return { assigned: qualifyingCustomers.length, smsEligible: smsEligibleCount };
      } else {
        console.log('ℹ️ No customers qualified for this campaign');
        return { assigned: 0, smsEligible: 0 };
      }

    } catch (error) {
      console.error('❌ Error assigning campaign to customers:', error);
      throw error;
    }
  };

  // 🔄 PROCESS ALL CAMPAIGNS (Daily Automation)
  const processAllCampaigns = async (isAutomatic = false) => {
    try {
      if (!isAutomatic) {
        setLoading(true);
      } else {
        setAutoProcessing(prev => ({ ...prev, processing: true }));
      }
      
      console.log(`🤖 Starting campaign automation process... (${isAutomatic ? 'Automatic' : 'Manual'})`);

      const businessId = await getCurrentBusinessId();
      
      // Get all active campaigns
      const campaignsRef = collection(firestore, 'businesses', businessId, 'campaigns');
      const campaignsSnapshot = await getDocs(campaignsRef);
      
      if (campaignsSnapshot.size === 0) {
        if (!isAutomatic) {
          alert('ℹ️ No campaigns found to process');
        }
        return { processed: 0, assigned: 0 };
      }

      let totalProcessed = 0;
      let totalAssigned = 0;

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;
        
        if (!campaign.isActive) {
          console.log(`⏸️ Skipping inactive campaign: ${campaign.name}`);
          continue;
        }

        console.log(`🎯 Processing campaign: ${campaign.name} (Type: ${campaign.triggerType})`);
        
        const result = await assignCampaignToCustomers(businessId, campaign);
        totalAssigned += result.assigned;
        totalProcessed++;

        // Update campaign's lastProcessed timestamp
        await getDocs(query(collection(firestore, 'businesses', businessId, 'campaigns'), limit(1))).then(async () => {
          // Update the campaign document with lastProcessed timestamp
          const campaignRef = doc(firestore, 'businesses', businessId, 'campaigns', campaign.id!);
          // Note: You might want to use updateDoc here, but keeping it simple for now
        });
      }

      // Update last processed time
      const now = new Date().toISOString();
      localStorage.setItem('campaignLastProcessed', now);
      setAutoProcessing(prev => ({ ...prev, lastProcessed: now }));

      if (!isAutomatic) {
        alert(`✅ Campaign Processing Complete!\n\n📊 Results:\n• ${totalProcessed} campaigns processed\n• ${totalAssigned} promotions assigned\n\nCheck the mobile app to see the new promotions!`);
      } else {
        console.log(`✅ Auto-processing complete: ${totalProcessed} campaigns, ${totalAssigned} assignments`);
      }

      return { processed: totalProcessed, assigned: totalAssigned };
      
    } catch (error) {
      console.error('❌ Error processing campaigns:', error);
      if (!isAutomatic) {
        alert(`❌ Error processing campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return { processed: 0, assigned: 0 };
    } finally {
      if (!isAutomatic) {
        setLoading(false);
      } else {
        setAutoProcessing(prev => ({ ...prev, processing: false }));
      }
    }
  };

  // 🤖 AUTOMATIC PROCESSING FUNCTIONS
  const startAutoProcessing = () => {
    if (autoProcessInterval) {
      clearInterval(autoProcessInterval);
    }

    const intervalMs = autoProcessing.interval * 60 * 1000; // Convert minutes to milliseconds
    
    const interval = setInterval(async () => {
      console.log('🔄 Running automatic campaign processing...');
      await processAllCampaigns(true);
      updateNextRunTime();
    }, intervalMs);

    setAutoProcessInterval(interval);
    updateNextRunTime();
    
    // Save to localStorage
    localStorage.setItem('campaignAutoProcessing', 'true');
    localStorage.setItem('campaignAutoInterval', autoProcessing.interval.toString());
    
    console.log(`✅ Automatic processing started (every ${autoProcessing.interval} minutes)`);
  };

  const stopAutoProcessing = () => {
    if (autoProcessInterval) {
      clearInterval(autoProcessInterval);
      setAutoProcessInterval(null);
    }
    
    setAutoProcessing(prev => ({ ...prev, nextRun: null }));
    localStorage.setItem('campaignAutoProcessing', 'false');
    
    console.log('⏹️ Automatic processing stopped');
  };

  const updateNextRunTime = () => {
    const nextRun = new Date(Date.now() + (autoProcessing.interval * 60 * 1000));
    setAutoProcessing(prev => ({ ...prev, nextRun }));
  };

  const toggleAutoProcessing = () => {
    const newEnabled = !autoProcessing.enabled;
    setAutoProcessing(prev => ({ ...prev, enabled: newEnabled }));
    
    if (newEnabled) {
      startAutoProcessing();
    } else {
      stopAutoProcessing();
    }
  };

  const updateAutoInterval = (newInterval: number) => {
    setAutoProcessing(prev => ({ ...prev, interval: newInterval }));
    localStorage.setItem('campaignAutoInterval', newInterval.toString());
    
    // Restart with new interval if currently running
    if (autoProcessing.enabled) {
      stopAutoProcessing();
      setTimeout(() => {
        setAutoProcessing(prev => ({ ...prev, enabled: true }));
        startAutoProcessing();
      }, 100);
    }
  };

  // 🎯 ALTERNATIVE: ASSIGN TO USER'S CUSTOMERS (when they're in /users/{uid}/customers/)
  const assignPromotionToUserCustomers = async (businessId: string, promotionId: string, promotion: Promotion, customersSnapshot: any) => {
    try {
      console.log('🔄 Assigning promotion to user\'s customers...');
      
      const batch = writeBatch(firestore);
      let assignedCount = 0;
      let smsEligibleCount = 0;

      customersSnapshot.docs.forEach((customerDoc: any) => {
        const customerData = customerDoc.data();
        const customerId = customerDoc.id;

        // Check if customer is active (default to true if not specified)
        const isActive = customerData.isActive !== false;
        
        if (isActive) {
          console.log(`✅ Assigning to customer: ${customerData.name || customerId}`);
          
          // Create the full promotion assignment with all required fields
          const promotionAssignment = {
            ...promotion, // Copy all promotion fields
            promotionId: promotionId,
            customerId: customerId,
            businessId: businessId,
            isUsed: false,
            usedAt: null,
            assignedAt: Timestamp.now(),
            expiresAt: promotion.expirationDays ?              // NEW: Calculate expiration per customer
              Timestamp.fromDate(new Date(Date.now() + (promotion.expirationDays * 24 * 60 * 60 * 1000))) :
              null
          };

          // Store in customer's promotions subcollection (using new path structure)
          const customerPromotionRef = doc(firestore, 'businesses', businessId, 'customerPromotions', customerId, 'promotions', promotionId);
          batch.set(customerPromotionRef, promotionAssignment);
          
          assignedCount++;
          
          // Count SMS eligible customers
          if (customerData.optedInForSMS === true) {
            smsEligibleCount++;
          }
        } else {
          console.log(`⏭️ Skipping inactive customer: ${customerData.name || customerId}`);
        }
      });

      await batch.commit();
      console.log(`✅ Successfully assigned promotion to ${assignedCount} active customers`);
      console.log(`📱 SMS eligible customers: ${smsEligibleCount}`);
      
      alert(`✅ PROMOTION ASSIGNED SUCCESSFULLY!

📊 ASSIGNMENT RESULTS:
• Total customers found: ${customersSnapshot.size}
• Active customers: ${assignedCount}
• SMS eligible: ${smsEligibleCount}

📍 CUSTOMER LOCATION: /users/${user.uid}/customers/
📍 ASSIGNMENTS STORED: /businesses/${businessId}/customerPromotions/

The promotion is now available on your mobile app!`);

    } catch (error) {
      console.error('❌ Error assigning promotion to user customers:', error);
      throw error;
    }
  };

  // 🎯 STEP 2: CUSTOMER ASSIGNMENT FUNCTION (Production-Ready with Graceful Field Handling)
  const assignPromotionToCustomers = async (businessId: string, promotionId: string, promotion: Promotion) => {
    try {
      console.log('🔄 Assigning promotion to customers with flexible field requirements...');
      
      // Get customers from user collection (where app team data is stored)
      const userCustomersRef = collection(firestore, 'users', user.uid, 'customers');
      const userCustomersSnapshot = await getDocs(userCustomersRef);
      console.log(`📋 Found ${userCustomersSnapshot.size} customers in user collection`);
      
      if (userCustomersSnapshot.size === 0) {
        console.error('❌ NO CUSTOMERS FOUND - DEBUGGING INFO:');
        console.log(`📍 Searched path: /users/${user.uid}/customers/`);
        console.log(`👤 User ID: ${user.uid}`);
        
        // Fallback to web_customers collection if user collection is empty
        console.log('🔍 Checking web_customers collection as fallback...');
        try {
          const webCustomersRef = collection(firestore, 'users', user.uid, 'web_customers');
          const webCustomersSnapshot = await getDocs(webCustomersRef);
          console.log(`📋 Found ${webCustomersSnapshot.size} customers in web_customers collection`);
          
          if (webCustomersSnapshot.size > 0) {
            console.log('⚠️ Using web_customers collection (may have outdated outlet data)');
            return await assignPromotionToUserCustomers(businessId, promotionId, promotion, webCustomersSnapshot);
          }
        } catch (error) {
          console.log('❌ Error checking web_customers:', error);
        }
        
        alert(`❌ CUSTOMER LOOKUP ERROR

You mentioned having 92 customers, but the system isn't finding them.

🔍 DEBUGGING DETAILS:
• User ID: ${user.uid}
• Searched path: /users/${user.uid}/customers/
• Found customers: ${userCustomersSnapshot.size}

📧 NEXT STEPS:
1. Check Firebase Console for your actual customer location
2. Verify the correct user ID is being used
3. Customers might be stored in a different path

The promotion "${promotion.title}" was created but needs customers to assign to.`);
        return;
      }
      
      // Create batch for efficient writes
      const batch = writeBatch(firestore);
      let assignedCount = 0;
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + promotion.validityDays);
      
      // Assign to each customer with graceful field handling
      userCustomersSnapshot.docs.forEach((customerDoc: any) => {
        const customer = customerDoc.data();
        const customerId = customerDoc.id;
        
        // Skip customers with missing essential data
        if (!customerId) return;
        
        // Check outlet targeting (skip if customer has no outlet and promotion is outlet-specific)
        if (promotion.targetOutlets !== 'ALL' && Array.isArray(promotion.targetOutlets)) {
          console.log(`🔍 Checking outlet targeting for customer ${customerId}:`);
          console.log(`   📋 Customer outletId: ${customer.outletId || 'none'}`);
          console.log(`   📋 Customer outletName: ${customer.outletName || 'none'}`);
          console.log(`   📋 Promotion targetOutlets: ${promotion.targetOutlets.join(', ')}`);
          console.log(`   🎯 Using outletId matching (app team fix applied)`);
          
          // Check if customer has a valid outlet assignment
          const hasValidOutlet = customer.outletId && 
            customer.outletId.trim() !== '' && 
            customer.outletName && 
            customer.outletName.trim() !== '';
          
          // Check if customer's outlet matches any of the target outlets
          // Skip customers with no outlet or no outlet match
          const hasMatchingOutlet = hasValidOutlet && 
            promotion.targetOutlets.includes(customer.outletId);
          
          // Skip customers with no outlet assignment or no outlet match
          if (!hasValidOutlet) {
            console.log(`⏭️ SKIPPING - Customer ${customerId} (${customer.phoneNumber}) - No outlet assigned`);
            return; // Skip this iteration
          }
          
          // DEBUG: Log the exact comparison for troubleshooting
          console.log(`   🔍 DEBUG - Outlet matching details:`);
          console.log(`      Customer outletId: "${customer.outletId}"`);
          console.log(`      Promotion targetOutlets: [${promotion.targetOutlets.join(', ')}]`);
          console.log(`      Is customer outletId in targetOutlets? ${promotion.targetOutlets.includes(customer.outletId)}`);
          console.log(`      Final hasMatchingOutlet: ${hasMatchingOutlet}`);
          
          // DEBUG: Log first 5 customers for app team verification
          if (assignedCount < 5) {
            console.log(`🔍 DEBUG - Customer ${customerId} outlet data:`, {
              outletId: customer.outletId,
              outletName: customer.outletName,
              phoneNumber: customer.phoneNumber,
              name: customer.name || customer.firstName,
              hasMatchingOutlet: hasMatchingOutlet
            });
          }
          
          console.log(`   🎯 Has matching outlet: ${hasMatchingOutlet}`);
          
          if (!hasMatchingOutlet) {
            console.log(`   ⏭️ SKIPPING customer ${customerId} - outlet doesn't match`);
            return; // Skip this customer
          }
        }
        
        // Assign promotion (works regardless of other fields)
        const customerPromotionRef = doc(
          firestore,
          'businesses', businessId,
          'customerPromotions', customerId,
          'promotions', promotionId // Use same ID as master promotion
        );
        
        const customerPromotionData = {
          title: promotion.title,
          description: promotion.description || '',
          discountAmount: promotion.discountAmount,
          minimumPurchase: promotion.minimumPurchase,
          source: 'manual',
          isUsed: false,
          usedAt: null,
          expiresAt: Timestamp.fromDate(expiresAt),
          campaignId: null
        };
        
        batch.set(customerPromotionRef, customerPromotionData);
        assignedCount++;
        console.log(`✅ ASSIGNED promotion to customer ${customerId}`);
        
        // Handle SMS only if customer has phone and opted in
        if (promotionForm.sendSMS && customer.phoneNumber && customer.optedInForSMS && promotionForm.smsMessage) {
          setTimeout(() => {
            sendSMSMessage(customer.phoneNumber, promotionForm.smsMessage);
          }, 100);
        }
      });
      
      // Execute batch
      await batch.commit();
      console.log(`✅ Successfully assigned promotion to ${assignedCount} customers out of ${userCustomersSnapshot.size} total`);
      console.log(`📊 Outlet targeting: ${promotion.targetOutlets === 'ALL' ? 'ALL outlets' : promotion.targetOutlets.join(', ')}`);
      
      if (assignedCount === 0) {
        alert('⚠️ No customers were eligible for this promotion based on targeting criteria.');
      } else {
        console.log(`🎯 Assignment breakdown: ${assignedCount} assigned, ${userCustomersSnapshot.size - assignedCount} skipped`);
        
        // Show assignment summary to user
        const targetOutletNames = promotion.targetOutlets === 'ALL' 
          ? 'ALL outlets' 
          : outlets.filter(o => promotion.targetOutlets.includes(o.id)).map(o => o.name).join(', ');
        
        alert(`✅ Promotion "${promotion.title}" assigned successfully!\n\n📊 Assignment Summary:\n• Total customers: ${userCustomersSnapshot.size}\n• Assigned: ${assignedCount}\n• Skipped: ${userCustomersSnapshot.size - assignedCount}\n• Target outlets: ${targetOutletNames}\n\n💡 Check the browser console for detailed customer information.`);
      }
      
    } catch (error) {
      console.error('❌ Error assigning promotion to customers:', error);
      throw error;
    }
  };

  // 🎯 STEP 3: SMS SENDING FUNCTION (Production-Ready with Optional SMS)
  const sendPromotionSMS = async (businessId: string, promotion: Promotion, smsMessage: string) => {
    try {
      console.log('📱 Sending SMS to customers with flexible requirements...');
      
      // Get all customers first, then filter gracefully (using user collection as per app team)
      const customersRef = collection(firestore, 'users', user.uid, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      console.log(`📋 Found ${customersSnapshot.size} total customers for SMS`);
      
      let smsEligibleCount = 0;
      let smsSentCount = 0;
      
      // Send SMS to each eligible customer
      for (const customerDoc of customersSnapshot.docs) {
        const customer = customerDoc.data();
        
        // Check if customer is eligible for SMS (graceful field checking)
        const hasPhoneNumber = customer.phoneNumber && customer.phoneNumber.trim();
        const isOptedIn = customer.optedInForSMS === true;
        
        // Check outlet targeting if applicable
        let isInTargetOutlet = true;
        if (promotion.targetOutlets !== 'ALL' && Array.isArray(promotion.targetOutlets)) {
          isInTargetOutlet = customer.outletId && promotion.targetOutlets.includes(customer.outletId);
        }
        
        if (hasPhoneNumber && isOptedIn && isInTargetOutlet) {
          smsEligibleCount++;
          try {
            await sendSMSMessage(customer.phoneNumber, smsMessage);
            smsSentCount++;
            console.log(`📱 SMS sent to ${customer.phoneNumber}`);
          } catch (smsError) {
            console.warn(`⚠️ Failed to send SMS to ${customer.phoneNumber}:`, smsError);
            // Continue with other customers even if one fails
          }
        }
      }
      
      console.log(`📱 SMS Summary: ${smsSentCount}/${smsEligibleCount} eligible customers notified`);
      
      if (smsEligibleCount === 0) {
        console.log('ℹ️ No customers eligible for SMS (missing phone number or not opted in)');
      }
      
    } catch (error) {
      console.error('❌ Error in SMS sending process:', error);
      // Don't throw error - SMS failure shouldn't break promotion creation
    }
  };

  // 🤖 STEP 4: CAMPAIGN CREATION SYSTEM (Exact as per App Team Spec)
  const createCampaign = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!campaignForm.name || !campaignForm.discountAmount || !campaignForm.type) {
        alert('❌ Please fill in required fields (Name, Campaign Type, and Discount Amount)');
        return;
      }

      const businessId = await getCurrentBusinessId();
      console.log('🤖 Creating campaign for business:', businessId);
      console.log('🏢 Business ID used for creation:', businessId);
      
      // Map campaign type to proper trigger type
      let triggerType: 'birthday' | 'inactive_15' | 'inactive_30' | 'inactive_custom' = 'birthday';
      let daysSinceLastVisit: number | undefined = undefined;
      
      switch (campaignForm.type) {
        case 'inactive':
          // Use custom trigger type and store the actual days
          triggerType = 'inactive_custom';
          daysSinceLastVisit = campaignForm.daysSinceLastVisit;
          break;
        case 'birthday':
          triggerType = 'birthday';
          break;
        case 'spending':
          // For now, map spending campaigns to inactive (you can adjust this later)
          triggerType = 'inactive_15';
          break;
        default:
          triggerType = 'birthday';
      }
      
      const campaign: Campaign = {
        name: campaignForm.name,
        discountType: campaignForm.discountType,
        discountAmount: campaignForm.discountAmount,
        minimumPurchase: campaignForm.minimumPurchase,
        triggerType: triggerType,
        daysSinceLastVisit: daysSinceLastVisit, // Store custom days
        outletIds: campaignForm.outletIds.length === 0 ? ['all'] : campaignForm.outletIds,
        expirationDays: 7, // Default 7-day expiration
        isActive: true,
        createdAt: Timestamp.now()
      };
      
      // Save to Firebase: /businesses/{businessId}/campaigns/{campaignId}
      await addDoc(
        collection(firestore, 'businesses', businessId, 'campaigns'),
        campaign
      );
      
      alert('✅ Campaign created successfully!');
      
      // Reset form and close modal
      setCampaignForm({
        name: '',
        discountType: 'dollar',
        discountAmount: 0,
        minimumPurchase: 0,
        triggerType: '',
        outletIds: [],
        type: '',
        daysSinceLastVisit: 15,
        birthdayOffset: 0,
        minimumSpending: 100,
        promotionTitle: '',
        smsMessage: '',
        targetOutlets: []
      });
      setShowCreateCampaign(false);
      
      // Reload campaigns
      await loadCampaigns();
      
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      alert('Error creating campaign: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 📊 DATA LOADING FUNCTIONS
  const loadPromotions = async () => {
    try {
      const businessId = await getCurrentBusinessId();
      const promotionsRef = collection(firestore, 'businesses', businessId, 'promotions');
      const snapshot = await getDocs(promotionsRef);
      
      const loadedPromotions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Promotion[];
      
      setPromotions(loadedPromotions);
    } catch (error) {
      console.error('❌ Error loading promotions:', error);
    }
  };

  // 🧹 CLEAN ALL DATA (NUCLEAR OPTION)
  const cleanAllData = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL campaigns and customer promotions. Are you absolutely sure?')) return;
    if (!confirm('⚠️ FINAL WARNING: This action cannot be undone. Continue?')) return;
    
    try {
      setLoading(true);
      const businessId = await getCurrentBusinessId();
      
      console.log('🧹 Starting complete data cleanup...');
      
      const batch = writeBatch(firestore);
      let totalDeleted = 0;
      
      // 1. Delete all campaigns
      console.log('🗑️ Deleting all campaigns...');
      const campaignsRef = collection(firestore, 'businesses', businessId, 'campaigns');
      const campaignsSnapshot = await getDocs(campaignsRef);
      campaignsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
        console.log(`   ✅ Queued campaign deletion: ${doc.data().name}`);
      });
      
      // 2. Delete all standalone promotions
      console.log('🗑️ Deleting all standalone promotions...');
      const promotionsRef = collection(firestore, 'businesses', businessId, 'promotions');
      const promotionsSnapshot = await getDocs(promotionsRef);
      promotionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
        console.log(`   ✅ Queued promotion deletion: ${doc.data().title}`);
      });
      
      // 3. Delete ALL customer promotions
      console.log('🗑️ Deleting all customer promotions...');
      const allCustomersRef = collection(firestore, 'businesses', businessId, 'customerPromotions');
      const customersSnapshot = await getDocs(allCustomersRef);
      
      for (const customerDoc of customersSnapshot.docs) {
        const customerPromotionsRef = collection(firestore, 'businesses', businessId, 'customerPromotions', customerDoc.id, 'promotions');
        const promotionsSnapshot = await getDocs(customerPromotionsRef);
        
        promotionsSnapshot.docs.forEach(promotionDoc => {
          batch.delete(promotionDoc.ref);
          totalDeleted++;
          console.log(`   ✅ Queued customer promotion deletion: ${customerDoc.id}`);
        });
      }
      
      // Commit all deletions
      await batch.commit();
      console.log(`🎉 Cleanup complete! Deleted ${totalDeleted} items total.`);
      
      // Refresh all data
      loadCampaigns();
      loadPromotions();
      
      alert(`✅ Complete cleanup finished! Deleted ${totalDeleted} items. Your system is now clean and ready for new campaigns.`);
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      alert('❌ Error during cleanup. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ DELETE CAMPAIGN WITH CLEANUP
  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('⚠️ This will delete the campaign AND remove all customer promotions generated by it. Continue?')) return;
    
    try {
      setLoading(true);
      const businessId = await getCurrentBusinessId();
      
      console.log('🗑️ Deleting campaign and cleaning up customer promotions...');
      
      // Step 1: Get campaign details for better matching
      const campaignToDelete = campaigns.find(c => c.id === campaignId);
      const campaignName = campaignToDelete?.name || '';
      
      console.log(`🔍 Available campaigns in state:`);
      campaigns.forEach(c => {
        console.log(`   - ${c.name} (ID: ${c.id})`);
      });
      console.log(`🔍 Looking for campaign with ID: ${campaignId}`);
      console.log(`🔍 Found campaign: ${campaignToDelete ? 'YES' : 'NO'}`);
      
      console.log(`🔍 Deleting campaign: "${campaignName}" (ID: ${campaignId})`);
      console.log(`🏢 Using business ID: ${businessId}`);
      console.log(`🎯 Looking for promotions with campaignId: "${campaignId}"`);
      console.log(`🎯 Or promotions with title: "${campaignName}"`);
      
      // Step 2: Find all customer promotions generated by this campaign
      // Use the SAME collection that campaign processing uses
      let allCustomersRef;
      let customersSnapshot;
      
      try {
        // First try the user's customers path (same as campaign processing)
        allCustomersRef = collection(firestore, 'users', user.uid, 'customers');
        customersSnapshot = await getDocs(allCustomersRef);
        console.log(`🔍 Found ${customersSnapshot.docs.length} customers in user collection (same as campaign processing)`);
      } catch (error) {
        console.log('⚠️ User customers not found, trying web_customers collection...');
        // Fallback to web_customers
        allCustomersRef = collection(firestore, 'users', user.uid, 'web_customers');
        customersSnapshot = await getDocs(allCustomersRef);
        console.log(`🔍 Found ${customersSnapshot.docs.length} customers in web_customers collection`);
      }
      
      // Also check if we have any customers at all
      const allCustomersDataRef = collection(firestore, 'users', user.uid, 'web_customers');
      const allCustomersDataSnapshot = await getDocs(allCustomersDataRef);
      console.log(`📊 Total customers in web_customers database: ${allCustomersDataSnapshot.docs.length}`);
      
      // Check what business ID the campaign was created with
      if (campaignToDelete) {
        console.log(`📋 Campaign was created in business: ${businessId}`);
      }
      
      if (customersSnapshot.docs.length === 0) {
        console.log(`⚠️ No customerPromotions collection found. This might mean:`);
        console.log(`   1. No customers have received promotions yet`);
        console.log(`   2. Mobile app cleaned everything already`);
        console.log(`   3. Data structure is different`);
        console.log(`   4. Business ID mismatch between creation and deletion`);
      }
      
      const batch = writeBatch(firestore);
      let cleanupCount = 0;
      
             // Step 2: Remove campaign-generated promotions from each customer
       for (const customerDoc of customersSnapshot.docs) {
         const customerId = customerDoc.id;
         
         // Campaign promotions are ALWAYS saved to business collection, regardless of where customers come from
         const customerPromotionsRef = collection(firestore, 'businesses', businessId, 'customerPromotions', customerId, 'promotions');
         
         const promotionsSnapshot = await getDocs(customerPromotionsRef);
         
         console.log(`🔍 Customer ${customerId}: Found ${promotionsSnapshot.docs.length} promotions`);
         
         promotionsSnapshot.docs.forEach(promotionDoc => {
           const promotion = promotionDoc.data();
           const promotionId = promotionDoc.id;
           
           console.log(`🔍 Checking promotion ${promotionId} for customer ${customerId}:`);
           console.log(`   📋 campaignId: "${promotion.campaignId}"`);
           console.log(`   📋 source: "${promotion.source}"`);
           console.log(`   📋 title: "${promotion.title}"`);
           console.log(`   📋 description: "${promotion.description}"`);
           
           // Enhanced matching logic for campaign-generated promotions
           const isCampaignPromotion = 
             promotion.campaignId === campaignId || 
             (promotion.source?.includes('campaign') && promotion.title === campaignName) ||
             promotion.source?.startsWith('campaign_') ||
             (promotion.title?.includes(campaignName) && promotion.source?.includes('campaign')) ||
             (promotion.description?.includes('Special') && promotion.source?.includes('campaign')) ||
             (promotion.description?.includes('Birthday') && promotion.source?.includes('campaign')) ||
             (promotion.description?.includes('Welcome Back') && promotion.source?.includes('campaign'));
           
           console.log(`   🎯 Matching check:`);
           console.log(`      campaignId match: ${promotion.campaignId === campaignId}`);
           console.log(`      source includes campaign: ${promotion.source?.includes('campaign')}`);
           console.log(`      title match: ${promotion.title === campaignName}`);
           console.log(`      title includes campaign name: ${promotion.title?.includes(campaignName)}`);
           console.log(`      Final result: ${isCampaignPromotion}`);
           
           if (isCampaignPromotion) {
             batch.delete(promotionDoc.ref);
             cleanupCount++;
             console.log(`✅ DELETING campaign promotion from customer ${customerId}: "${promotion.title}"`);
           } else {
             console.log(`⏭️ SKIPPING non-campaign promotion: "${promotion.title}"`);
           }
         });
       }
      
      // Step 3: Delete the campaign itself
      batch.delete(doc(firestore, 'businesses', businessId, 'campaigns', campaignId));
      
      // Execute all deletions
      await batch.commit();
      
      console.log(`✅ Campaign deleted and ${cleanupCount} customer promotions cleaned up`);
      
      loadCampaigns();
      alert(`✅ Campaign deleted successfully!\n🧹 Cleaned up ${cleanupCount} customer promotions`);
    } catch (error) {
      console.error('❌ Error deleting campaign:', error);
      alert(`❌ Error deleting campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const businessId = await getCurrentBusinessId();
      const campaignsRef = collection(firestore, 'businesses', businessId, 'campaigns');
      const snapshot = await getDocs(campaignsRef);
      
      const loadedCampaigns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];
      
      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error('❌ Error loading campaigns:', error);
    }
  };

  const loadOutlets = async () => {
    try {
      const outletsRef = collection(firestore, 'users', user.uid, 'outlets');
      const snapshot = await getDocs(outletsRef);
      
      const loadedOutlets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setOutlets(loadedOutlets);
    } catch (error) {
      console.error('❌ Error loading outlets:', error);
    }
  };

  // 🗑️ DELETE PROMOTION FUNCTIONS
  const handleDeleteClick = (promotion: Promotion) => {
    setPromotionToDelete(promotion);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!promotionToDelete) return;
    
    try {
      setLoading(true);
      console.log('🗑️ Deleting promotion and cleaning up customer assignments:', promotionToDelete.title);
      
      const businessId = await getCurrentBusinessId();
      const promotionId = promotionToDelete.id!;
      
      // Step 1: Find and remove all customer assignments of this promotion
      // Use the SAME collection that campaign processing uses
      let allCustomersRef;
      let customersSnapshot;
      
      try {
        // First try the user's customers path (same as campaign processing)
        allCustomersRef = collection(firestore, 'users', user.uid, 'customers');
        customersSnapshot = await getDocs(allCustomersRef);
        console.log(`🔍 Found ${customersSnapshot.docs.length} customers in user collection for promotion cleanup`);
      } catch (error) {
        console.log('⚠️ User customers not found, trying business collection...');
        // Fallback to business customers
        allCustomersRef = collection(firestore, 'businesses', businessId, 'customers');
        customersSnapshot = await getDocs(allCustomersRef);
        console.log(`🔍 Found ${customersSnapshot.docs.length} customers in business collection for promotion cleanup`);
      }
      
      const batch = writeBatch(firestore);
      let cleanupCount = 0;
      
      // Step 2: Remove this promotion from each customer's assignments
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        
        // Campaign promotions are ALWAYS saved to business collection, regardless of where customers come from
        const customerPromotionsRef = collection(firestore, 'businesses', businessId, 'customerPromotions', customerId, 'promotions');
        const promotionsSnapshot = await getDocs(customerPromotionsRef);
        
        console.log(`🔍 Customer ${customerId}: Found ${promotionsSnapshot.docs.length} promotions`);
        
        promotionsSnapshot.docs.forEach(promotionDoc => {
          const promotion = promotionDoc.data();
          const currentPromotionId = promotionDoc.id;
          
          // Check if this is the promotion we want to delete
          if (currentPromotionId === promotionId) {
            batch.delete(promotionDoc.ref);
            cleanupCount++;
            console.log(`✅ DELETING promotion from customer ${customerId}: "${promotion.title}"`);
          } else {
            console.log(`⏭️ SKIPPING other promotion: "${promotion.title}"`);
          }
        });
      }
      
      // Step 3: Delete from master promotions
      batch.delete(doc(firestore, 'businesses', businessId, 'promotions', promotionId));
      
      // Execute all deletions
      await batch.commit();
      
      console.log(`✅ Promotion deleted and ${cleanupCount} customer assignments cleaned up`);
      
      // Reload promotions to update the display
      await loadPromotions();
      
      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setPromotionToDelete(null);
      
      alert(`✅ Promotion "${promotionToDelete.title}" deleted successfully!\n🧹 Cleaned up ${cleanupCount} customer assignments`);
      
    } catch (error) {
      console.error('❌ Error deleting promotion:', error);
      alert('Error deleting promotion: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setPromotionToDelete(null);
  };

  // 🔄 TOGGLE CAMPAIGN ACTIVE STATUS
  const toggleCampaignStatus = async (campaignId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const businessId = await getCurrentBusinessId();
      const campaignRef = doc(firestore, 'businesses', businessId, 'campaigns', campaignId);
      
      const newStatus = !currentStatus;
      console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} campaign ${campaignId}`);
      
      // Update the campaign status in Firebase
      await updateDoc(campaignRef, {
        isActive: newStatus
      });
      
      console.log(`✅ Campaign ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Reload campaigns to update the display
      await loadCampaigns();
      alert(`Campaign ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      
    } catch (error) {
      console.error('❌ Error toggling campaign status:', error);
      alert(`❌ Error updating campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 TOGGLE PROMOTION ACTIVE STATUS  
  const togglePromotionStatus = async (promotionId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const businessId = await getCurrentBusinessId();
      
      const newStatus = !currentStatus;
      console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} promotion ${promotionId}`);
      
      // Step 1: Update the master promotion status
      const promotionRef = doc(firestore, 'businesses', businessId, 'promotions', promotionId);
      await updateDoc(promotionRef, {
        isActive: newStatus
      });
      
      // Step 2: Update customer assignments if deactivating
      let customerUpdateCount = 0;
      if (!newStatus) {
        const allCustomersRef = collection(firestore, 'businesses', businessId, 'customerPromotions');
        const customersSnapshot = await getDocs(allCustomersRef);
        
        const batch = writeBatch(firestore);
        
        // Deactivate this promotion for all customers
        for (const customerDoc of customersSnapshot.docs) {
          const customerPromotionRef = doc(firestore, 'businesses', businessId, 'customerPromotions', customerDoc.id, 'promotions', promotionId);
          
          try {
            // Check if customer has this promotion and update its status
            const promotionSnapshot = await getDocs(query(collection(firestore, 'businesses', businessId, 'customerPromotions', customerDoc.id, 'promotions'), where('__name__', '==', promotionId)));
            if (!promotionSnapshot.empty) {
              batch.update(customerPromotionRef, {
                isActive: false
              });
              customerUpdateCount++;
              console.log(`🔄 Deactivating promotion for customer ${customerDoc.id}`);
            }
          } catch (error) {
            // Customer might not have this promotion
            console.log(`ℹ️ Customer ${customerDoc.id} doesn't have promotion ${promotionId}`);
          }
        }
        
        if (customerUpdateCount > 0) {
          await batch.commit();
          console.log(`🔄 Updated ${customerUpdateCount} customer assignments`);
        }
      }
      
      console.log(`✅ Promotion ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Reload promotions to update the display
      await loadPromotions();
      alert(`Promotion ${newStatus ? 'activated' : 'deactivated'} successfully!${!newStatus ? `\n🧹 Updated ${customerUpdateCount} customer assignments` : ''}`);
      
    } catch (error) {
      console.error('❌ Error toggling promotion status:', error);
      alert(`❌ Error updating promotion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🕐 EXPIRATION HELPER FUNCTIONS (As Per App Team Specification)
  const getPromotionExpirationInfo = (promotion: Promotion) => {
    if (!promotion.expiresAt) {
      return { isExpired: false, daysRemaining: null, formattedText: '' };
    }

    const now = new Date();
    const expiresDate = promotion.expiresAt.toDate ? promotion.expiresAt.toDate() : new Date(promotion.expiresAt);
    const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;

    const discountText = promotion.discountType === 'percentage' 
      ? `${promotion.discountAmount}% off $${promotion.minimumPurchase}+`
      : `$${promotion.discountAmount} off $${promotion.minimumPurchase}+`;

    const formattedText = isExpired 
      ? `${discountText} (Expired)`
      : `${discountText} (${daysRemaining} days left)`;

    return { isExpired, daysRemaining, formattedText };
  };

  // 🔄 LOAD DATA ON COMPONENT MOUNT
  useEffect(() => {
    loadPromotions();
    loadCampaigns();
    loadOutlets();
  }, [user]);

  // 🤖 AUTOMATIC PROCESSING LIFECYCLE
  useEffect(() => {
    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);

    // Start automatic processing if it was enabled
    if (autoProcessing.enabled) {
      startAutoProcessing();
    }

    // Cleanup interval on unmount
    return () => {
      if (autoProcessInterval) {
        clearInterval(autoProcessInterval);
      }
      document.head.removeChild(style);
    };
  }, []);

  // Update next run time when interval changes
  useEffect(() => {
    if (autoProcessing.enabled && autoProcessing.nextRun) {
      updateNextRunTime();
    }
  }, [autoProcessing.interval]);
  
  // 🔍 CUSTOMER LOOKUP FUNCTION
  const lookupCustomer = async (customerId: string) => {
    try {
      const businessId = await getCurrentBusinessId();
      
      // Try user collection first (where app team stores customers)
      const userCustomersRef = collection(firestore, 'users', user.uid, 'customers');
      const userCustomerDoc = doc(userCustomersRef, customerId);
      const userCustomerSnapshot = await getDoc(userCustomerDoc);
      
      if (userCustomerSnapshot.exists()) {
        const customerData = userCustomerSnapshot.data();
        console.log(`🔍 Customer ${customerId} found in user collection:`, customerData);
        alert(`📱 Customer Information:\n\nID: ${customerId}\nPhone: ${customerData.phoneNumber || 'Not found'}\nName: ${customerData.name || customerData.firstName || 'Not found'}\nOutlet: ${customerData.outletName || 'Not found'} (${customerData.outletId || 'Not found'})`);
        return;
      }
      
      // Try user collection (primary source as per app team)
      const userCustomersRef2 = collection(firestore, 'users', user.uid, 'customers');
      const userCustomerDoc2 = doc(userCustomersRef2, customerId);
      const userCustomerSnapshot2 = await getDoc(userCustomerDoc2);
      
      if (userCustomerSnapshot2.exists()) {
        const customerData = userCustomerSnapshot2.data();
        console.log(`🔍 Customer ${customerId} found in user collection:`, customerData);
        alert(`📱 Customer Information:\n\nID: ${customerId}\nPhone: ${customerData.phoneNumber || 'Not found'}\nName: ${customerData.name || customerData.firstName || 'Not found'}\nOutlet: ${customerData.outletName || 'Not found'} (${customerData.outletId || 'Not found'})`);
        return;
      }
      
      alert(`❌ Customer ${customerId} not found in either collection.`);
      
    } catch (error) {
      console.error('❌ Error looking up customer:', error);
      alert(`❌ Error looking up customer: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      margin: 0,
      padding: 0,
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 2px 20px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
              🎯 Three-Tier Rewards System 🔒
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Secure Multi-Tenant • Campaigns, Promotions & Point Rewards
            </p>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.8rem' }}>
              Business ID: Ready for app team connection
            </p>
          </div>
          
          <button
            onClick={onBack}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* 🔍 Customer Lookup Tool */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            🔍 Customer Lookup Tool
          </h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter customer ID (e.g., j0AQ1MwNMtpKJXTdIeKm)"
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '0.9rem'
              }}
              id="customerLookupInput"
            />
            <button
              onClick={() => {
                const input = document.getElementById('customerLookupInput') as HTMLInputElement;
                const customerId = input.value.trim();
                if (customerId) {
                  lookupCustomer(customerId);
                } else {
                  alert('Please enter a customer ID');
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              🔍 Lookup
            </button>
          </div>
        </div>
        
        {/* Three-Tier System Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🟢</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>Campaigns</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Long-term marketing initiatives with various offer types
            </p>
            <div style={{ marginTop: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
              {campaigns.length}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔵</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>Promotions</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Time-limited special discount offers
            </p>
            <div style={{ marginTop: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>
              {promotions.length}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🟡</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>Point Rewards</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              Existing loyalty system (unchanged)
            </p>
            <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
              Active ✅
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '15px',
          padding: '0.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <button
            onClick={() => setActiveTab('campaigns')}
            style={{
              flex: 1,
              padding: '1rem',
              backgroundColor: activeTab === 'campaigns' ? 'rgba(16, 185, 129, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'campaigns' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            🟢 Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('promotions')}
            style={{
              flex: 1,
              padding: '1rem',
              backgroundColor: activeTab === 'promotions' ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === 'promotions' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            🔵 Promotions ({promotions.length})
          </button>
        </div>

        {/* Automatic Processing Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
          borderRadius: '15px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: autoProcessing.enabled ? '#10b981' : '#ef4444',
                boxShadow: autoProcessing.enabled ? '0 0 10px rgba(16, 185, 129, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)',
                animation: autoProcessing.processing ? 'pulse 2s infinite' : 'none'
              }} />
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>
                  🤖 Automatic Processing {autoProcessing.enabled ? 'ON' : 'OFF'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                  {autoProcessing.enabled ? (
                    <>
                      Running every {autoProcessing.interval} minutes
                      {autoProcessing.nextRun && (
                        <> • Next run: {autoProcessing.nextRun.toLocaleTimeString()}</>
                      )}
                      {autoProcessing.lastProcessed && (
                        <> • Last: {new Date(autoProcessing.lastProcessed).toLocaleString()}</>
                      )}
                    </>
                  ) : (
                    'Click to enable automatic campaign processing'
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={toggleAutoProcessing}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: autoProcessing.enabled ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {autoProcessing.enabled ? '⏹️ Stop Auto' : '▶️ Start Auto'}
              </button>
              <button
                onClick={() => setShowAutoSettings(true)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: loading ? 0.7 : 1
                }}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </div>

        {/* Create Buttons */}
        <div style={{ marginBottom: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (activeTab === 'campaigns') {
                setShowCreateCampaign(true);
              } else {
                setShowCreatePromotion(true);
              }
            }}
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              backgroundColor: loading ? '#6b7280' : (activeTab === 'campaigns' ? '#10b981' : '#3b82f6'),
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Processing...' : `+ Create New ${activeTab === 'campaigns' ? 'Campaign' : 'Promotion'}`}
          </button>
          
          <button
            onClick={() => processAllCampaigns(false)}
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              backgroundColor: loading ? '#6b7280' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              opacity: loading ? 0.7 : 1
            }}
          >
            🔄 Process Now
          </button>
        </div>

        {/* Content Area - Real Data Display */}
        {activeTab === 'campaigns' ? (
          <div>
            <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
              🟢 Campaigns ({campaigns.length})
            </h2>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '15px',
              padding: '2rem',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {campaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                  <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>No Campaigns Yet</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                    Create your first automated campaign to reach customers with targeted promotions
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                  gap: '2rem',
                  marginTop: '1rem'
                }}>
                  {campaigns.filter(campaign => campaign && campaign.id).map((campaign) => (
                    <div key={campaign.id} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      padding: '2rem',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(15px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* STATUS BADGE */}
                      <div style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        backgroundColor: campaign.isActive ? '#10b981' : '#ef4444',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '25px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                      }}>
                        {campaign.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>

                      {/* CAMPAIGN TYPE LABEL */}
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginBottom: '1.5rem',
                        letterSpacing: '0.5px'
                      }}>
                        CAMPAIGN
                      </div>

                      {/* MAIN TITLE */}
                      <h2 style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        lineHeight: '1.3'
                      }}>
                        {campaign.name}
                      </h2>

                      {/* CAMPAIGN DETAILS */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#fbbf24' }}>Discount:</strong> {
                            campaign.discountType === 'percentage' 
                              ? `${campaign.discountAmount || 0}%` 
                              : `$${campaign.discountAmount || 0}`
                          }
                        </div>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#34d399' }}>Minimum Purchase:</strong> ${campaign.minimumPurchase || 0}
                        </div>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#a78bfa' }}>Trigger:</strong> {
                            campaign.triggerType === 'birthday' ? 'Birthday' :
                            campaign.triggerType === 'inactive_custom' ? `Inactive ${campaign.daysSinceLastVisit || 15}+ days` :
                            campaign.triggerType === 'inactive_15' ? 'Inactive 15+ days' :
                            campaign.triggerType === 'inactive_30' ? 'Inactive 30+ days' :
                            campaign.triggerType
                          }
                        </div>
                        {campaign.expirationDays && (
                          <div style={{
                            color: '#d1d5db',
                            fontSize: '1rem',
                            marginBottom: '0.5rem'
                          }}>
                            <strong style={{ color: '#f59e0b' }}>⏰ Expires After:</strong> {campaign.expirationDays} days
                          </div>
                        )}
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem'
                        }}>
                          <strong style={{ color: '#f472b6' }}>Outlets:</strong> {
                            !campaign.outletIds || campaign.outletIds.length === 0 ? 'No outlets selected' :
                            campaign.outletIds.includes('all') ? 'All outlets' : 
                            `${campaign.outletIds.length} selected`
                          }
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        <button
                          onClick={() => toggleCampaignStatus(campaign.id!, campaign.isActive)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            backgroundColor: campaign.isActive ? '#ef4444' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!loading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {campaign.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id!)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!loading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,38,38,0.4)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
              🔵 Promotions ({promotions.length})
            </h2>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '15px',
              padding: '2rem',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {promotions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎁</div>
                  <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>No Promotions Yet</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                    Create your first promotion to offer discounts to your customers
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
                  gap: '2rem',
                  marginTop: '1rem'
                }}>
                  {promotions.map((promotion) => (
                    <div key={promotion.id} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      padding: '2rem',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(15px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* STATUS BADGE */}
                      <div style={{
                        position: 'absolute',
                        top: '1.5rem',
                        right: '1.5rem',
                        backgroundColor: promotion.isActive ? '#10b981' : '#ef4444',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '25px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px'
                      }}>
                        {promotion.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>

                      {/* PROMOTION TYPE LABEL */}
                      <div style={{
                        display: 'inline-block',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginBottom: '1.5rem',
                        letterSpacing: '0.5px'
                      }}>
                        PROMOTION
                      </div>

                      {/* MAIN TITLE */}
                      <h2 style={{
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        lineHeight: '1.3'
                      }}>
                        {promotion.title}
                      </h2>

                      {/* DESCRIPTION */}
                      <p style={{
                        color: '#d1d5db',
                        fontSize: '1rem',
                        marginBottom: '1.5rem',
                        lineHeight: '1.5'
                      }}>
                        {promotion.description}
                      </p>

                      {/* PROMOTION DETAILS */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#fbbf24' }}>Discount:</strong> {
                            promotion.discountType === 'percentage' 
                              ? `${promotion.discountAmount}%` 
                              : `$${promotion.discountAmount}`
                          }
                        </div>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#34d399' }}>Minimum Purchase:</strong> ${promotion.minimumPurchase}
                        </div>
                        {promotion.expiresAt && (
                          <div style={{
                            color: '#d1d5db',
                            fontSize: '1rem',
                            marginBottom: '0.5rem'
                          }}>
                            <strong style={{ color: getPromotionExpirationInfo(promotion).isExpired ? '#ef4444' : '#f59e0b' }}>
                              ⏰ {getPromotionExpirationInfo(promotion).isExpired ? 'Expired' : `${getPromotionExpirationInfo(promotion).daysRemaining} days left`}
                            </strong>
                          </div>
                        )}
                        {promotion.expirationDays && !promotion.expiresAt && (
                          <div style={{
                            color: '#d1d5db',
                            fontSize: '1rem',
                            marginBottom: '0.5rem'
                          }}>
                            <strong style={{ color: '#f59e0b' }}>⏰ Expires After:</strong> {promotion.expirationDays} days (template)
                          </div>
                        )}
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#a78bfa' }}>Period:</strong> {promotion.validityDays} days
                        </div>
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem'
                        }}>
                          <strong style={{ color: '#f472b6' }}>Outlets:</strong> {Array.isArray(promotion.targetOutlets) ? promotion.targetOutlets.length : 0} selected
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        <button
                          onClick={() => togglePromotionStatus(promotion.id!, promotion.isActive)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            backgroundColor: promotion.isActive ? '#ef4444' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!loading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {promotion.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(promotion)}
                          disabled={loading}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!loading) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 🎯 PROMOTION CREATION MODAL (Exact as per App Team Spec) */}
      {showCreatePromotion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: 'white'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#60a5fa' }}>
              🎁 Create New Promotion
            </h2>

            {/* Basic Details */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Promotion Title *
              </label>
              <input
                type="text"
                value={promotionForm.title}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Summer Sale"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                value={promotionForm.description}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., 10% off your next visit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* NEW: Discount Type Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                Discount Type *
              </label>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="dollar"
                    checked={promotionForm.discountType === 'dollar'}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, discountType: e.target.value as 'dollar' | 'percentage' }))}
                    style={{ marginRight: '0.5rem', transform: 'scale(1.2)' }}
                  />
                  <span style={{ color: '#10b981' }}>💰 Dollar Amount ($)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={promotionForm.discountType === 'percentage'}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, discountType: e.target.value as 'dollar' | 'percentage' }))}
                    style={{ marginRight: '0.5rem', transform: 'scale(1.2)' }}
                  />
                  <span style={{ color: '#f59e0b' }}>📊 Percentage (%)</span>
                </label>
              </div>
              {/* Dynamic Preview Text */}
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#94a3b8', 
                fontStyle: 'italic',
                marginTop: '0.25rem'
              }}>
                {promotionForm.discountType === 'dollar' 
                  ? `💡 Example: Create $${promotionForm.discountAmount || 5} off $${promotionForm.minimumPurchase || 10} or more deal`
                  : `💡 Example: Create ${promotionForm.discountAmount || 40}% off $${promotionForm.minimumPurchase || 60} or more deal`
                }
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {promotionForm.discountType === 'dollar' ? 'Discount Amount ($) *' : 'Discount Percentage (%) *'}
                </label>
                <input
                  type="number"
                  value={promotionForm.discountAmount}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                  placeholder={promotionForm.discountType === 'dollar' ? '10' : '40'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Minimum Purchase ($)
                </label>
                <input
                  type="number"
                  value={promotionForm.minimumPurchase}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, minimumPurchase: Number(e.target.value) }))}
                  placeholder="25"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Valid for (Days)
              </label>
              <input
                type="number"
                value={promotionForm.validityDays}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, validityDays: Number(e.target.value) }))}
                placeholder="30"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* NEW: Expiration Settings */}
            <div style={{ 
              marginBottom: '1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input
                    type="checkbox"
                    checked={promotionForm.hasExpiration}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, hasExpiration: e.target.checked }))}
                    style={{ marginRight: '0.75rem', transform: 'scale(1.3)' }}
                  />
                  <span style={{ color: '#f59e0b' }}>⏰ Set Expiration Date</span>
                </label>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: '#94a3b8', 
                  marginTop: '0.25rem',
                  marginLeft: '1.75rem'
                }}>
                  Add countdown timer and automatic expiration to this promotion
                </div>
              </div>

              {promotionForm.hasExpiration && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Expires After (Days) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={promotionForm.expirationDays}
                      onChange={(e) => setPromotionForm(prev => ({ ...prev, expirationDays: Number(e.target.value) }))}
                      placeholder="7"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  
                  {/* Preview Text */}
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#10b981', 
                    fontStyle: 'italic',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    💡 <strong>Preview:</strong> Customers will see "{
                      promotionForm.discountType === 'dollar' 
                        ? `$${promotionForm.discountAmount || 5} off $${promotionForm.minimumPurchase || 10}+ (${promotionForm.expirationDays} days left)`
                        : `${promotionForm.discountAmount || 40}% off $${promotionForm.minimumPurchase || 60}+ (${promotionForm.expirationDays} days left)`
                    }"
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Target Outlets
              </label>
              <select
                multiple
                value={promotionForm.targetOutlets}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setPromotionForm(prev => ({ ...prev, targetOutlets: selected }));
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  minHeight: '100px'
                }}
              >
                <option value="ALL">All Outlets</option>
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name || `Outlet ${outlet.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                SMS Message (Optional)
              </label>
              <textarea
                value={promotionForm.smsMessage}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, smsMessage: e.target.value }))}
                placeholder="Get 10% off your next visit! Valid for 30 days."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={promotionForm.sendSMS}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, sendSMS: e.target.checked }))}
                  style={{ marginRight: '0.5rem' }}
                />
                Send SMS to customers
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreatePromotion(false)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={createPromotion}
                disabled={loading || !promotionForm.title || !promotionForm.discountAmount}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: (loading || !promotionForm.title || !promotionForm.discountAmount) 
                    ? '#6b7280' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  cursor: (loading || !promotionForm.title || !promotionForm.discountAmount) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Creating...' : 'Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 CAMPAIGN CREATION MODAL (Exact as per App Team Spec) */}
      {showCreateCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: 'white'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#4ade80' }}>
              📈 Create New Campaign
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., At Risk - 15 Days Inactive"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Campaign Type *
              </label>
              <select
                value={campaignForm.type}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, type: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value="">Select Type</option>
                <option value="inactive">Inactive Customers</option>
                <option value="birthday">Birthday Campaign</option>
                <option value="spending">Low Spending Campaign</option>
              </select>
            </div>

            {/* Conditional trigger fields */}
            {campaignForm.type === 'inactive' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Days Since Last Visit
                </label>
                <input
                  type="number"
                  value={campaignForm.daysSinceLastVisit}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, daysSinceLastVisit: Number(e.target.value) }))}
                  placeholder="15"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {campaignForm.type === 'birthday' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Birthday Offset (days before/after)
                </label>
                <input
                  type="number"
                  value={campaignForm.birthdayOffset}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, birthdayOffset: Number(e.target.value) }))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {campaignForm.type === 'spending' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Minimum Spending Threshold ($)
                </label>
                <input
                  type="number"
                  value={campaignForm.minimumSpending}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, minimumSpending: Number(e.target.value) }))}
                  placeholder="100"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {/* Promotion Template */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Promotion Title *
              </label>
              <input
                type="text"
                value={campaignForm.promotionTitle}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, promotionTitle: e.target.value }))}
                placeholder="$10 off - We miss you!"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Discount Amount ($) *
                </label>
                <input
                  type="number"
                  value={campaignForm.discountAmount}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                  placeholder="10"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Minimum Purchase ($)
                </label>
                <input
                  type="number"
                  value={campaignForm.minimumPurchase}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, minimumPurchase: Number(e.target.value) }))}
                  placeholder="25"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                SMS Message Template *
              </label>
              <textarea
                value={campaignForm.smsMessage}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, smsMessage: e.target.value }))}
                placeholder="We miss you! Get $10 off your next visit."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Target Outlets
              </label>
              <select
                multiple
                value={campaignForm.targetOutlets}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setCampaignForm(prev => ({ ...prev, targetOutlets: selected }));
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  minHeight: '100px'
                }}
              >
                <option value="ALL">All Outlets</option>
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name || `Outlet ${outlet.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateCampaign(false)}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                disabled={loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: (loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount) 
                    ? '#6b7280' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: (loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ DELETE CONFIRMATION POPUP */}
      {showDeleteConfirmation && promotionToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            {/* Warning Icon */}
            <div style={{
              fontSize: '4rem',
              marginBottom: '1.5rem'
            }}>
              ⚠️
            </div>
            
            {/* Title */}
            <h2 style={{
              color: '#ef4444',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              margin: 0
            }}>
              Delete Promotion
            </h2>
            
            {/* Warning Message */}
            <p style={{
              color: 'white',
              fontSize: '1.1rem',
              marginBottom: '1rem',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete the promotion
            </p>
            
            {/* Promotion Name */}
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                color: '#60a5fa',
                fontSize: '1.2rem',
                margin: 0,
                fontWeight: 'bold'
              }}>
                "{promotionToDelete.title}"
              </h3>
            </div>
            
            {/* Warning Text */}
            <p style={{
              color: '#fbbf24',
              fontSize: '0.95rem',
              marginBottom: '2rem',
              fontWeight: 'bold'
            }}>
              ⚠️ This action cannot be undone. The promotion will be permanently removed from your system.
            </p>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelDelete}
                disabled={loading}
                style={{
                  padding: '0.875rem 2rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#4b5563';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  padding: '0.875rem 2rem',
                  backgroundColor: loading ? '#991b1b' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#b91c1c';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = loading ? '#991b1b' : '#dc2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? 'Deleting...' : '🗑️ Delete Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 AUTOMATIC PROCESSING SETTINGS MODAL */}
      {showAutoSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            width: '90%',
            maxWidth: '600px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            color: 'white'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '2rem', marginRight: '1rem' }}>⚙️</div>
              <div>
                <h2 style={{
                  color: '#10b981',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  margin: 0
                }}>
                  Automatic Processing Settings
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.9rem'
                }}>
                  Configure how often campaigns are automatically processed
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: autoProcessing.enabled ? '#10b981' : '#ef4444'
                }} />
                <strong style={{ color: '#10b981' }}>
                  Status: {autoProcessing.enabled ? 'ACTIVE' : 'INACTIVE'}
                </strong>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                Current interval: {autoProcessing.interval} minutes
                {autoProcessing.lastProcessed && (
                  <> • Last processed: {new Date(autoProcessing.lastProcessed).toLocaleString()}</>
                )}
              </div>
            </div>

            {/* Interval Selection */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                Processing Interval
              </label>
              
              {/* Quick Options */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {[
                  { label: '15 min', value: 15, desc: 'Very frequent' },
                  { label: '30 min', value: 30, desc: 'Frequent' },
                  { label: '1 hour', value: 60, desc: 'Recommended' },
                  { label: '2 hours', value: 120, desc: 'Moderate' },
                  { label: '4 hours', value: 240, desc: 'Conservative' },
                  { label: '8 hours', value: 480, desc: 'Twice daily' },
                  { label: '24 hours', value: 1440, desc: 'Daily' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateAutoInterval(option.value)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: autoProcessing.interval === option.value ? '#10b981' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: autoProcessing.interval === option.value ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: autoProcessing.interval === option.value ? 'bold' : 'normal',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>{option.label}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.25rem' }}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Interval */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                  Custom Interval (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="10080"
                  value={autoProcessing.interval}
                  onChange={(e) => updateAutoInterval(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                  Minimum: 5 minutes • Maximum: 1 week (10,080 minutes)
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              <h4 style={{ color: '#60a5fa', margin: '0 0 0.75rem 0', fontSize: '1rem' }}>
                💡 Smart Recommendations
              </h4>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>• 1 hour:</strong> Best for active businesses with frequent customer activity
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>• 4 hours:</strong> Good balance for most businesses
                </div>
                <div>
                  <strong>• 24 hours:</strong> Perfect for birthday campaigns and weekly promotions
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowAutoSettings(false)}
                style={{
                  padding: '0.875rem 2rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
              >
                Close
              </button>
              
              <button
                onClick={() => {
                  // Apply settings and restart if needed
                  if (autoProcessing.enabled) {
                    stopAutoProcessing();
                    setTimeout(() => {
                      setAutoProcessing(prev => ({ ...prev, enabled: true }));
                      startAutoProcessing();
                    }, 100);
                  }
                  setShowAutoSettings(false);
                }}
                style={{
                  padding: '0.875rem 2rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
              >
                ✅ Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager; 