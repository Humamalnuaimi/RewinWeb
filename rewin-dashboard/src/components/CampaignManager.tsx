/**
 * 🔒 USER-ISOLATED CAMPAIGN MANAGER
 *
 * FINAL ARCHITECTURE:
 * - Uses user-specific collections: /users/{userId}/promotions & /users/{userId}/campaigns  
 * - Complete data isolation per user
 * - No cross-user data access
 * - Enhanced smart targeting and analytics
 *
 * COLLECTIONS:
 * - /users/{userId}/promotions/{promotionId}
 * - /users/{userId}/campaigns/{campaignId}
 * - /users/{userId}/customers/{customerId}
 * - /users/{userId}/outlets/{outletId}
 */
import React, { useState, useEffect, useRef } from 'react';
import { type User } from 'firebase/auth';
import { firestore, auth } from '../firebase/config';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  limit,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { PromotionService } from '../services/PromotionService';
import { CampaignService } from '../services/CampaignService';
import { AutomationService } from '../services/AutomationService';
import { CampaignAutomationService } from '../services/CampaignAutomationService';

interface CampaignManagerProps {
  user: User;
  onBack: () => void;
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
  setSelectedCampaignId?: (id: string) => void;
}

// 🎯 FIREBASE DATA INTERFACES (Exact as per App Team Specification)
interface Promotion {
  id?: string;
  title: string;
  description: string;
  discountType: 'dollar' | 'percentage';  // Support both $ and % discounts
  discountAmount: number;
  minimumPurchase: number;
  targetOutlets: string[] | 'ALL';
  targetOutletId?: string;                // Optional: Single outlet targeting (app compatibility)
  targetOutletName?: string;              // Optional: Outlet name for display (app compatibility)
  expiresAt?: any;                        // App team requirement: Expiration timestamp (not days!)
  createdAt: any;
  isActive: boolean;
  source: 'manual' | 'campaign_birthday' | 'campaign_inactive';  // App team requirement
  createdBy: 'dashboard' | 'mobile';      // App team requirement
  campaignId?: string;                    // Required for campaign promotions
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
  // NEW: Automation settings
  autoProcessing?: {
    enabled: boolean;                             // Auto-processing on/off
    intervalHours: number;                        // 1, 4, 12, 24 hours
    lastRun?: any;                               // Last auto-run timestamp
    nextRun?: any;                               // Next scheduled run
  };
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
  targetOutlets: string[] | 'ALL';
  smsMessage: string;
  sendSMS: boolean;
  assignNow?: boolean;                     // NEW: Fan-out immediately to eligible customers
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
  targetOutlets: string[] | 'ALL';
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ user, onBack, currentPage, setCurrentPage, setSelectedCampaignId: propSetSelectedCampaignId }) => {
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
  
  // ✅ SUCCESS NOTIFICATION STATE
  const [successNotification, setSuccessNotification] = useState<{show: boolean, message: string}>({
    show: false,
    message: ''
  });

  // 🤖 AUTOMATION EDITOR STATE
  const [showAutomationEditor, setShowAutomationEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [automationSettings, setAutomationSettings] = useState({
    enabled: false,
    intervalHours: 24
  });

  // 🗑️ CAMPAIGN DELETE CONFIRMATION STATE
  const [showCampaignDeleteConfirmation, setShowCampaignDeleteConfirmation] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  // 🤖 NEW: AUTOMATIC PROCESSING STATE (kept for compatibility, UI hidden)
  const [autoProcessing, setAutoProcessing] = useState({
    enabled: false,
    interval: 60,
    lastProcessed: null as string | null,
    processing: false,
    nextRun: null as Date | null,
    intervalHours: 24
  });

  // Timer ref for auto-processing
  const autoProcessingTimer = useRef<NodeJS.Timer | null>(null);
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
    sendSMS: true,
    assignNow: true
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

  // Form error states (inline validation)
  const [promotionErrors, setPromotionErrors] = useState<Record<string, string>>({});
  const [campaignErrors, setCampaignErrors] = useState<Record<string, string>>({});

  const validatePromotionForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!promotionForm.title || promotionForm.title.trim().length < 2) {
      errors.title = 'Title is required';
    }
    if (!promotionForm.discountType) {
      errors.discountType = 'Select a discount type';
    }
    if (!promotionForm.discountAmount || promotionForm.discountAmount <= 0) {
      errors.discountAmount = 'Enter a positive discount amount';
    }
    if (!Number.isFinite(promotionForm.minimumPurchase) || promotionForm.minimumPurchase < 0) {
      errors.minimumPurchase = 'Minimum purchase must be 0 or greater';
    }
    if (!promotionForm.validityDays || promotionForm.validityDays <= 0) {
      errors.validityDays = 'Valid for (days) must be greater than 0';
    }
    if (promotionForm.hasExpiration && (!promotionForm.expirationDays || promotionForm.expirationDays <= 0)) {
      errors.expirationDays = 'Expiration days must be greater than 0';
    }
    setPromotionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCampaignForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!campaignForm.name || campaignForm.name.trim().length < 2) {
      errors.name = 'Name is required';
    }
    if (!campaignForm.type) {
      errors.type = 'Select a campaign type';
    }
    if (!campaignForm.discountType) {
      errors.discountType = 'Select a discount type';
    }
    if (!campaignForm.discountAmount || campaignForm.discountAmount <= 0) {
      errors.discountAmount = 'Enter a positive discount amount';
    }
    if (!Number.isFinite(campaignForm.minimumPurchase) || campaignForm.minimumPurchase < 0) {
      errors.minimumPurchase = 'Minimum purchase must be 0 or greater';
    }
    if (campaignForm.type === 'inactive' && (!campaignForm.daysSinceLastVisit || campaignForm.daysSinceLastVisit <= 0)) {
      errors.daysSinceLastVisit = 'Days inactive must be greater than 0';
    }
    if (campaignForm.type === 'spending' && (!campaignForm.minimumSpending || campaignForm.minimumSpending <= 0)) {
      errors.minimumSpending = 'Minimum spending must be greater than 0';
    }
    setCampaignErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resolve businessId for current user (simplified - no external queries needed)
  const getCurrentBusinessId = async (): Promise<string> => {
    // For user-based system, we don't need to query external collections
    // Just return a consistent business ID for this user
    return 'esZRrfTvOdOgqsx9Dvo8';
  };

  // Minimal UI toggles
  const [showAdvancedPromotion, setShowAdvancedPromotion] = useState(false);

  // Dev/test automation triggers
  // Removed manual automation test buttons (not used on this page)

  // 🔥 USER-BASED DATA ACCESS - No business ID needed
  const getCurrentUserId = (): string => {
    if (!user) {
      throw new Error('No authenticated user');
    }
    return user.uid;
  };

  // 📱 SMS SERVICE INTEGRATION (Production-Ready with Multi-Account Support)
  const sendSMSMessage = async (phoneNumber: string, message: string) => {
    try {
      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      
      // Get the business ID for this user
      const uid = user.uid;
      const businessId = await getCurrentBusinessId();
      
      // Find the account and phone number to use for this business
      const accountPhoneNumber = await getAccountPhoneNumberForBusiness(businessId);
      
      if (!accountPhoneNumber) {
        console.log(`⚠️ No SMS phone number configured for business ${businessId} - SMS not sent`);
        return Promise.resolve();
      }
      
      // Send SMS using the new multi-tenant Twilio system
      const response = await fetch('http://localhost:5001/api/twilio/customer/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.uid,
          to: phoneNumber,
          message: message
        })
      });
      
      const result = await response.json();
      
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

  // 🎯 USER-BASED PROMOTION CREATION SYSTEM
  const createPromotion = async () => {
    try {
      setLoading(true);
      
      // Validate required fields (inline)
      if (!validatePromotionForm()) {
        setLoading(false);
        return;
      }

      console.log('🎯 Creating promotion for user:', user.uid);
      console.log('📋 Promotion data:', promotionForm);
      console.log('🎯 Target outlets selected:', promotionForm.targetOutlets);
      console.log('🎯 Available outlets:', outlets);
      
      // Create promotion object for user-based system
      const promotionData: any = {
        title: promotionForm.title,
        description: promotionForm.description,
        discountType: promotionForm.discountType,
        discountAmount: promotionForm.discountAmount,
        minimumPurchase: promotionForm.minimumPurchase,
        targetAudience: 'all',
        // Handle outlet targeting: 'ALL' string means all outlets, array means specific outlets
        targetOutlets: promotionForm.targetOutlets,
        targetCustomers: [], // Empty for all customers
        minVisitsRequired: 0,
        maxDaysSinceLastVisit: 0,
        minTotalSpent: 0
      };

      // Convert expirationDays to expiresAt Date
      if (promotionForm.hasExpiration && promotionForm.expirationDays > 0) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + promotionForm.expirationDays);
        promotionData.expiresAt = expirationDate;
      }

      // Create promotion using service
      const promotionId = await PromotionService.createPromotion(promotionData);
      
      console.log('✅ Promotion created with ID:', promotionId);
      console.log(`📍 Firebase path: /users/${user.uid}/promotions/${promotionId}`);
      
      // Get analytics for the promotion
      const analytics: any = await PromotionService.getPromotionAnalytics(promotionId);
      
      // Send SMS if requested
      if (promotionForm.sendSMS && promotionForm.smsMessage) {
        // Send SMS to eligible customers
        for (const customer of analytics.eligibleCustomers.slice(0, 10)) { // Limit to first 10 for now
          if (customer.phoneNumber) {
            await sendSMSMessage(customer.phoneNumber, promotionForm.smsMessage);
          }
        }
      }
      
      // Fan-out to per-customer promotions if requested
      if (promotionForm.assignNow) {
        try {
          const { CustomerPromotionService } = await import('../services/CustomerPromotionService');
          const expiresAtTs = promotionData.expiresAt
            ? (promotionData.expiresAt.toDate ? promotionData.expiresAt : Timestamp.fromDate(promotionData.expiresAt))
            : null;

          let createdCount = 0;
          for (const customer of analytics.eligibleCustomers) {
            const customerId = customer.id;
            const outletId = customer.outletId || customer.checkInOutletId || customer.preferredOutlet || customer.lastVisitOutlet || null;
            const detId = `promo_manual_${promotionId}_${customerId}`;
            await CustomerPromotionService.upsertBoth(customerId, detId, {
              title: promotionData.title,
              description: promotionData.description,
              discountType: promotionData.discountType,
              discountAmount: promotionData.discountAmount,
              minimumPurchase: promotionData.minimumPurchase,
              expiresAt: expiresAtTs,
              isActive: true,
              isUsed: false,
              outletId,
              campaignId: null,
              source: 'manual'
            });
            createdCount++;
          }
          console.log(`✅ Assigned promotion to ${createdCount} eligible customers`);
        } catch (err) {
          console.error('❌ Fan-out error:', err);
          alert('Fan-out to customers failed. The master promotion was created successfully.');
        }
      }

      // Show success message with analytics
      const expirationText = promotionData.expiresAt ? 
        `• Expires: ${promotionData.expiresAt.toLocaleDateString()}` : 
        '• No expiration set';

      // Store the success message for display
      const successMessage = `✅ SUCCESS! Promotion "${promotionData.title}" created!

📊 ANALYTICS:
• Will reach: ${analytics.eligibleCustomers.length} out of ${analytics.totalCustomers} customers
• Eligibility rate: ${Math.round(analytics.eligibilityRate)}%

📱 MOBILE APP:
Your customers can now see this promotion in the mobile app!

📋 PROMOTION DETAILS:
• Title: ${promotionData.title}
• Discount: ${promotionData.discountType === 'percentage' ? promotionData.discountAmount + '%' : '$' + promotionData.discountAmount} off
${expirationText}
• Target: ${promotionData.targetOutlets.length === 0 ? 'All outlets' : promotionData.targetOutlets.length + ' outlets'}`;

      // Reset form and close modal first
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
      
      // Show success notification
      setSuccessNotification({
        show: true,
        message: successMessage
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setSuccessNotification({ show: false, message: '' });
      }, 5000);
      
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
      for (const customerDoc of customersSnapshot.docs) {
        const customerData = customerDoc.data();
        const customerId = customerDoc.id;

        // Check if customer is active (default to true if not specified)
        if (customerData.isActive === false) continue;

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
            continue; // Skip this customer
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
          // 🔍 ENHANCED DUPLICATE PREVENTION (Check for any unredeemed promotions from this campaign)
          const duplicateCheckId = campaign.triggerType === 'birthday' 
            ? `promo_birthday_${customerId}_${new Date().getFullYear()}`
            : `promo_inactive_${customerId}_${campaign.id!}_${Date.now()}`;
          
          try {
            // Check for ANY existing unredeemed promotions from this campaign
            const customerPromotionsRef = collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions');
            const existingPromosQuery = query(
              customerPromotionsRef,
              where('campaignId', '==', campaign.id),
              where('isUsed', '==', false),
              where('isActive', '==', true)
            );
            const existingPromosSnapshot = await getDocs(existingPromosQuery);
            
            if (!existingPromosSnapshot.empty) {
              console.log(`   ⏭️ SKIPPING ${customerData.firstName || customerId} - already has ${existingPromosSnapshot.size} unredeemed promotion(s) from this campaign`);
              continue; // Skip this customer - they already have unredeemed promotions from this campaign
            }
          } catch (error) {
            console.warn(`⚠️ Could not check for duplicate promotion for ${customerId}:`, error);
            // Continue anyway to avoid blocking legitimate assignments
          }
          
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

          // Save to customer's promotions (using consistent duplicate-prevention ID)
          const customerPromotionRef = doc(
            firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions', duplicateCheckId
          );
          batch.set(customerPromotionRef, campaignPromotion);
          
          console.log(`💾 Saving promotion to: businesses/${businessId}/customerPromotions/${customerId}/promotions/`);
        }
      }

      // Execute batch write
      if (qualifyingCustomers.length > 0) {
        await batch.commit();
        console.log(`✅ Campaign assigned to ${qualifyingCustomers.length} qualifying customers`);

        // Count SMS-eligible customers
        const smsEligibleCount = qualifyingCustomers.filter(customer => 
          customer.data.optedInForSMS === true
        ).length;

        // Send SMS to eligible customers
        for (const customer of qualifyingCustomers) {
          if (customer.data.optedInForSMS && customer.data.phoneNumber) {
            try {
              const smsMessage = `🎉 ${campaign.name}! Get ${campaign.discountAmount}${campaign.discountType === 'percentage' ? '%' : '$'} off your next visit. Valid for 7 days. Show this message in-store.`;
              await sendSMSMessage(customer.data.phoneNumber, smsMessage);
              console.log(`📱 SMS sent to ${customer.data.name || customer.id}: ${customer.data.phoneNumber}`);
            } catch (error) {
              console.error(`❌ Failed to send SMS to ${customer.id}:`, error);
            }
          }
        }

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
  // 🚀 PROCESS ALL CAMPAIGNS (Now using Cloud Functions for production)
  const processAllCampaigns = async (isAutomatic = false) => {
    try {
      if (!isAutomatic) {
        setLoading(true);
      } else {
        setAutoProcessing(prev => ({ ...prev, processing: true }));
      }
      
      console.log(`🚀 Starting campaign processing via Cloud Function... (${isAutomatic ? 'Automatic' : 'Manual'})`);

      // 🔥 Process all active campaigns using the same logic as "Process Now"
      console.log('🚀 Processing all active campaigns...');
      
      // Get all active campaigns
      const campaignsRef = collection(firestore, 'users', user.uid, 'campaigns');
      const activeCampaignsQuery = query(campaignsRef, where('isActive', '==', true));
      const campaignsSnapshot = await getDocs(activeCampaignsQuery);
      
      let totalProcessed = 0;
      let totalAssigned = 0;
      
      // Process each active campaign
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as Campaign;
        console.log(`📢 Processing campaign: ${campaign.name}`);
        
        try {
          const result = await assignCampaignToCustomers(user.uid, campaign);
          totalAssigned += result.assigned;
          totalProcessed++;
          
          // Update last processed time and source
          await updateDoc(doc(firestore, 'users', user.uid, 'campaigns', campaign.id!), {
            lastProcessed: serverTimestamp(),
            lastProcessedBy: 'dashboard_manual',
            lastRunResult: `Dashboard: ${result.assigned} assigned`
          });
        } catch (error) {
          console.error(`❌ Error processing campaign ${campaign.name}:`, error);
        }
      }
      
      const result = { processed: totalProcessed, assigned: totalAssigned };
      console.log('✅ All campaigns processed successfully');
      
      // Update last processed time
      const now = new Date().toISOString();
      localStorage.setItem('campaignLastProcessed', now);
      setAutoProcessing(prev => ({ ...prev, lastProcessed: now }));

      if (!isAutomatic) {
        alert(`✅ Campaign Processing Complete!\n\n📊 Results:\n• ${result.processed} campaigns processed\n• ${result.assigned} promotions assigned`);
      } else {
        console.log(`✅ Automation processing complete: ${result.processed} campaigns, ${result.assigned} assignments`);
      }

      return { processed: result.processed, assigned: result.assigned };
      
    } catch (error) {
      console.error('❌ Error calling Cloud Function:', error);
      
      // If Cloud Function fails, show helpful error message
      let errorMessage = 'Unknown error';
      if (error.code === 'functions/not-found') {
        errorMessage = 'Cloud Functions not deployed. Please deploy functions first.';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (!isAutomatic) {
        alert(`❌ Error processing campaigns via Cloud Function:\n\n${errorMessage}\n\nNote: Cloud Functions provide production-ready automation that works even when the website is closed.`);
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

  // (Cloud-only) local processing removed

  // 🔄 START AUTO-PROCESSING
  const startAutoProcessing = () => {
    // Start the automation service
    CampaignAutomationService.startAutomation();
    
    // Set up interval for client-side checking
    if (autoProcessingTimer.current) {
      clearInterval(autoProcessingTimer.current);
    }

    const intervalMs = (autoProcessing.intervalHours || 24) * 60 * 60 * 1000;
    autoProcessingTimer.current = setInterval(() => {
      processAllCampaigns(true);
    }, intervalMs);

    updateNextRunTime();
    console.log('✅ Auto-processing started');
  };

  // ⏹️ STOP AUTO-PROCESSING
  const stopAutoProcessing = () => {
    // Stop the automation service
    CampaignAutomationService.stopAutomation();
    
    if (autoProcessingTimer.current) {
      clearInterval(autoProcessingTimer.current);
      autoProcessingTimer.current = null;
    }
    console.log('⏹️ Auto-processing stopped');
  };

  // 🕐 UPDATE NEXT RUN TIME
  const updateNextRunTime = () => {
    const now = new Date();
    const intervalHours = autoProcessing.intervalHours || 24;
    const nextRun = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    setAutoProcessing(prev => ({ ...prev, nextRun: nextRun.toISOString() }));
  };

  // 🔄 TOGGLE AUTO PROCESSING
  const toggleAutoProcessing = () => {
    if (autoProcessing.enabled) {
      stopAutoProcessing();
      setAutoProcessing(prev => ({ ...prev, enabled: false }));
    } else {
      setAutoProcessing(prev => ({ ...prev, enabled: true }));
      startAutoProcessing();
    }
  };

  // ⚙️ UPDATE AUTO INTERVAL
  const updateAutoInterval = (hours: number) => {
    setAutoProcessing(prev => ({ ...prev, intervalHours: hours }));
    if (autoProcessing.enabled) {
      stopAutoProcessing();
      setTimeout(() => startAutoProcessing(), 100);
    }
  };

  // 🎯 ALTERNATIVE: ASSIGN TO USER'S CUSTOMERS (when they're in /users/{uid}/customers/)
  const assignPromotionToUserCustomers = async (businessId: string, promotionId: string, promotion: Promotion, customersSnapshot: any) => {
    try {
      console.log('🔄 Assigning promotion to user\'s customers...');
      
      const batch = writeBatch(firestore);
      let assignedCount = 0;
      let smsEligibleCount = 0;

      for (const customerDoc of customersSnapshot.docs) {
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
            expiresAt: promotion.expiresAt || null              // Use promotion's expiration timestamp
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
      }

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
      
      // Use promotion's expiration timestamp (no need to calculate)
      const expiresAt = promotion.expiresAt ? promotion.expiresAt.toDate() : null;
      
      // Assign to each customer with graceful field handling
      for (const customerDoc of userCustomersSnapshot.docs) {
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
            continue; // Skip this customer
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
      }
      
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
      
      // Get all customers from customers collection (as per Firebase console data)
      const customersRef = collection(firestore, 'users', user.uid, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      console.log(`📋 Found ${customersSnapshot.size} total customers for SMS`);
      
      let smsEligibleCount = 0;
      let smsSentCount = 0;
      let smsFailedCount = 0;
      
      // Send SMS to each eligible customer
      for (const customerDoc of customersSnapshot.docs) {
        const customer = customerDoc.data();
        
        // Enhanced SMS eligibility checking
        const hasPhoneNumber = customer.phoneNumber && customer.phoneNumber.trim();
        const isOptedIn = customer.optedInForSMS === true || customer.optedInForSMS === undefined; // Default to true if not set
        const hasValidPhoneFormat = hasPhoneNumber && /^\+[1-9]\d{1,14}$/.test(customer.phoneNumber.trim());
        
        // Check outlet targeting if applicable
        let isInTargetOutlet = true;
        if (promotion.targetOutlets !== 'ALL' && Array.isArray(promotion.targetOutlets)) {
          isInTargetOutlet = customer.outletId && promotion.targetOutlets.includes(customer.outletId);
        }
        
        console.log(`📱 Customer ${customer.firstName || customer.customerId}:`, {
          hasPhoneNumber: !!hasPhoneNumber,
          phoneNumber: customer.phoneNumber,
          isOptedIn,
          hasValidPhoneFormat,
          isInTargetOutlet,
          outletId: customer.outletId
        });
        
        if (hasPhoneNumber && isOptedIn && isInTargetOutlet) {
          smsEligibleCount++;
          try {
            // Ensure phone number is in international format
            let phoneNumber = customer.phoneNumber.trim();
            if (!phoneNumber.startsWith('+')) {
              // Add +1 for US numbers if not already formatted
              phoneNumber = phoneNumber.startsWith('1') ? `+${phoneNumber}` : `+1${phoneNumber}`;
            }
            
            await sendSMSMessage(phoneNumber, smsMessage);
            smsSentCount++;
            console.log(`✅ SMS sent to ${phoneNumber} (${customer.firstName || customer.customerId})`);
          } catch (smsError) {
            smsFailedCount++;
            console.warn(`⚠️ Failed to send SMS to ${customer.phoneNumber}:`, smsError);
            // Continue with other customers even if one fails
          }
        } else {
          console.log(`❌ Customer ${customer.firstName || customer.customerId} not eligible:`, {
            hasPhoneNumber: !!hasPhoneNumber,
            isOptedIn,
            isInTargetOutlet
          });
        }
      }
      
      console.log(`📱 SMS Summary: ${smsSentCount}/${smsEligibleCount} eligible customers notified (${smsFailedCount} failed)`);
      
      if (smsEligibleCount === 0) {
        console.log('ℹ️ No customers eligible for SMS (missing phone number or not opted in)');
        // Show user-friendly message
        alert(`ℹ️ Promotion created successfully! No SMS sent because:\n• ${customersSnapshot.size} customers found\n• 0 customers have valid phone numbers and SMS opt-in`);
      } else if (smsSentCount > 0) {
        alert(`✅ Promotion created successfully!\n📱 SMS sent to ${smsSentCount} customers`);
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
      let daysSinceLastVisit: number = 0; // Default to 0 instead of undefined
      
      switch (campaignForm.type) {
        case 'inactive':
          // Use custom trigger type and store the actual days
          triggerType = 'inactive_custom';
          daysSinceLastVisit = campaignForm.daysSinceLastVisit || 0;
          break;
        case 'birthday':
          triggerType = 'birthday';
          daysSinceLastVisit = 0; // Not applicable for birthday campaigns
          break;
        case 'spending':
          // For now, map spending campaigns to inactive (you can adjust this later)
          triggerType = 'inactive_15';
          daysSinceLastVisit = 15; // Default for spending campaigns
          break;
        default:
          triggerType = 'birthday';
          daysSinceLastVisit = 0; // Default for unknown types
      }
      
      const campaign: Campaign = {
        name: campaignForm.name,
        discountType: campaignForm.discountType,
        discountAmount: campaignForm.discountAmount,
        minimumPurchase: campaignForm.minimumPurchase,
        triggerType: triggerType,
        daysSinceLastVisit: daysSinceLastVisit, // Store custom days
        outletIds: (() => {
          // Handle targetOutlets conversion to outletIds
          if (campaignForm.targetOutlets === 'ALL') {
            return ['all'];
          } else if (Array.isArray(campaignForm.targetOutlets) && campaignForm.targetOutlets.length > 0) {
            return campaignForm.targetOutlets;
          } else {
            return ['all']; // Default to all outlets if none selected
          }
        })(),
        expirationDays: 7, // Default 7-day expiration
        isActive: true,
        createdAt: Timestamp.now(),
        // 🤖 AUTO-ENABLE 24-HOUR CLOUD AUTOMATION
        autoProcessing: {
          enabled: true,
          intervalHours: 24,
          lastRun: null
        },
        lastProcessed: null,
        lastProcessedBy: null,
        lastRunResult: 'Campaign created - awaiting first run'
      };
      
      // Save to Firebase: /users/{userId}/campaigns/{campaignId}
      await addDoc(
        collection(firestore, 'users', user.uid, 'campaigns'),
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

  // 📊 DATA LOADING FUNCTIONS - USER-BASED
  const loadPromotions = async () => {
    try {
      console.log('📊 Loading promotions from user collection...');
      const loadedPromotions = await PromotionService.getPromotions();
      setPromotions(loadedPromotions as Promotion[]);
      console.log(`✅ Loaded ${loadedPromotions.length} promotions`);
    } catch (error) {
      console.error('❌ Error loading promotions:', error);
    }
  };

  // 🧹 CLEAN ALL DATA (USER-BASED)
  const cleanAllData = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL your campaigns and promotions. Are you absolutely sure?')) return;
    if (!confirm('⚠️ FINAL WARNING: This action cannot be undone. Continue?')) return;
    
    try {
      setLoading(true);
      console.log('🧹 Starting complete user data cleanup...');
      
      let totalDeleted = 0;
      
      // 1. Delete all campaigns using service
      console.log('🗑️ Deleting all campaigns...');
      const userCampaigns = await CampaignService.getCampaigns();
      for (const campaign of userCampaigns) {
        await CampaignService.deleteCampaign(campaign.id);
        totalDeleted++;
        console.log(`   ✅ Deleted campaign: ${campaign.name}`);
      }
      
      // 2. Delete all promotions using service
      console.log('🗑️ Deleting all promotions...');
      const userPromotions = await PromotionService.getPromotions();
      for (const promotion of userPromotions) {
        await PromotionService.deletePromotion(promotion.id);
        totalDeleted++;
        console.log(`   ✅ Deleted promotion: ${promotion.title}`);
      }
      
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

  // 🤖 OPEN AUTOMATION EDITOR
  const openAutomationEditor = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setAutomationSettings({
      enabled: campaign.autoProcessing?.enabled || false,
      intervalHours: campaign.autoProcessing?.intervalHours || 24
    });
    setShowAutomationEditor(true);
  };

  // 🤖 SAVE AUTOMATION SETTINGS
  const saveAutomationSettings = async () => {
    if (!editingCampaign?.id) return;
    
    try {
      setLoading(true);
      
      const nextRun = automationSettings.enabled 
        ? new Date(Date.now() + (automationSettings.intervalHours * 60 * 60 * 1000))
        : null;
      
      const updatedAutoProcessing = {
        enabled: automationSettings.enabled,
        intervalHours: automationSettings.intervalHours,
        lastRun: editingCampaign.autoProcessing?.lastRun || null,
        nextRun: nextRun ? Timestamp.fromDate(nextRun) : null
      };
      
      // Update campaign in Firebase
      const campaignRef = doc(firestore, 'users', user.uid, 'campaigns', editingCampaign.id);
      await updateDoc(campaignRef, {
        autoProcessing: updatedAutoProcessing
      });
      
      // Update local state
      setCampaigns(prev => prev.map(c => 
        c.id === editingCampaign.id 
          ? { ...c, autoProcessing: updatedAutoProcessing }
          : c
      ));
      
      // Close editor
      setShowAutomationEditor(false);
      setEditingCampaign(null);
      
      // Show success message
      setSuccessNotification({
        show: true,
        message: `✅ Automation settings updated!\n\n🤖 Auto-processing: ${automationSettings.enabled ? 'ENABLED' : 'DISABLED'}\n⏰ Interval: Every ${automationSettings.intervalHours} hours${automationSettings.enabled ? `\n🚀 Next run: ${nextRun?.toLocaleString()}` : ''}`
      });
      
      setTimeout(() => {
        setSuccessNotification({ show: false, message: '' });
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error saving automation settings:', error);
      alert(`❌ Error saving automation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ HANDLE CAMPAIGN DELETE CLICK
  const handleCampaignDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setShowCampaignDeleteConfirmation(true);
  };

  // 🗑️ CONFIRM CAMPAIGN DELETE
  const confirmCampaignDelete = async () => {
    if (!campaignToDelete?.id) return;
    
    try {
      setLoading(true);
      const businessId = await getCurrentBusinessId();
      
      console.log('🗑️ DIRECT CAMPAIGN DELETION - Bypassing CampaignService...');
      
      const campaignId = campaignToDelete.id;
      const campaignName = campaignToDelete?.name || '';
      
      console.log('🔍 DEBUGGING CAMPAIGN DELETION:');
      console.log(`   📋 Campaign ID: "${campaignId}"`);
      console.log(`   📋 Campaign Name: "${campaignName}"`);
      console.log(`   📋 Campaign Object:`, campaignToDelete);
      
      // Step 1: Delete the main campaign
      await deleteDoc(doc(firestore, 'users', user.uid, 'campaigns', campaignId));
      console.log('✅ Main campaign deleted');

      // Step 2: Delete all customer promotions from this campaign
      const customerPromotionsRef = collection(firestore, 'users', user.uid, 'customerPromotions');
      const customersSnapshot = await getDocs(customerPromotionsRef);
      
      console.log(`🔍 Found ${customersSnapshot.size} customers to check for promotions`);
      
      let deletedPromotions = 0;
      
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        console.log(`🔍 Checking customer: ${customerId}`);
        
        const customerPromotionsCollectionRef = collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions');
        const allPromotionsSnapshot = await getDocs(customerPromotionsCollectionRef);
        
        console.log(`   📋 Customer ${customerId} has ${allPromotionsSnapshot.size} total promotions`);
        
        for (const promotionDoc of allPromotionsSnapshot.docs) {
          const promotionData = promotionDoc.data();
          console.log(`   🔍 Checking promotion:`, promotionDoc.id, promotionData);
          
          // Check if this promotion belongs to the campaign we're deleting
          if (promotionData.campaignId === campaignId) {
            console.log(`   🗑️ DELETING promotion ${promotionDoc.id} - matches campaignId`);
            await deleteDoc(promotionDoc.ref);
            deletedPromotions++;
          } else {
            console.log(`   ⏭️ KEEPING promotion ${promotionDoc.id} - different campaignId: ${promotionData.campaignId}`);
          }
        }
      }
      
      console.log(`✅ Deleted ${deletedPromotions} promotions from campaign "${campaignName}"`);
      
      console.log(`✅ Campaign "${campaignName}" deleted successfully using secure deletion method`);
      
      loadCampaigns();
      alert(`✅ Campaign "${campaignName}" deleted successfully!\n🧹 Only promotions from this specific campaign were removed.`);
      
      setLoading(false);
      setShowCampaignDeleteConfirmation(false);
      setCampaignToDelete(null);
      return; // Exit early to avoid the old deletion logic
      
      console.log(`🔍 Available campaigns in state:`);
      campaigns.forEach(c => {
        console.log(`   - ${c.name} (ID: ${c.id})`);
      });
      console.log(`🔍 Looking for campaign with ID: ${campaignId}`);
      console.log(`🔍 Found campaign: ${campaignToDelete ? 'YES' : 'NO'}`);
      
      console.log(`🔍 Deleting campaign: "${campaignName}" (ID: ${campaignId})`);
      console.log(`👤 Using user ID: ${user.uid}`);
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
          const customerPromotionsRef = collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions');
         
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
      batch.delete(doc(firestore, 'users', user.uid, 'campaigns', campaignId));
      
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

  // 🗑️ CANCEL CAMPAIGN DELETE
  const cancelCampaignDelete = () => {
    setShowCampaignDeleteConfirmation(false);
    setCampaignToDelete(null);
  };

  const loadCampaigns = async () => {
    try {
      console.log('📊 Loading campaigns from user collection...');
      const loadedCampaigns = await CampaignService.getCampaigns();
      setCampaigns(loadedCampaigns as Campaign[]);
      console.log(`✅ Loaded ${loadedCampaigns.length} campaigns`);
    } catch (error) {
      console.error('❌ Error loading campaigns:', error);
    }
  };

  const loadOutlets = async () => {
    try {
      console.log('📊 Loading outlets from user collection...');
      const loadedOutlets = await PromotionService.getOutlets();
      setOutlets(loadedOutlets);
      console.log(`✅ Loaded ${loadedOutlets.length} outlets`);
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
      console.log('🗑️ Deleting promotion:', promotionToDelete.title);
      
      const promotionId = promotionToDelete.id!;
      
      // Use the PromotionService to delete the promotion
      // This ensures consistent deletion logic
      await PromotionService.deletePromotion(promotionId);
      
      console.log(`✅ Promotion deleted successfully`);
      
      // Reload promotions to update the display
      await loadPromotions();
      
      // Close confirmation dialog
      setShowDeleteConfirmation(false);
      setPromotionToDelete(null);
      
      // Show success notification
      setSuccessNotification({
        show: true,
        message: `✅ Promotion "${promotionToDelete.title}" deleted successfully!`
      });
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => {
        setSuccessNotification({ show: false, message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error deleting promotion:', error);
      setShowDeleteConfirmation(false);
      setPromotionToDelete(null);
      
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Error deleting promotion: ${errorMessage}\n\nPlease try again or check the console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setPromotionToDelete(null);
  };

  // 🎯 PROCESS SINGLE CAMPAIGN
  const processSingleCampaign = async (campaign: Campaign) => {
    try {
      setLoading(true);
      console.log('🎯 Processing single campaign:', campaign.name);
      
      // Process this specific campaign
      const result = await assignCampaignToCustomers(user.uid, campaign);
      
      // Show success message
      setSuccessNotification({
        show: true,
        message: `✅ Campaign "${campaign.name}" processed successfully!\n\n📊 Results:\n• ${result.assigned} customers received promotions\n• Promotions are now visible in the mobile app\n• SMS notifications sent to eligible customers`
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setSuccessNotification({ show: false, message: '' });
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error processing campaign:', error);
      alert(`❌ Error processing campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };



  // 🔄 TOGGLE CAMPAIGN ACTIVE STATUS
  const toggleCampaignStatus = async (campaignId: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const newStatus = !currentStatus;
      console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} campaign ${campaignId}`);
      
      // Update the campaign status using CampaignService
      await CampaignService.updateCampaign(campaignId, {
        isActive: newStatus
      });
      
      console.log(`✅ Campaign ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Note: When deactivating a campaign, we don't remove existing promotions
      // The campaign will simply stop creating NEW promotions for future triggers
      // Existing customer promotions remain active until they expire naturally
      
      // Reload campaigns to update the display
      await loadCampaigns();
      alert(`Campaign ${newStatus ? 'activated' : 'deactivated'} successfully!${!newStatus ? '\n\n📝 Note: Existing customer promotions will remain active until they expire naturally. The campaign will stop creating new promotions.' : ''}`);
      
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
      const uid = user.uid;
      
      const newStatus = !currentStatus;
      console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} promotion ${promotionId}`);
      
      // Step 1: Update the master promotion status using PromotionService
      await PromotionService.updatePromotion(promotionId, {
        isActive: newStatus
      });
      
      // Step 2: Update customer assignments if deactivating
      let customerUpdateCount = 0;
      if (!newStatus) {
        const allCustomersRef = collection(firestore, 'users', uid, 'customerPromotions');
        const customersSnapshot = await getDocs(allCustomersRef);
        
        const batch = writeBatch(firestore);
        
        // Deactivate this promotion for all customers
        for (const customerDoc of customersSnapshot.docs) {
          const customerPromotionRef = doc(firestore, 'users', uid, 'customerPromotions', customerDoc.id, 'promotions', promotionId);
          
          try {
            // Check if customer has this promotion and update its status
            const promotionSnapshot = await getDocs(query(collection(firestore, 'users', uid, 'customerPromotions', customerDoc.id, 'promotions'), where('__name__', '==', promotionId)));
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
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
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
      background: 'transparent',
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
          alignItems: 'center',
          gap: '2rem',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← Back to Dashboard
          </button>
          
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '2rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Rewards System
            </h1>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              opacity: 0.8, 
              fontSize: '1rem',
              fontWeight: '400'
            }}>
              Campaign & Promotion Management
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        

        {/* Three-Tier System Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'white',
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(16, 185, 129, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 50px rgba(16, 185, 129, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(16, 185, 129, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
            }}>
              <span style={{ fontSize: '24px' }}>🟢</span>
            </div>
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: '#10b981'
            }}>
              Campaigns
            </h3>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              opacity: 0.8, 
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'rgba(255,255,255,0.9)'
            }}>
              Long-term marketing initiatives with various offer types
            </p>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {campaigns.length}
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'white',
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(59, 130, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 50px rgba(59, 130, 246, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(59, 130, 246, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
            }}>
              <span style={{ fontSize: '24px' }}>🔵</span>
            </div>
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: '#3b82f6'
            }}>
              Promotions
            </h3>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              opacity: 0.8, 
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'rgba(255,255,255,0.9)'
            }}>
              Time-limited special discount offers
            </p>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {promotions.length}
            </div>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'white',
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(245, 158, 11, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 50px rgba(245, 158, 11, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(245, 158, 11, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
            }}>
              <span style={{ fontSize: '24px' }}>🟡</span>
            </div>
            <h3 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: '#f59e0b'
            }}>
              Point Rewards
            </h3>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              opacity: 0.8, 
              fontSize: '1rem',
              lineHeight: '1.5',
              color: 'rgba(255,255,255,0.9)'
            }}>
              Existing loyalty system (unchanged)
            </p>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              Active <span style={{ fontSize: '1.2rem' }}>✅</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <button
            onClick={() => setActiveTab('campaigns')}
            style={{
              background: activeTab === 'campaigns' 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'campaigns' 
                ? '2px solid rgba(16, 185, 129, 0.4)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '1.5rem 2rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: activeTab === 'campaigns' ? '700' : '500',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: activeTab === 'campaigns' 
                ? '0 8px 32px rgba(16, 185, 129, 0.2)' 
                : '0 4px 20px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'campaigns') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'campaigns') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🟢</span>
            <span>Campaigns ({campaigns.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('promotions')}
            style={{
              background: activeTab === 'promotions' 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'promotions' 
                ? '2px solid rgba(59, 130, 246, 0.4)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '1.5rem 2rem',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: activeTab === 'promotions' ? '700' : '500',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: activeTab === 'promotions' 
                ? '0 8px 32px rgba(59, 130, 246, 0.2)' 
                : '0 4px 20px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'promotions') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'promotions') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔵</span>
            <span>Promotions ({promotions.length})</span>
          </button>
        </div>

        {/* Create Button */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
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
              background: loading 
                ? 'rgba(107, 114, 128, 0.3)' 
                : (activeTab === 'campaigns' 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)'),
              border: 'none',
              borderRadius: '16px',
              padding: '1.25rem 2.5rem',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading 
                ? 'none' 
                : (activeTab === 'campaigns' 
                  ? '0 8px 32px rgba(16, 185, 129, 0.3)' 
                  : '0 8px 32px rgba(59, 130, 246, 0.3)'),
              opacity: loading ? 0.6 : 1,
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = activeTab === 'campaigns' 
                  ? '0 12px 40px rgba(16, 185, 129, 0.4)' 
                  : '0 12px 40px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = activeTab === 'campaigns' 
                  ? '0 8px 32px rgba(16, 185, 129, 0.3)' 
                  : '0 8px 32px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>
              {loading ? '⏳' : '+'}
            </span>
            <span>
              {loading ? 'Processing...' : `Create New ${activeTab === 'campaigns' ? 'Campaign' : 'Promotion'}`}
            </span>
          </button>
        </div>

        {/* Content Area - Real Data Display */}
        {activeTab === 'campaigns' ? (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'white', margin: 0 }}>
                🟢 Campaigns ({campaigns.length})
              </h2>
            </div>
            {campaigns.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '4rem 2rem',
                textAlign: 'center',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📈</div>
                <h3 style={{ 
                  color: 'white', 
                  margin: '0 0 1rem 0', 
                  fontSize: '1.5rem',
                  fontWeight: '700'
                }}>
                  No Campaigns Yet
                </h3>
                <p style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  margin: 0,
                  fontSize: '1.1rem',
                  lineHeight: '1.6'
                }}>
                  Create your first automated campaign to reach customers with targeted promotions
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
                gap: '2rem'
              }}>
                  {campaigns.filter(campaign => campaign && campaign.id).map((campaign) => (
                    <div 
                      key={campaign.id} 
                      onClick={(e) => {
                        // Only navigate if not clicking a button
                        const target = e.target as HTMLElement;
                        if (target.tagName !== 'BUTTON' && !target.closest('button')) {
                          console.log('Campaign card clicked:', campaign.id);
                          console.log('propSetSelectedCampaignId:', propSetSelectedCampaignId);
                          console.log('setCurrentPage:', setCurrentPage);
                          
                          if (propSetSelectedCampaignId && campaign.id) {
                            try {
                              propSetSelectedCampaignId(campaign.id);
                              console.log('Set campaign ID:', campaign.id);
                            } catch (error) {
                              console.error('Error setting campaign ID:', error);
                            }
                          }
                          if (setCurrentPage) {
                            try {
                              setCurrentPage('campaignDetails');
                              console.log('Set page to campaignDetails');
                            } catch (error) {
                              console.error('Error setting page:', error);
                            }
                          }
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '2rem',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
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
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#10b981' }}>🤖 Automation:</strong> {
                            campaign.autoProcessing?.enabled 
                              ? `Every ${campaign.autoProcessing.intervalHours}h` 
                              : 'Manual only'
                          }
                          {campaign.autoProcessing?.enabled && (
                            <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              Next: {(() => {
                                if (campaign.lastProcessed) {
                                  const lastProcessed = campaign.lastProcessed.toDate ? campaign.lastProcessed.toDate() : new Date(campaign.lastProcessed);
                                  const intervalHours = campaign.autoProcessing?.intervalHours || 24;
                                  const nextRun = new Date(lastProcessed.getTime() + (intervalHours * 60 * 60 * 1000));
                                  return nextRun.toLocaleString();
                                } else {
                                  return 'Ready to run now';
                                }
                              })()}
                            </div>
                          )}
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

                      {/* ACTION BUTTONS - Two Row Layout */}
                      <div>
                        {/* First Row: Primary Actions */}
                      <div style={{
                        display: 'flex',
                          gap: '0.75rem',
                          marginBottom: '0.75rem'
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
                            onClick={() => processSingleCampaign(campaign)}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#16a34a',
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
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            🎯 Process Now
                          </button>
                        </div>

                        {/* Second Row: Settings & Delete */}
                        <div style={{
                          display: 'flex',
                          gap: '0.75rem'
                        }}>
                          <button
                            onClick={() => openAutomationEditor(campaign)}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#3b82f6',
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
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.4)';
                              }
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            🤖 Edit Automation
                          </button>
                          <button
                            onClick={() => handleCampaignDeleteClick(campaign)}
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
                    </div>
                  ))}
                </div>
              )}
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
                        {promotion.expiresAt && (
                          <div style={{
                            color: '#d1d5db',
                            fontSize: '1rem',
                            marginBottom: '0.5rem'
                          }}>
                            <strong style={{ color: '#f59e0b' }}>⏰ Expires:</strong> {new Date(promotion.expiresAt.toDate()).toLocaleDateString()}
                          </div>
                        )}
                        <div style={{
                          color: '#d1d5db',
                          fontSize: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <strong style={{ color: '#a78bfa' }}>Source:</strong> {promotion.source}
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

      {/* ✅ SUCCESS NOTIFICATION */}
      {successNotification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          zIndex: 3000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
              {successNotification.message}
            </div>
            <button
              onClick={() => setSuccessNotification({ show: false, message: '' })}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 🚀 MODERN PROMOTION CREATION MODAL */}
      {showCreatePromotion && (
        <div style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: 'none',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.8)',
            borderRadius: '24px',
            padding: '3rem',
            width: 'min(700px, 95vw)',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#1e293b',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '2.5rem',
              paddingBottom: '1.5rem',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  color: '#0f172a', 
                  fontSize: '2rem', 
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Create New Promotion
              </h2>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  color: '#64748b', 
                  fontSize: '1rem',
                  fontWeight: 400
                }}>
                  Set up instant promotions for your customers
                </p>
              </div>
              <button
                onClick={() => setShowCreatePromotion(false)}
                style={{
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  border: 'none',
                  color: '#64748b',
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9, #e2e8f0)';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Title *
              </label>
              <input
                type="text"
                value={promotionForm.title}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Summer Sale"
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Description
              </label>
              <textarea
                value={promotionForm.description}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., 10% off your next visit"
                rows={3}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Discount Type Selection */}
            <div style={{ 
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '16px',
              border: '2px solid #0ea5e9'
            }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '1rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#0c4a6e'
              }}>
                Discount Type *
              </label>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: promotionForm.discountType === 'dollar' ? '#dcfce7' : '#ffffff',
                  border: `2px solid ${promotionForm.discountType === 'dollar' ? '#10b981' : '#e5e7eb'}`,
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="dollar"
                    checked={promotionForm.discountType === 'dollar'}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, discountType: e.target.value as 'dollar' | 'percentage' }))}
                    style={{ marginRight: '0.75rem', transform: 'scale(1.3)' }}
                  />
                  <span style={{ color: '#047857', fontWeight: 600 }}>💰 Dollar Amount ($)</span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: promotionForm.discountType === 'percentage' ? '#fef3c7' : '#ffffff',
                  border: `2px solid ${promotionForm.discountType === 'percentage' ? '#f59e0b' : '#e5e7eb'}`,
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={promotionForm.discountType === 'percentage'}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, discountType: e.target.value as 'dollar' | 'percentage' }))}
                    style={{ marginRight: '0.75rem', transform: 'scale(1.3)' }}
                  />
                  <span style={{ color: '#92400e', fontWeight: 600 }}>📊 Percentage (%)</span>
                </label>
              </div>
              {/* Dynamic Preview Text */}
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#0c4a6e', 
                background: '#ffffff',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #0ea5e9'
              }}>
                {promotionForm.discountType === 'dollar' 
                  ? `💡 Example: Create $${promotionForm.discountAmount || 5} off $${promotionForm.minimumPurchase || 10} or more deal`
                  : `💡 Example: Create ${promotionForm.discountAmount || 40}% off $${promotionForm.minimumPurchase || 60} or more deal`
                }
              </div>
            </div>

            {/* Amount & Minimum Purchase */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#374151'
                }}>
                  {promotionForm.discountType === 'dollar' ? 'Amount ($) *' : 'Percentage (%) *'}
                </label>
                <input
                  type="number"
                  value={promotionForm.discountAmount}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                  placeholder={promotionForm.discountType === 'dollar' ? '10' : '40'}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#374151'
                }}>
                  Min Purchase ($)
                </label>
                <input
                  type="number"
                  value={promotionForm.minimumPurchase}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, minimumPurchase: Number(e.target.value) }))}
                  placeholder="25"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
            </div>

            {/* Valid for (Days) */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Valid for (Days)
              </label>
              <input
                type="number"
                value={promotionForm.validityDays}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, validityDays: Number(e.target.value) }))}
                placeholder="30"
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Expiration Settings */}
            <div style={{ 
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              borderRadius: '16px',
              border: '2px solid #f59e0b'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#92400e'
                }}>
                  <input
                    type="checkbox"
                    checked={promotionForm.hasExpiration}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, hasExpiration: e.target.checked }))}
                    style={{ marginRight: '0.75rem', transform: 'scale(1.3)' }}
                  />
                  <span>⏰ Set Expiration Date</span>
                </label>
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#92400e', 
                  marginTop: '0.5rem',
                  marginLeft: '2rem'
                }}>
                  Add countdown timer and automatic expiration to this promotion
                </div>
              </div>

              {promotionForm.hasExpiration && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '0.75rem', 
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: '#92400e'
                    }}>
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
                        padding: '1rem 1.25rem',
                        border: '2px solid #f59e0b',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#1f2937',
                        fontSize: '1rem',
                        fontWeight: 500,
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  {/* Preview Text */}
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: '#047857', 
                    background: '#dcfce7',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #10b981'
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

            {/* Target Outlets */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Target Outlets
              </label>
              <select
                multiple
                value={promotionForm.targetOutlets === 'ALL' ? ['ALL'] : promotionForm.targetOutlets}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  // If "ALL" is selected, set to 'ALL' string (meaning all outlets)
                  const targetOutlets = selected.includes('ALL') ? 'ALL' : selected;
                  setPromotionForm(prev => ({ ...prev, targetOutlets }));
                }}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  minHeight: '120px',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <option value="ALL">🏪 All Outlets</option>
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>
                    📍 {outlet.name || `Outlet ${outlet.id}`}
                  </option>
                ))}
              </select>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                Hold Ctrl/Cmd to select multiple outlets
              </p>
            </div>

            {/* SMS Message */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                SMS Message (Optional)
              </label>
              <textarea
                value={promotionForm.smsMessage}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, smsMessage: e.target.value }))}
                placeholder="Get 10% off your next visit! Valid for 30 days."
                rows={3}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Options */}
            <div style={{ 
              marginBottom: '3rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              borderRadius: '16px',
              border: '2px solid #10b981'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                marginBottom: '1rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#047857'
              }}>
                <input
                  type="checkbox"
                  checked={promotionForm.sendSMS}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, sendSMS: e.target.checked }))}
                  style={{ marginRight: '0.75rem', transform: 'scale(1.2)' }}
                />
                📱 Send SMS to customers
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#047857'
              }}>
                  <input
                    type="checkbox"
                    checked={!!promotionForm.assignNow}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, assignNow: e.target.checked }))}
                  style={{ marginRight: '0.75rem', transform: 'scale(1.2)' }}
                  />
                🎯 Assign to eligible customers now
                </label>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1.5rem', 
              justifyContent: 'center',
              paddingTop: '2rem',
              borderTop: '2px solid #e2e8f0'
            }}>
              <button
                onClick={() => setShowCreatePromotion(false)}
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={createPromotion}
                disabled={loading || !promotionForm.title || !promotionForm.discountAmount}
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  borderRadius: '16px',
                  background: (loading || !promotionForm.title || !promotionForm.discountAmount) 
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)' 
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  cursor: (loading || !promotionForm.title || !promotionForm.discountAmount) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  minWidth: '180px'
                }}
                onMouseOver={(e) => {
                  if (!loading && promotionForm.title && promotionForm.discountAmount) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && promotionForm.title && promotionForm.discountAmount) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.3)';
                  }
                }}
              >
                {loading ? '⏳ Creating...' : '🎉 Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODERN CAMPAIGN CREATION MODAL */}
      {showCreateCampaign && (
        <div style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            border: 'none',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.8)',
            borderRadius: '24px',
            padding: '3rem',
            width: 'min(700px, 95vw)',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#1e293b',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '2.5rem',
              paddingBottom: '1.5rem',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  color: '#0f172a', 
                  fontSize: '2rem', 
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Create New Campaign
              </h2>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  color: '#64748b', 
                  fontSize: '1rem',
                  fontWeight: 400
                }}>
                  Set up automated marketing campaigns for your customers
                </p>
              </div>
              <button
                onClick={() => setShowCreateCampaign(false)}
                style={{
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  border: 'none',
                  color: '#64748b',
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9, #e2e8f0)';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* Campaign Name */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., At Risk - 15 Days Inactive"
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Campaign Type */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Campaign Type *
              </label>
              <select
                value={campaignForm.type}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, type: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <option value="" style={{ color: '#9ca3af' }}>Select Type</option>
                <option value="inactive">🛌 Inactive Customers</option>
                <option value="birthday">🎂 Birthday Campaign</option>
                <option value="spending">💰 Low Spending Campaign</option>
              </select>
            </div>

            {/* Conditional trigger fields */}
            {campaignForm.type === 'inactive' && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                borderRadius: '16px',
                border: '2px solid #f59e0b'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#92400e'
                }}>
                  🛌 Days Since Last Visit
                </label>
                <input
                  type="number"
                  value={campaignForm.daysSinceLastVisit}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, daysSinceLastVisit: Number(e.target.value) }))}
                  placeholder="15"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#92400e' }}>
                  Target customers who haven't visited in this many days
                </p>
              </div>
            )}

            {campaignForm.type === 'birthday' && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                borderRadius: '16px',
                border: '2px solid #ec4899'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#be185d'
                }}>
                  🎂 Birthday Offset (days before/after)
                </label>
                <input
                  type="number"
                  value={campaignForm.birthdayOffset}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, birthdayOffset: Number(e.target.value) }))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #ec4899',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#be185d' }}>
                  Send campaign on exact birthday (0) or days before/after
                </p>
              </div>
            )}

            {campaignForm.type === 'spending' && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                borderRadius: '16px',
                border: '2px solid #10b981'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#047857'
                }}>
                  💰 Minimum Spending Threshold ($)
                </label>
                <input
                  type="number"
                  value={campaignForm.minimumSpending}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, minimumSpending: Number(e.target.value) }))}
                  placeholder="100"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#047857' }}>
                  Target customers who spend less than this amount
                </p>
              </div>
            )}

            {/* Promotion Title */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Promotion Title *
              </label>
              <input
                type="text"
                value={campaignForm.promotionTitle}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, promotionTitle: e.target.value }))}
                placeholder="$10 off - We miss you!"
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Discount Amount & Minimum Purchase */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#374151'
                }}>
                  Discount Amount ($) *
                </label>
                <input
                  type="number"
                  value={campaignForm.discountAmount}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                  placeholder="10"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  color: '#374151'
                }}>
                  Minimum Purchase ($)
                </label>
                <input
                  type="number"
                  value={campaignForm.minimumPurchase}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, minimumPurchase: Number(e.target.value) }))}
                  placeholder="25"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    background: '#ffffff',
                    color: '#1f2937',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
            </div>

            {/* SMS Message Template */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                SMS Message Template *
              </label>
              <textarea
                value={campaignForm.smsMessage}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, smsMessage: e.target.value }))}
                placeholder="We miss you! Get $10 off your next visit."
                rows={4}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>

            {/* Target Outlets */}
            <div style={{ marginBottom: '3rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.75rem', 
                fontWeight: 600,
                fontSize: '1.1rem',
                color: '#374151'
              }}>
                Target Outlets
              </label>
              <select
                multiple
                value={Array.isArray(campaignForm.targetOutlets) ? campaignForm.targetOutlets : ['ALL']}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  // If "ALL" is selected, set to 'ALL' string (meaning all outlets)
                  const targetOutlets = selected.includes('ALL') ? 'ALL' : selected;
                  setCampaignForm(prev => ({ ...prev, targetOutlets }));
                }}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#1f2937',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  outline: 'none',
                  minHeight: '140px',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1), 0 4px 12px rgba(0,0,0,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <option value="ALL">🏪 All Outlets</option>
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>
                    📍 {outlet.name || `Outlet ${outlet.id}`}
                  </option>
                ))}
              </select>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                Hold Ctrl/Cmd to select multiple outlets
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1.5rem', 
              justifyContent: 'center',
              paddingTop: '2rem',
              borderTop: '2px solid #e5e7eb'
            }}>
              <button
                onClick={() => setShowCreateCampaign(false)}
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  border: '2px solid #d1d5db',
                  borderRadius: '16px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                disabled={loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount}
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  borderRadius: '16px',
                  background: (loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount) 
                    ? 'linear-gradient(135deg, #9ca3af, #6b7280)' 
                    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  cursor: (loading || !campaignForm.name || !campaignForm.type || !campaignForm.discountAmount) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  minWidth: '180px'
                }}
                onMouseOver={(e) => {
                  if (!loading && campaignForm.name && campaignForm.type && campaignForm.discountAmount) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1e40af)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && campaignForm.name && campaignForm.type && campaignForm.discountAmount) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
                  }
                }}
              >
                {loading ? '⏳ Creating...' : '🚀 Create Campaign'}
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

        {/* 🤖 AUTOMATION EDITOR MODAL */}
        {showAutomationEditor && editingCampaign && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1f2937, #374151)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700 }}>
                  🤖 Edit Automation - {editingCampaign.name}
                </h2>
                <button
                  onClick={() => setShowAutomationEditor(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(148,163,184,0.25)',
                    color: '#cbd5e1',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Enable/Disable Toggle */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: 'white', 
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={automationSettings.enabled}
                    onChange={(e) => setAutomationSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    style={{ 
                      marginRight: '0.75rem',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  <strong>🤖 Enable Automatic Processing</strong>
                </label>
                <p style={{ color: '#9ca3af', margin: '0.5rem 0 0 2.25rem', fontSize: '0.9rem' }}>
                  Automatically search for valid customers and assign campaigns at regular intervals
                </p>
              </div>

              {/* Interval Selection */}
              {automationSettings.enabled && (
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                    ⏰ Processing Interval
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {[
                      { hours: 1, label: 'Every Hour', desc: 'High frequency' },
                      { hours: 4, label: 'Every 4 Hours', desc: 'Balanced' },
                      { hours: 12, label: 'Every 12 Hours', desc: 'Twice daily' },
                      { hours: 24, label: 'Every 24 Hours', desc: 'Daily' }
                    ].map(option => (
                      <button
                        key={option.hours}
                        onClick={() => setAutomationSettings(prev => ({ ...prev, intervalHours: option.hours }))}
                        style={{
                          padding: '1rem',
                          backgroundColor: automationSettings.intervalHours === option.hours ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          border: `2px solid ${automationSettings.intervalHours === option.hours ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{option.label}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div style={{ 
                backgroundColor: 'rgba(59,130,246,0.1)', 
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <h4 style={{ color: '#3b82f6', margin: '0 0 0.5rem 0' }}>📊 Current Status</h4>
                <div style={{ color: '#d1d5db', fontSize: '0.9rem' }}>
                  <div>🤖 Auto-processing: <strong>{automationSettings.enabled ? 'ENABLED' : 'DISABLED'}</strong></div>
                  {automationSettings.enabled && (
                    <>
                      <div>⏰ Interval: <strong>Every {automationSettings.intervalHours} hours</strong></div>
                      <div>🚀 Next run: <strong>
                        {new Date(Date.now() + (automationSettings.intervalHours * 60 * 60 * 1000)).toLocaleString()}
                      </strong></div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowAutomationEditor(false)}
                  disabled={loading}
                  style={{
                    padding: '0.875rem 2rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveAutomationSettings}
                  disabled={loading}
                  style={{
                    padding: '0.875rem 2rem',
                    backgroundColor: loading ? '#1d4ed8' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🗑️ CAMPAIGN DELETE CONFIRMATION MODAL */}
        {showCampaignDeleteConfirmation && campaignToDelete && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1f2937, #374151)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '500px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#dc2626', fontSize: '1.5rem', fontWeight: 700 }}>
                  🗑️ Delete Campaign
                </h2>
                <button
                  onClick={cancelCampaignDelete}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(148,163,184,0.25)',
                    color: '#cbd5e1',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Warning Message */}
              <div style={{
                backgroundColor: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>⚠️</span>
                  <h3 style={{ color: '#dc2626', margin: 0, fontSize: '1.2rem' }}>Warning: This action cannot be undone</h3>
                </div>
                
                <p style={{ color: '#d1d5db', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
                  This will permanently delete the campaign <strong style={{ color: '#60a5fa' }}>"{campaignToDelete.name}"</strong> and remove all customer promotions generated by it.
                </p>
                
                <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                  <div>📱 <strong>Mobile app impact:</strong> Customers will no longer see this campaign</div>
                  <div>🗑️ <strong>Data cleanup:</strong> All related promotions will be removed</div>
                  <div>🚫 <strong>Irreversible:</strong> This action cannot be undone</div>
                </div>
              </div>

              {/* Campaign Details */}
              <div style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '2rem'
              }}>
                <h4 style={{ color: '#3b82f6', margin: '0 0 0.5rem 0' }}>📊 Campaign Details</h4>
                <div style={{ color: '#d1d5db', fontSize: '0.9rem' }}>
                  <div><strong>Name:</strong> {campaignToDelete.name}</div>
                  <div><strong>Type:</strong> {campaignToDelete.triggerType === 'birthday' ? 'Birthday' : 'Inactive Customer'}</div>
                  <div><strong>Discount:</strong> ${campaignToDelete.discountAmount} {campaignToDelete.discountType === 'percentage' ? '%' : ''}</div>
                  <div><strong>Status:</strong> {campaignToDelete.isActive ? '🟢 Active' : '🔴 Inactive'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelCampaignDelete}
                  disabled={loading}
                  style={{
                    padding: '0.875rem 2rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCampaignDelete}
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
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? '⏳ Deleting...' : '🗑️ Delete Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager; 