/**
 * 🔒 USER-ISOLATED CAMPAIGN MANAGER
 * 
 * NEW SECURE ARCHITECTURE:
 * - Uses user-specific collections: /users/{userId}/web_campaigns & /users/{userId}/web_promotions
 * - Prevents permission issues with Firebase
 * - Each user only accesses their own data
 * - Follows existing pattern like web_customers, web_transactions
 * 
 * OLD (PROBLEMATIC): /businesses/{businessId}/campaigns & /businesses/{businessId}/promotions - permission errors
 * NEW (WORKING): /users/{userId}/web_campaigns & /users/{userId}/web_promotions - no permissions needed
 */
import React, { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { firestore } from '../firebase/config';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { PromotionService } from '../services/PromotionService';
import { CampaignService } from '../services/CampaignService';

interface CampaignManagerProps {
  user: User;
  onBack: () => void;
}

// 🎯 DATA INTERFACES (App Team Compatible)
interface Promotion {
  id?: string;
  title: string;
  description: string;
  discountType: 'dollar' | 'percentage';
  discountAmount: number;
  minimumPurchase: number;
  targetOutlets: string[] | 'ALL';
  targetOutletId?: string;
  targetOutletName?: string;
  expiresAt?: any;
  createdAt: any;
  isActive: boolean;
  source: 'manual' | 'campaign_birthday' | 'campaign_inactive';
  createdBy: 'dashboard' | 'mobile';
  campaignId?: string;
}

interface PromotionForm {
  title: string;
  description: string;
  discountType: 'dollar' | 'percentage';
  discountAmount: number;
  minimumPurchase: number;
  expirationDays: number;
  hasExpiration: boolean;
  targetingMode: 'all_customers' | 'specific_outlets';
  targetOutlets: string[];
  smsMessage: string;
  sendSMS: boolean;
}

interface Campaign {
  id?: string;
  name: string;
  triggerType: 'birthday' | 'inactive';
  isActive: boolean;
  createdAt: any;
  businessId: string;
}

interface CampaignForm {
  name: string;
  triggerType: 'birthday' | 'inactive';
  inactiveDays: number;
  birthdayOffset: 0;
  minimumSpending: number;
  promotionTitle: string;
  smsMessage: string;
  targetOutlets: string[];
}

const CampaignManager: React.FC<CampaignManagerProps> = ({ user, onBack }) => {
  // State management
  const [currentTab, setCurrentTab] = useState<'promotions' | 'campaigns'>('promotions');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [promotionForm, setPromotionForm] = useState<PromotionForm>({
    title: '',
    description: '',
    discountType: 'percentage',
    discountAmount: 10,
    minimumPurchase: 0,
    expirationDays: 30,
    hasExpiration: true,
    targetingMode: 'all_customers',
    targetOutlets: [],
    smsMessage: '',
    sendSMS: true
  });

  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    triggerType: 'birthday',
    inactiveDays: 30,
    birthdayOffset: 0,
    minimumSpending: 100,
    promotionTitle: '',
    smsMessage: '',
    targetOutlets: []
  });

  // 📱 SMS SERVICE INTEGRATION
  const sendSMSMessage = async (phoneNumber: string, message: string) => {
    try {
      console.log(`📱 SMS to ${phoneNumber}: ${message}`);
      
      // Call admin panel SMS API
      const response = await fetch('http://localhost:5001/api/twilio/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          userId: user.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }

      const result = await response.json();
      console.log('✅ SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ SMS Error:', error);
      throw error;
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load promotions using new service
        const promotionsList = await PromotionService.getPromotions();
        setPromotions(promotionsList);

        // Load campaigns using new service
        const campaignsList = await CampaignService.getCampaigns();
        setCampaigns(campaignsList);

        // Load outlets (still from user's collection)
        const outletsRef = collection(firestore, 'users', user.uid, 'outlets');
        const outletsSnapshot = await getDocs(outletsRef);
        const outletsData = outletsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOutlets(outletsData);

        // Load customers (still from user's collection)
        const customersRef = collection(firestore, 'users', user.uid, 'web_customers');
        const customersSnapshot = await getDocs(customersRef);
        const customersData = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCustomers(customersData);

        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setLoading(false);
      }
    };

    if (user?.uid) {
      loadAllData();
    }
  }, [user.uid]);

  // Create new promotion
  const handleCreatePromotion = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!promotionForm.title.trim()) {
        setError('Promotion title is required');
        return;
      }
      
      if (!promotionForm.description.trim()) {
        setError('Promotion description is required');
        return;
      }
      
      if (!promotionForm.discountAmount || promotionForm.discountAmount <= 0) {
        setError('Discount amount must be greater than 0');
        return;
      }
      
      if (promotionForm.discountType === 'percentage' && promotionForm.discountAmount > 100) {
        setError('Percentage discount cannot exceed 100%');
        return;
      }
      
      if (promotionForm.minimumPurchase < 0) {
        setError('Minimum purchase cannot be negative');
        return;
      }
      
      // Validate targeting requirements based on simplified mobile app specification
      if (promotionForm.targetingMode === 'specific_outlets' && promotionForm.targetOutlets.length === 0) {
        setError('Please select at least one outlet for outlet-specific targeting');
        return;
      }
      
      // Prepare promotion data (Mobile App Targeting Specification Compliant)
      const promotionData: any = {
        title: promotionForm.title,
        description: promotionForm.description,
        discountType: promotionForm.discountType,
        discountAmount: promotionForm.discountAmount,
        minimumPurchase: promotionForm.minimumPurchase,
        isActive: true,
        createdAt: Timestamp.now(),
        source: "manual",
        createdBy: "dashboard"
      };

      // Apply Simplified Mobile App Targeting Specification:
      // ONLY TWO MODES SUPPORTED (customer-specific targeting REMOVED)
      if (promotionForm.targetingMode === 'all_customers') {
        // Scenario: "All Customers Everywhere"
        promotionData.targetAudience = "all";
        promotionData.targetOutlets = []; // Empty array = all customers everywhere
      } else if (promotionForm.targetingMode === 'specific_outlets') {
        // Scenario: "All Customers in Specific Outlets"
        promotionData.targetAudience = "all";
        promotionData.targetOutlets = promotionForm.targetOutlets; // Array of outlet IDs
      }
      
      // ❌ REMOVED: Customer-specific targeting no longer supported by mobile app

      // Add optional fields only if they have values
      if (promotionForm.targetOutlets.length === 1) {
        const targetOutletId = promotionForm.targetOutlets[0];
        const targetOutlet = outlets.find(o => o.id === targetOutletId);
        if (targetOutletId && targetOutlet?.name) {
          promotionData.targetOutletId = targetOutletId;
          promotionData.targetOutletName = targetOutlet.name;
        }
      }

      if (promotionForm.hasExpiration && promotionForm.expirationDays > 0) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + promotionForm.expirationDays);
        promotionData.expiresAt = Timestamp.fromDate(expirationDate);
      }

      // Create promotion using new service
      const promotionId = await PromotionService.createPromotion(promotionData);
      console.log('✅ Promotion created:', promotionId);

      // Send SMS if requested
      if (promotionForm.sendSMS && promotionForm.smsMessage && customers.length > 0) {
        console.log(`📱 Sending SMS to ${customers.length} customers...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const customer of customers) {
          try {
            if (customer.phoneNumber) {
              await sendSMSMessage(customer.phoneNumber, promotionForm.smsMessage);
              successCount++;
            }
          } catch (smsError) {
            console.error(`❌ SMS failed for ${customer.phoneNumber}:`, smsError);
            errorCount++;
          }
        }

        console.log(`✅ SMS Results: ${successCount} sent, ${errorCount} failed`);
      }

      // Reload promotions
      const updatedPromotions = await PromotionService.getPromotions();
      setPromotions(updatedPromotions);

      // Reset form
      setPromotionForm({
        title: '',
        description: '',
        discountType: 'percentage',
        discountAmount: 10,
        minimumPurchase: 0,
        expirationDays: 30,
        hasExpiration: true,
        targetingMode: 'all_customers',
        targetOutlets: [],
        smsMessage: '',
        sendSMS: true
      });

      alert('✅ Promotion created successfully!');

    } catch (error) {
      console.error('❌ Error creating promotion:', error);
      setError(error instanceof Error ? error.message : 'Failed to create promotion');
      alert('❌ Failed to create promotion: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Create new campaign
  const handleCreateCampaign = async () => {
    try {
      setError(null);

      const campaignData = {
        name: campaignForm.name,
        triggerType: campaignForm.triggerType,
        isActive: true,
        createdAt: Timestamp.now(),
        businessId: 'esZ8rT1v0d0qs0x97Dvo', // Default business ID
        // Additional campaign-specific data
        inactiveDays: campaignForm.inactiveDays,
        birthdayOffset: campaignForm.birthdayOffset,
        minimumSpending: campaignForm.minimumSpending,
        promotionTitle: campaignForm.promotionTitle,
        smsMessage: campaignForm.smsMessage,
        targetOutlets: campaignForm.targetOutlets
      };

      // Create campaign using new service
      const campaignId = await CampaignService.createCampaign(campaignData);
      console.log('✅ Campaign created:', campaignId);

      // Reload campaigns
      const updatedCampaigns = await CampaignService.getCampaigns();
      setCampaigns(updatedCampaigns);

      // Reset form
      setCampaignForm({
        name: '',
        triggerType: 'birthday',
        inactiveDays: 30,
        birthdayOffset: 0,
        minimumSpending: 100,
        promotionTitle: '',
        smsMessage: '',
        targetOutlets: []
      });

      alert('✅ Campaign created successfully!');

    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      setError(error instanceof Error ? error.message : 'Failed to create campaign');
      alert('❌ Failed to create campaign: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <h3>Loading Campaigns & Promotions...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'transparent',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={onBack}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            ← Back to Dashboard
          </button>
          <h1 style={{ color: 'white', margin: 0, fontSize: '2rem', fontWeight: '700' }}>
            📱 Campaign & Promotion Manager
          </h1>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentTab('promotions')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTab === 'promotions' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              backdropFilter: 'blur(10px)'
            }}
          >
            🎁 Promotions ({promotions.length})
          </button>
          <button
            onClick={() => setCurrentTab('campaigns')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTab === 'campaigns' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              backdropFilter: 'blur(10px)'
            }}
          >
            🚀 Campaigns ({campaigns.length})
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 2rem',
          padding: '1rem',
          backgroundColor: 'rgba(255, 0, 0, 0.2)',
          color: 'white',
          border: '1px solid rgba(255, 0, 0, 0.5)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          ❌ Error: {error}
        </div>
      )}

      {/* Content Area */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem'
      }}>
        {/* Promotions Tab */}
        {currentTab === 'promotions' && (
          <>
            {/* Create Promotion Form */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              color: 'white'
            }}>
              <h2 style={{ margin: '0 0 1rem 0', color: 'white' }}>🎁 Create New Promotion</h2>
              <p style={{ margin: '0 0 1.5rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                Fields marked with * are required. All fields must be properly filled before creating a promotion.
              </p>
              <div style={{ 
                margin: '0 0 1.5rem 0', 
                padding: '1rem', 
                backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.3)', 
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.85rem'
              }}>
                ✅ <strong>System Simplified:</strong> Customer-specific targeting removed to eliminate duplicate promotions. 
                Only outlet-based and business-wide targeting supported.
              </div>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Promotion Title *"
                  value={promotionForm.title}
                  onChange={(e) => setPromotionForm({...promotionForm, title: e.target.value})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: `1px solid ${!promotionForm.title.trim() ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.3)'}`,
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                
                <textarea
                  placeholder="Description *"
                  value={promotionForm.description}
                  onChange={(e) => setPromotionForm({...promotionForm, description: e.target.value})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: `1px solid ${!promotionForm.description.trim() ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.3)'}`,
                    borderRadius: '8px',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select
                    value={promotionForm.discountType}
                    onChange={(e) => setPromotionForm({...promotionForm, discountType: e.target.value as 'dollar' | 'percentage'})}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="percentage" style={{ color: '#333' }}>Percentage (%)</option>
                    <option value="dollar" style={{ color: '#333' }}>Dollar ($)</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Discount Amount *"
                    value={promotionForm.discountAmount}
                    onChange={(e) => setPromotionForm({...promotionForm, discountAmount: Number(e.target.value)})}
                    min="0.01"
                    step="0.01"
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: `1px solid ${!promotionForm.discountAmount || promotionForm.discountAmount <= 0 ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.3)'}`,
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <input
                  type="number"
                  placeholder="Minimum Purchase ($)"
                  value={promotionForm.minimumPurchase}
                  onChange={(e) => setPromotionForm({...promotionForm, minimumPurchase: Number(e.target.value)})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />

                {/* Mobile App Targeting Specification Compliant Selector */}
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                    🎯 Target Audience (Simplified System - No Customer Duplicates)
                  </label>
                  <select
                    value={promotionForm.targetingMode}
                    onChange={(e) => setPromotionForm({...promotionForm, targetingMode: e.target.value as 'all_customers' | 'specific_outlets'})}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      width: '100%'
                    }}
                  >
                    <option value="all_customers" style={{ color: '#333' }}>📱 All Customers Everywhere</option>
                    <option value="specific_outlets" style={{ color: '#333' }}>🏪 All Customers in Specific Outlets</option>
                  </select>
                </div>

                {/* Conditional Fields Based on Targeting Mode */}
                {promotionForm.targetingMode === 'specific_outlets' && (
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                      Select Target Outlets
                    </label>
                    <select
                      multiple
                      value={promotionForm.targetOutlets}
                      onChange={(e) => {
                        const selectedOutlets = Array.from(e.target.selectedOptions, option => option.value);
                        setPromotionForm({...promotionForm, targetOutlets: selectedOutlets});
                      }}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        width: '100%',
                        minHeight: '100px'
                      }}
                    >
                      {outlets.map(outlet => (
                        <option key={outlet.id} value={outlet.id} style={{ color: '#333' }}>
                          {outlet.name || outlet.id}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>
                      Hold Cmd/Ctrl to select multiple outlets
                    </div>
                  </div>
                )}



                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={promotionForm.hasExpiration}
                    onChange={(e) => setPromotionForm({...promotionForm, hasExpiration: e.target.checked})}
                  />
                  <label>Set Expiration Date</label>
                </div>

                {promotionForm.hasExpiration && (
                  <input
                    type="number"
                    placeholder="Expires After (Days)"
                    value={promotionForm.expirationDays}
                    onChange={(e) => setPromotionForm({...promotionForm, expirationDays: Number(e.target.value)})}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={promotionForm.sendSMS}
                    onChange={(e) => setPromotionForm({...promotionForm, sendSMS: e.target.checked})}
                  />
                  <label>Send SMS to customers</label>
                </div>

                {promotionForm.sendSMS && (
                  <textarea
                    placeholder="SMS Message (optional)"
                    value={promotionForm.smsMessage}
                    onChange={(e) => setPromotionForm({...promotionForm, smsMessage: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      minHeight: '60px'
                    }}
                  />
                )}

                <button
                  onClick={handleCreatePromotion}
                  disabled={!promotionForm.title || !promotionForm.description || !promotionForm.discountAmount || promotionForm.discountAmount <= 0}
                  style={{
                    padding: '1rem',
                    backgroundColor: (promotionForm.title && promotionForm.description && promotionForm.discountAmount > 0) ? '#4CAF50' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (promotionForm.title && promotionForm.description && promotionForm.discountAmount > 0) ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  🎁 Create Promotion
                </button>
              </div>
            </div>

            {/* Promotions List */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              color: 'white'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>📝 Active Promotions</h2>
              
              {promotions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                  <p>No promotions created yet.</p>
                  <p>Create your first promotion to get started!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {promotions.map((promotion) => (
                    <div
                      key={promotion.id}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{promotion.title}</h3>
                        <span style={{
                          backgroundColor: promotion.isActive ? '#4CAF50' : '#f44336',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {promotion.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.9)' }}>{promotion.description}</p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div><strong>Discount:</strong> {promotion.discountAmount}{promotion.discountType === 'percentage' ? '%' : '$'} off</div>
                        <div><strong>Min Purchase:</strong> ${promotion.minimumPurchase}</div>
                        <div><strong>Source:</strong> {promotion.source}</div>
                        {promotion.expiresAt && (
                          <div><strong>Expires:</strong> {new Date(promotion.expiresAt.toDate()).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Campaigns Tab */}
        {currentTab === 'campaigns' && (
          <>
            {/* Create Campaign Form */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              color: 'white'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>🚀 Create New Campaign</h2>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Campaign Name"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />

                <select
                  value={campaignForm.triggerType}
                  onChange={(e) => setCampaignForm({...campaignForm, triggerType: e.target.value as 'birthday' | 'inactive'})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="birthday" style={{ color: '#333' }}>Birthday Campaign</option>
                  <option value="inactive" style={{ color: '#333' }}>Inactive Customer Campaign</option>
                </select>

                {campaignForm.triggerType === 'inactive' && (
                  <input
                    type="number"
                    placeholder="Days of Inactivity"
                    value={campaignForm.inactiveDays}
                    onChange={(e) => setCampaignForm({...campaignForm, inactiveDays: Number(e.target.value)})}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                )}

                <input
                  type="text"
                  placeholder="Promotion Title"
                  value={campaignForm.promotionTitle}
                  onChange={(e) => setCampaignForm({...campaignForm, promotionTitle: e.target.value})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />

                <textarea
                  placeholder="SMS Message"
                  value={campaignForm.smsMessage}
                  onChange={(e) => setCampaignForm({...campaignForm, smsMessage: e.target.value})}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    minHeight: '80px'
                  }}
                />

                <button
                  onClick={handleCreateCampaign}
                  disabled={!campaignForm.name || !campaignForm.promotionTitle}
                  style={{
                    padding: '1rem',
                    backgroundColor: campaignForm.name && campaignForm.promotionTitle ? '#FF9800' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: campaignForm.name && campaignForm.promotionTitle ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  🚀 Create Campaign
                </button>
              </div>
            </div>

            {/* Campaigns List */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '2rem',
              color: 'white'
            }}>
              <h2 style={{ margin: '0 0 1.5rem 0', color: 'white' }}>🎯 Active Campaigns</h2>
              
              {campaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                  <p>No campaigns created yet.</p>
                  <p>Create your first campaign to automate customer engagement!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '1.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{campaign.name}</h3>
                        <span style={{
                          backgroundColor: campaign.isActive ? '#4CAF50' : '#f44336',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div><strong>Type:</strong> {campaign.triggerType === 'birthday' ? '🎂 Birthday' : '😴 Inactive'}</div>
                        <div><strong>Created:</strong> {new Date(campaign.createdAt.toDate()).toLocaleDateString()}</div>
                        <div><strong>Business ID:</strong> {campaign.businessId}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Statistics Footer */}
      <div style={{
        maxWidth: '1200px',
        margin: '2rem auto 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>{promotions.length}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>Total Promotions</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>{campaigns.length}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>Active Campaigns</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>{customers.length}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>Total Customers</div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>{outlets.length}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)' }}>Outlets</div>
        </div>
      </div>
    </div>
  );
};

export default CampaignManager;