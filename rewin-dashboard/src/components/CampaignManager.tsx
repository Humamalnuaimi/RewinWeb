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
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, Timestamp, query, where, limit } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { type User } from 'firebase/auth';

interface CampaignManagerProps {
  user: User;
  onBack: () => void;
}

interface Campaign {
  id?: string;
  title: string;
  description: string;
  campaignType: 'FREE_ITEM' | 'PERCENTAGE_OFF' | 'BUY_ONE_GET_ONE';
  value: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  businessId?: string; // 🔥 CRITICAL: Business ownership
  targetAudience: 'ALL' | 'NEW_CUSTOMERS' | 'RETURNING';
  targetOutlets: string[];
  targetOutletId: string; // 🎯 NEW: Single outlet targeting for mobile app
  targetOutletName: string; // 🎯 NEW: Outlet display name for mobile app
  createdAt?: any;
  type: 'CAMPAIGN';
}

interface Promotion {
  id?: string;
  title?: string; // Auto-generated
  description?: string; // Auto-generated
  discountAmount: number;
  minimumPurchase: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  businessId?: string; // 🔥 CRITICAL: Business ownership
  targetOutlets: string[];
  targetOutletId: string; // 🎯 NEW: Single outlet targeting for mobile app
  targetOutletName: string; // 🎯 NEW: Outlet display name for mobile app
  createdAt?: any;
  type: 'PROMOTION';
}

// 🔥 CRITICAL: Business Context Detection for Multi-Tenant Security
const getCurrentBusinessId = async (user: User): Promise<string> => {
  if (!user) throw new Error("User not authenticated");
  
  try {
    const businessesQuery = query(
      collection(firestore, 'businesses'),
      where('ownerId', '==', user.uid),
      where('isActive', '==', true),
      limit(1)
    );
    
    const businessSnapshot = await getDocs(businessesQuery);
    
    if (businessSnapshot.empty) {
      throw new Error("No business found for user");
    }
    
    return businessSnapshot.docs[0].id;
  } catch (error) {
    console.error('Error getting business ID:', error);
    throw new Error("Failed to get business context");
  }
};

const CampaignManager: React.FC<CampaignManagerProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'promotions'>('campaigns');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreatePromotion, setShowCreatePromotion] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItemData, setDeleteItemData] = useState<{id: string, type: 'campaign' | 'promotion', title: string} | null>(null);

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState<Campaign>({
    title: '',
    description: '',
    campaignType: 'FREE_ITEM',
    value: '',
    startDate: '',
    endDate: '',
    isActive: true,
    targetAudience: 'ALL',
    targetOutlets: [],
    targetOutletId: '',
    targetOutletName: '',
    type: 'CAMPAIGN'
  });

  // Promotion form state
  const [promotionForm, setPromotionForm] = useState<Promotion>({
    discountAmount: 0,
    minimumPurchase: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    targetOutlets: [],
    targetOutletId: '',
    targetOutletName: '',
    type: 'PROMOTION'
  });

  // Load data on component mount - CRITICAL: Get business context first
  useEffect(() => {
    const initializeBusinessContext = async () => {
      try {
        const currentBusinessId = await getCurrentBusinessId(user);
        setBusinessId(currentBusinessId);
        console.log('🔒 Business Context Loaded:', currentBusinessId);
      } catch (error) {
        console.error('❌ Failed to load business context:', error);
        
        // Auto-create business if none exists
        const shouldCreate = confirm(
          '🏢 No business found for your account.\n\n' +
          'Would you like me to create one automatically?\n\n' +
          '✅ Click OK to create your business\n' +
          '❌ Click Cancel to contact support'
        );
        
        if (shouldCreate) {
          await createBusinessForUser();
        } else {
          alert('Please contact support to set up your business account.');
        }
      }
    };

    initializeBusinessContext();
  }, [user]);

  // Auto-create business function
  const createBusinessForUser = async () => {
    try {
      const businessData = {
        ownerId: user.uid,
        name: `${user.email?.split('@')[0]}'s Business` || 'My Business',
        email: user.email,
        isActive: true,
        createdAt: Timestamp.now(),
        type: 'restaurant', // Default type
        settings: {
          currency: 'USD',
          timezone: 'America/New_York'
        }
      };

      const docRef = await addDoc(collection(firestore, 'businesses'), businessData);
      await updateDoc(docRef, { id: docRef.id });
      
      setBusinessId(docRef.id);
      console.log('✅ Business created:', docRef.id);
      alert('✅ Business account created successfully!\n\nYou can now create campaigns and promotions.');
      
    } catch (error) {
      console.error('❌ Failed to create business:', error);
      alert('❌ Failed to create business account. Please contact support.');
    }
  };

  // Load business-specific data when businessId is available
  useEffect(() => {
    if (businessId) {
      loadCampaigns();
      loadPromotions();
    }
  }, [businessId]);

  // Load outlets when user is available (outlets are stored under user path)
  useEffect(() => {
    if (user?.uid) {
      loadOutlets();
    }
  }, [user?.uid]);

  // Load campaigns from Firebase (business-specific collection) 🔒
  const loadCampaigns = () => {
    if (!businessId) return;
    
    const campaignsRef = collection(firestore, `businesses/${businessId}/campaigns`);
    return onSnapshot(campaignsRef, (snapshot) => {
      const campaignsList: Campaign[] = [];
      snapshot.forEach((doc) => {
        campaignsList.push({
          id: doc.id,
          ...doc.data()
        } as Campaign);
      });
      setCampaigns(campaignsList.sort((a, b) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      ));
      console.log('🟢 Loaded', campaignsList.length, 'campaigns for business:', businessId);
    });
  };

  // Load promotions from Firebase (business-specific collection) 🔒
  const loadPromotions = () => {
    if (!businessId) return;
    
    const promotionsRef = collection(firestore, `businesses/${businessId}/promotions`);
    return onSnapshot(promotionsRef, (snapshot) => {
      const promotionsList: Promotion[] = [];
      snapshot.forEach((doc) => {
        promotionsList.push({
          id: doc.id,
          ...doc.data()
        } as Promotion);
      });
      setPromotions(promotionsList.sort((a, b) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      ));
      console.log('🔵 Loaded', promotionsList.length, 'promotions for business:', businessId);
    });
  };

  // Load outlets for targeting (corrected path) 🔒
  const loadOutlets = async () => {
    if (!user?.uid) return;
    
    try {
      // ✅ FIXED: Use the correct path where outlets are actually stored
      const outletsRef = collection(firestore, `users/${user.uid}/outlets`);
      const snapshot = await getDocs(outletsRef);
      const outletsList: any[] = [];
      snapshot.forEach((doc) => {
        outletsList.push({
          id: doc.id,
          name: doc.data().name || doc.data().outletName || `Outlet ${doc.id}`,
          ...doc.data()
        });
      });
      setOutlets(outletsList);
      console.log('🏪 ✅ FIXED: Loaded', outletsList.length, 'outlets for user:', user.uid);
      console.log('🎯 Available outlets:', outletsList.map(o => `${o.id}: ${o.name}`));
    } catch (error) {
      console.error('Error loading outlets:', error);
      // 🚀 Fallback: Create default outlets if none exist
      console.log('🔧 Creating default outlets...');
      await createDefaultOutlets();
    }
  };

  // 🚀 Create default outlets if none exist
  const createDefaultOutlets = async () => {
    if (!user?.uid) return;
    
    const defaultOutlets = [
      { name: 'Main Location', id: 'main_location' },
      { name: 'Downtown Store', id: 'downtown_store' },
      { name: 'Mall Branch', id: 'mall_branch' },
      { name: 'Airport Branch', id: 'airport_branch' }
    ];

    try {
      for (const outlet of defaultOutlets) {
        await addDoc(collection(firestore, `users/${user.uid}/outlets`), {
          name: outlet.name,
          outletName: outlet.name,
          createdAt: Timestamp.now(),
          isActive: true
        });
      }
      console.log('✅ Created 4 default outlets');
      // Reload outlets after creation
      loadOutlets();
    } catch (error) {
      console.error('Error creating default outlets:', error);
    }
  };

  // Create campaign following exact mobile app specifications (business-specific) 🔒
  const createCampaign = async () => {
    if (!businessId) {
      alert('❌ Business context not loaded. Please refresh the page.');
      return;
    }

    // 🎯 NEW: Validate required outlet selection for mobile app
    if (!campaignForm.targetOutletId || !campaignForm.targetOutletName) {
      alert('❌ Please select a target outlet. This is required for the mobile app.');
      return;
    }

    setLoading(true);
    try {
      const campaignData = {
        title: campaignForm.title,
        description: campaignForm.description,
        campaignType: campaignForm.campaignType,
        value: campaignForm.value,
        startDate: Timestamp.fromDate(new Date(campaignForm.startDate)),
        endDate: Timestamp.fromDate(new Date(campaignForm.endDate)),
        isActive: true,
        businessId: businessId, // 🔥 CRITICAL: Business ownership
        targetAudience: campaignForm.targetAudience,
        targetOutlets: campaignForm.targetOutlets, // Keep for backward compatibility
        targetOutletId: campaignForm.targetOutletId, // 🎯 NEW: Single outlet targeting for mobile app
        targetOutletName: campaignForm.targetOutletName, // 🎯 NEW: Outlet display name for mobile app
        createdAt: Timestamp.now(),
        type: "CAMPAIGN"
      };

      // 🔥 Use business-specific collection
      const docRef = await addDoc(collection(firestore, `businesses/${businessId}/campaigns`), campaignData);
      
      // Update with the generated ID
      await updateDoc(docRef, { id: docRef.id });
      
      console.log("🟢 Campaign created with ID:", docRef.id, "for business:", businessId);
      
      // Reset form and close modal
      setCampaignForm({
        title: '',
        description: '',
        campaignType: 'FREE_ITEM',
        value: '',
        startDate: '',
        endDate: '',
        isActive: true,
        targetAudience: 'ALL',
        targetOutlets: [],
        targetOutletId: '',
        targetOutletName: '',
        type: 'CAMPAIGN'
      });
      setShowCreateCampaign(false);
      alert('✅ Campaign created successfully! It\'s now available in the mobile app.');
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('❌ Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create promotion following exact mobile app specifications (business-specific) 🔒
  const createPromotion = async () => {
    if (!businessId) {
      alert('❌ Business context not loaded. Please refresh the page.');
      return;
    }

    // 🎯 NEW: Validate required outlet selection for mobile app
    if (!promotionForm.targetOutletId || !promotionForm.targetOutletName) {
      alert('❌ Please select a target outlet. This is required for the mobile app.');
      return;
    }

    setLoading(true);
    try {
      const promotionData = {
        title: `${promotionForm.discountAmount}$ off Purchase of $${promotionForm.minimumPurchase} or more.`,
        description: `Get $${promotionForm.discountAmount} off when you spend $${promotionForm.minimumPurchase} or more`,
        discountAmount: parseInt(promotionForm.discountAmount.toString()),
        minimumPurchase: parseInt(promotionForm.minimumPurchase.toString()),
        startDate: Timestamp.fromDate(new Date(promotionForm.startDate)),
        endDate: Timestamp.fromDate(new Date(promotionForm.endDate)),
        isActive: true,
        businessId: businessId, // 🔥 CRITICAL: Business ownership
        targetOutlets: promotionForm.targetOutlets, // Keep for backward compatibility
        targetOutletId: promotionForm.targetOutletId, // 🎯 NEW: Single outlet targeting for mobile app
        targetOutletName: promotionForm.targetOutletName, // 🎯 NEW: Outlet display name for mobile app
        createdAt: Timestamp.now(),
        type: "PROMOTION"
      };

      // 🔥 Use business-specific collection
      const docRef = await addDoc(collection(firestore, `businesses/${businessId}/promotions`), promotionData);
      
      // Update with the generated ID
      await updateDoc(docRef, { id: docRef.id });
      
      console.log("🔵 Promotion created with ID:", docRef.id, "for business:", businessId);
      
      // Reset form and close modal
      setPromotionForm({
        discountAmount: 0,
        minimumPurchase: 0,
        startDate: '',
        endDate: '',
        isActive: true,
        targetOutlets: [],
        targetOutletId: '',
        targetOutletName: '',
        type: 'PROMOTION'
      });
      setShowCreatePromotion(false);
      alert('✅ Promotion created successfully! It\'s now available in the mobile app.');
      
    } catch (error) {
      console.error('Error creating promotion:', error);
      alert('❌ Failed to create promotion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle campaign/promotion active status (business-specific) 🔒
  const toggleStatus = async (id: string, isActive: boolean, type: 'campaign' | 'promotion') => {
    if (!businessId) {
      alert('❌ Business context not loaded. Please refresh the page.');
      return;
    }

    try {
      const collectionPath = type === 'campaign' 
        ? `businesses/${businessId}/campaigns` 
        : `businesses/${businessId}/promotions`;
      await updateDoc(doc(firestore, collectionPath, id), { isActive: !isActive });
      alert(`✅ ${type === 'campaign' ? 'Campaign' : 'Promotion'} ${!isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error(`Error toggling ${type} status:`, error);
      alert(`❌ Failed to update ${type} status.`);
    }
  };

  // Show delete confirmation modal (business-specific) 🔒
  const showDeleteConfirmation = (id: string, type: 'campaign' | 'promotion', title: string) => {
    if (!businessId) {
      alert('❌ Business context not loaded. Please refresh the page.');
      return;
    }
    setDeleteItemData({ id, type, title });
    setShowDeleteConfirm(true);
  };

  // Delete campaign/promotion (business-specific) 🔒
  const confirmDelete = async () => {
    if (!deleteItemData || !businessId) return;

    setLoading(true);
    try {
      const { id, type } = deleteItemData;
      const collectionPath = type === 'campaign' 
        ? `businesses/${businessId}/campaigns` 
        : `businesses/${businessId}/promotions`;
      await deleteDoc(doc(firestore, collectionPath, id));
      alert(`✅ ${type === 'campaign' ? 'Campaign' : 'Promotion'} deleted successfully!`);
      console.log(`🗑️ ${type} deleted:`, id);
      setShowDeleteConfirm(false);
      setDeleteItemData(null);
    } catch (error) {
      console.error(`Error deleting ${deleteItemData.type}:`, error);
      alert(`❌ Failed to delete ${deleteItemData.type}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Not set';
    try {
      return timestamp.toDate().toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const isExpired = (endDate: any) => {
    if (!endDate) return false;
    try {
      return endDate.toDate() < new Date();
    } catch {
      return false;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>
                🎯 Three-Tier Rewards System 🔒
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
                Secure Multi-Tenant • Campaigns, Promotions & Point Rewards
              </p>
              {businessId && (
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.8rem' }}>
                  Business ID: {businessId}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        
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

        {/* Create Button */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {!businessId ? (
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              display: 'inline-block'
            }}>
              🔒 Loading Business Context...
            </div>
          ) : (
            <button
              onClick={() => {
                if (activeTab === 'campaigns') {
                  setShowCreateCampaign(true);
                } else {
                  setShowCreatePromotion(true);
                }
              }}
              style={{
                padding: '1rem 2rem',
                backgroundColor: activeTab === 'campaigns' ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              + Create New {activeTab === 'campaigns' ? 'Campaign' : 'Promotion'}
            </button>
          )}
        </div>

        {/* Content Area */}
        {activeTab === 'campaigns' ? (
          <div>
            <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
              🟢 Campaigns ({campaigns.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {campaigns.map((campaign) => (
                <div key={campaign.id} style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '15px',
                  padding: '1.5rem',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.3rem 0.8rem',
                    backgroundColor: campaign.isActive ? '#10b981' : '#ef4444',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {campaign.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                  
                  {isExpired(campaign.endDate) && (
                    <div style={{
                      position: 'absolute',
                      top: '3rem',
                      right: '1rem',
                      padding: '0.3rem 0.8rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      EXPIRED
                    </div>
                  )}

                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#10b981',
                    borderRadius: '8px',
                    display: 'inline-block',
                    marginBottom: '1rem',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {campaign.campaignType}
                  </div>

                  <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                    {campaign.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                    {campaign.description}
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Value:</strong> {campaign.value}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Target:</strong> {campaign.targetAudience}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Period:</strong> {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem' }}>
                      <strong>Outlets:</strong> {campaign.targetOutlets.length === 0 ? 'All business outlets' : `${campaign.targetOutlets.length} selected`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleStatus(campaign.id!, campaign.isActive, 'campaign')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: campaign.isActive ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        flex: 1
                      }}
                    >
                      {campaign.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => campaign.id && showDeleteConfirmation(campaign.id, 'campaign', campaign.title || 'Untitled')}
                      disabled={!campaign.id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: campaign.id ? '#dc2626' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: campaign.id ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                        minWidth: '80px'
                      }}
                      title="Delete campaign permanently"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>
              🔵 Promotions ({promotions.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {promotions.map((promotion) => (
                <div key={promotion.id} style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '15px',
                  padding: '1.5rem',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.3rem 0.8rem',
                    backgroundColor: promotion.isActive ? '#3b82f6' : '#ef4444',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {promotion.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                  
                  {isExpired(promotion.endDate) && (
                    <div style={{
                      position: 'absolute',
                      top: '3rem',
                      right: '1rem',
                      padding: '0.3rem 0.8rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      EXPIRED
                    </div>
                  )}

                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: '#3b82f6',
                    borderRadius: '8px',
                    display: 'inline-block',
                    marginBottom: '1rem',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    PROMOTION
                  </div>

                  <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
                    {promotion.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                    {promotion.description}
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Discount:</strong> ${promotion.discountAmount}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Minimum Purchase:</strong> ${promotion.minimumPurchase}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <strong>Period:</strong> {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
                    </div>
                    <div style={{ color: 'white', fontSize: '0.9rem' }}>
                      <strong>Outlets:</strong> {promotion.targetOutlets.length === 0 ? 'All business outlets' : `${promotion.targetOutlets.length} selected`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleStatus(promotion.id!, promotion.isActive, 'promotion')}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: promotion.isActive ? '#ef4444' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        flex: 1
                      }}
                    >
                      {promotion.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => promotion.id && showDeleteConfirmation(promotion.id, 'promotion', promotion.title || 'Untitled')}
                      disabled={!promotion.id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: promotion.id ? '#dc2626' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: promotion.id ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                        minWidth: '80px'
                      }}
                      title="Delete promotion permanently"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #6b46c1 0%, #8b5cf6 50%, #a855f7 100%)',
            border: '1px solid #9333ea',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.3)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#f8fafc', fontSize: '1.5rem', fontWeight: '600' }}>🟢 Create New Campaign</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Title *
              </label>
              <input
                type="text"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Free Dessert with Main Course"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Description *
              </label>
              <textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Buy any main course and get a free dessert of your choice"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Campaign Type *
              </label>
              <select
                value={campaignForm.campaignType}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, campaignType: e.target.value as Campaign['campaignType'] }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              >
                <option value="FREE_ITEM">FREE_ITEM</option>
                <option value="PERCENTAGE_OFF">PERCENTAGE_OFF</option>
                <option value="BUY_ONE_GET_ONE">BUY_ONE_GET_ONE</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Value *
              </label>
              <input
                type="text"
                value={campaignForm.value}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Dessert (for FREE_ITEM) or 20 (for PERCENTAGE_OFF)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={campaignForm.startDate}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    color: '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={campaignForm.endDate}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    color: '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Target Audience
              </label>
              <select
                value={campaignForm.targetAudience}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, targetAudience: e.target.value as Campaign['targetAudience'] }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              >
                <option value="ALL">ALL</option>
                <option value="NEW_CUSTOMERS">NEW_CUSTOMERS</option>
                <option value="RETURNING">RETURNING</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Target Outlet * 🎯 (Required for Mobile App)
              </label>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#c4b5fd', 
                margin: '0 0 0.5rem 0',
                fontStyle: 'italic'
              }}>
                Select which outlet this campaign applies to
              </p>
              <select
                value={campaignForm.targetOutletId ? `${campaignForm.targetOutletId}|${campaignForm.targetOutletName}` : ''}
                onChange={(e) => {
                  const [outletId, outletName] = e.target.value.split('|');
                  setCampaignForm(prev => ({ 
                    ...prev, 
                    targetOutletId: outletId || '', 
                    targetOutletName: outletName || '' 
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
                required
              >
                <option value="">Select Target Outlet</option>
                {outlets.length > 0 ? (
                  outlets.map((outlet) => (
                    <option key={outlet.id} value={`${outlet.id}|${outlet.name || outlet.outletName || 'Unknown Outlet'}`}>
                      {outlet.name || outlet.outletName || 'Unknown Outlet'}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No outlets available</option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Target Outlets 🔒 (leave empty for all business outlets)
              </label>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#c4b5fd', 
                margin: '0 0 0.5rem 0',
                fontStyle: 'italic'
              }}>
                Only outlets from your business will be shown
              </p>
              <div style={{
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                padding: '0.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.8)'
              }}>
                {outlets.map((outlet) => (
                  <label key={outlet.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#f1f5f9'
                  }}>
                    <input
                      type="checkbox"
                      checked={campaignForm.targetOutlets.includes(outlet.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCampaignForm(prev => ({
                            ...prev,
                            targetOutlets: [...prev.targetOutlets, outlet.id]
                          }));
                        } else {
                          setCampaignForm(prev => ({
                            ...prev,
                            targetOutlets: prev.targetOutlets.filter(id => id !== outlet.id)
                          }));
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {outlet.name || outlet.outletName || `Outlet ${outlet.id}`}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowCreateCampaign(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'rgba(71, 85, 105, 0.8)',
                  color: '#f1f5f9',
                  border: '1px solid #64748b',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(100, 116, 139, 0.8)'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(71, 85, 105, 0.8)'}
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                disabled={loading || !campaignForm.title || !campaignForm.description || !campaignForm.value || !campaignForm.startDate || !campaignForm.endDate}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: loading ? 'rgba(55, 65, 81, 0.8)' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(34, 197, 94, 0.3)'
                }}
                onMouseOver={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#16a34a')}
                onMouseOut={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#22c55e')}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Promotion Modal */}
      {showCreatePromotion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #6b46c1 0%, #8b5cf6 50%, #a855f7 100%)',
            border: '1px solid #9333ea',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.3)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#f8fafc', fontSize: '1.5rem', fontWeight: '600' }}>🔵 Create New Promotion</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Discount Amount ($) *
              </label>
              <input
                type="number"
                min="1"
                value={promotionForm.discountAmount}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, discountAmount: parseInt(e.target.value) || 0 }))}
                placeholder="5"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Minimum Purchase ($) *
              </label>
              <input
                type="number"
                min="1"
                value={promotionForm.minimumPurchase}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, minimumPurchase: parseInt(e.target.value) || 0 }))}
                placeholder="10"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ 
              padding: '1rem',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#c4b5fd' }}>Auto-Generated Preview:</h4>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#f8fafc' }}>
                Title: {promotionForm.discountAmount > 0 && promotionForm.minimumPurchase > 0 
                  ? `${promotionForm.discountAmount}$ off Purchase of $${promotionForm.minimumPurchase} or more.`
                  : 'Enter amounts above to see preview'
                }
              </p>
              <p style={{ margin: 0, color: '#e2e8f0' }}>
                Description: {promotionForm.discountAmount > 0 && promotionForm.minimumPurchase > 0 
                  ? `Get $${promotionForm.discountAmount} off when you spend $${promotionForm.minimumPurchase} or more`
                  : 'Auto-generated description will appear here'
                }
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={promotionForm.startDate}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    color: '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={promotionForm.endDate}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #a855f7',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    color: '#f1f5f9',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Target Outlet * 🎯 (Required for Mobile App)
              </label>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#c4b5fd', 
                margin: '0 0 0.5rem 0',
                fontStyle: 'italic'
              }}>
                Select which outlet this promotion applies to
              </p>
              <select
                value={promotionForm.targetOutletId ? `${promotionForm.targetOutletId}|${promotionForm.targetOutletName}` : ''}
                onChange={(e) => {
                  const [outletId, outletName] = e.target.value.split('|');
                  setPromotionForm(prev => ({ 
                    ...prev, 
                    targetOutletId: outletId || '', 
                    targetOutletName: outletName || '' 
                  }));
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #a855f7',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  color: '#f1f5f9',
                  outline: 'none'
                }}
                required
              >
                <option value="">Select Target Outlet</option>
                {outlets.length > 0 ? (
                  outlets.map((outlet) => (
                    <option key={outlet.id} value={`${outlet.id}|${outlet.name || outlet.outletName || 'Unknown Outlet'}`}>
                      {outlet.name || outlet.outletName || 'Unknown Outlet'}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No outlets available</option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#f1f5f9' }}>
                Target Outlets 🔒 (leave empty for all business outlets)
              </label>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#c4b5fd', 
                margin: '0 0 0.5rem 0',
                fontStyle: 'italic'
              }}>
                Only outlets from your business will be shown
              </p>
              <div style={{
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid #a855f7',
                borderRadius: '8px',
                padding: '0.5rem',
                backgroundColor: 'rgba(30, 41, 59, 0.8)'
              }}>
                {outlets.map((outlet) => (
                  <label key={outlet.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: '#f1f5f9'
                  }}>
                    <input
                      type="checkbox"
                      checked={promotionForm.targetOutlets.includes(outlet.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPromotionForm(prev => ({
                            ...prev,
                            targetOutlets: [...prev.targetOutlets, outlet.id]
                          }));
                        } else {
                          setPromotionForm(prev => ({
                            ...prev,
                            targetOutlets: prev.targetOutlets.filter(id => id !== outlet.id)
                          }));
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {outlet.name || outlet.outletName || `Outlet ${outlet.id}`}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowCreatePromotion(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'rgba(71, 85, 105, 0.8)',
                  color: '#f1f5f9',
                  border: '1px solid #64748b',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(100, 116, 139, 0.8)'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(71, 85, 105, 0.8)'}
              >
                Cancel
              </button>
              <button
                onClick={createPromotion}
                disabled={loading || promotionForm.discountAmount <= 0 || promotionForm.minimumPurchase <= 0 || !promotionForm.startDate || !promotionForm.endDate}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: loading ? 'rgba(55, 65, 81, 0.8)' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(99, 102, 241, 0.3)'
                }}
                onMouseOver={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#4f46e5')}
                onMouseOut={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#6366f1')}
              >
                {loading ? 'Creating...' : 'Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteItemData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
            border: '1px solid #dc2626',
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
            
            <h2 style={{ 
              margin: '0 0 1rem 0', 
              color: '#f8fafc', 
              fontSize: '1.5rem', 
              fontWeight: '600' 
            }}>
              Delete {deleteItemData.type === 'campaign' ? 'Campaign' : 'Promotion'}?
            </h2>
            
            <p style={{ 
              margin: '0 0 1rem 0', 
              color: '#fef2f2', 
              fontSize: '1rem',
              lineHeight: '1.5'
            }}>
              Are you sure you want to permanently delete this {deleteItemData.type}?
            </p>
            
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(254, 242, 242, 0.1)',
              border: '1px solid rgba(254, 242, 242, 0.2)',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <p style={{ 
                margin: '0 0 0.5rem 0', 
                color: '#fef2f2', 
                fontWeight: '600' 
              }}>
                "{deleteItemData.title}"
              </p>
              <p style={{ 
                margin: 0, 
                color: '#fecaca', 
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                ⚠️ This action cannot be undone!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteItemData(null);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(71, 85, 105, 0.8)',
                  color: '#f1f5f9',
                  border: '1px solid #64748b',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(100, 116, 139, 0.8)'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(71, 85, 105, 0.8)'}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: loading ? 'rgba(55, 65, 81, 0.8)' : '#b91c1c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  boxShadow: loading ? 'none' : '0 4px 14px 0 rgba(185, 28, 28, 0.3)'
                }}
                onMouseOver={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#991b1b')}
                onMouseOut={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#b91c1c')}
              >
                {loading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager; 