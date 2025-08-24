import React, { useState, useEffect, memo } from 'react';
import { firestore } from '../firebase/config';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { type User } from 'firebase/auth';

interface CampaignDetailsPageProps {
  user: User;
  onBack: () => void;
  campaignId?: string;
}

const CampaignDetailsPage: React.FC<CampaignDetailsPageProps> = ({ user, onBack, campaignId }) => {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentStats, setAssignmentStats] = useState<any>({
    totalAssignments: 0,
    activePromotions: 0,
    usedPromotions: 0,
    recentAssignments: []
  });
  
  console.log('🔍 CampaignDetailsPage rendered with campaignId:', campaignId);
  console.log('🔍 User:', user?.uid);
  console.log('🔍 Loading state:', loading);
  console.log('🔍 Campaign data:', campaign);

  // Calculate next run time
  const getNextRunTime = (campaign: any) => {
    try {
      if (!campaign?.autoProcessing?.enabled) return 'Automation disabled';
      
      const lastProcessed = campaign.lastProcessed?.toDate?.() || campaign.lastProcessed;
      const intervalHours = campaign.autoProcessing?.intervalHours || 24;
      
      if (!lastProcessed) {
        return 'Will run on next scheduled check (within 1 hour)';
      }
      
      const lastProcessedDate = lastProcessed instanceof Date ? lastProcessed : new Date(lastProcessed);
      const nextRun = new Date(lastProcessedDate.getTime() + intervalHours * 60 * 60 * 1000);
      const now = new Date();
      
      if (nextRun <= now) {
        return 'Ready to run now (waiting for next hourly check)';
      }
      
      const hoursUntil = Math.ceil((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60));
      const minutesUntil = Math.ceil((nextRun.getTime() - now.getTime()) / (1000 * 60));
      
      if (hoursUntil < 1) {
        return `Next run in ~${minutesUntil} minutes`;
      } else if (hoursUntil === 1) {
        return `Next run in ~1 hour`;
      } else {
        return `Next run in ~${hoursUntil} hours`;
      }
    } catch (error) {
      console.error('Error calculating next run time:', error);
      return 'Unable to calculate next run time';
    }
  };

  // Format date nicely
  const formatDate = (date: any) => {
    if (!date) return 'Never';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Invalid Date';
    }
  };

  // Get assignment statistics
  const getAssignmentStats = async (campaignId: string) => {
    try {
      console.log('🔍 Getting assignment stats for campaign:', campaignId);
      
      // Get all customer promotions for this campaign
      const customersSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'customers'));
      
      let totalAssignments = 0;
      let activePromotions = 0;
      let usedPromotions = 0;
      const recentAssignments: any[] = [];
      const usedPromotionIds = new Set();
      
      // First, collect all promotion IDs that belong to this specific campaign
      const campaignPromotionIds = new Set();
      
      // NEW FLAT STRUCTURE: Query promotions directly by campaignId (much more efficient!)
      const promotionsQuery = query(
        collection(firestore, 'users', user.uid, 'customerPromotions'),
        where('campaignId', '==', campaignId)
      );
      const promotionsSnapshot = await getDocs(promotionsQuery);
      
      for (const promoDoc of promotionsSnapshot.docs) {
        const promo = promoDoc.data();
        const promoId = promoDoc.id;
        
        campaignPromotionIds.add(promoId);
        console.log('🎯 Found campaign promotion:', promoId, 'for campaign:', campaignId);
      }
      
      console.log('📋 Total promotions for this campaign:', campaignPromotionIds.size);
      
      // Check promotion usage directly from isUsed field (app team updates this when promotion is redeemed)
      console.log('📊 Checking promotion usage from isUsed field...');
      
      for (const promoDoc of promotionsSnapshot.docs) {
        const promo = promoDoc.data();
        const promoId = promoDoc.id;
        
        if (promo.isUsed) {
          usedPromotionIds.add(promoId);
          usedPromotions++;
          console.log('✅ Found used promotion:', promoId, 'from campaign:', campaignId);
        }
      }
      
      console.log('🎯 Found', usedPromotions, 'used promotions from THIS campaign only');
      
      // Now build the final stats and recent assignments from the campaign promotions we already found
      // We already have all promotions for this campaign from the previous query, so let's reuse them
      for (const promoDoc of promotionsSnapshot.docs) {
        const promo = promoDoc.data();
        const promoId = promoDoc.id;
        const customerId = promo.customerId; // NEW: Get customerId from the promotion data
        
        // Get customer data for display purposes
        const customerDoc = customersSnapshot.docs.find(doc => doc.id === customerId);
        const customerData = customerDoc?.data() || {};
        
        totalAssignments++;
        
        // Check if this promotion was used (app team updates isUsed field when redeemed)
        const wasUsed = promo.isUsed;
        
        if (!wasUsed && promo.isActive) {
          activePromotions++;
        }
        
        // Add to recent assignments (last 10)
        if (recentAssignments.length < 10) {
          recentAssignments.push({
            customerName: customerData.firstName || customerData.name || customerId,
            createdAt: promo.createdAt,
            isActive: !wasUsed && promo.isActive,
            isUsed: wasUsed,
            discountAmount: promo.discountAmount,
            discountType: promo.discountType,
            promotionId: promoId
          });
        }
      }
      
      console.log('📈 Final stats:', { totalAssignments, activePromotions, usedPromotions });
      
      // Sort recent assignments by creation date
      recentAssignments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setAssignmentStats({
        totalAssignments,
        activePromotions,
        usedPromotions,
        recentAssignments: recentAssignments.slice(0, 5) // Show last 5
      });
      
    } catch (error) {
      console.error('Error getting assignment stats:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered with campaignId:', campaignId);
    
    if (!campaignId) {
      console.log('❌ No campaignId provided');
      setLoading(false);
      return;
    }

    console.log('📡 Setting up real-time listener for campaign:', campaignId);
    
    // Real-time listener for campaign data
    const campaignUnsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid, 'campaigns', campaignId),
      (doc) => {
        console.log('📄 Campaign document snapshot received');
        console.log('📄 Document exists:', doc.exists());
        
        if (doc.exists()) {
          const data = doc.data();
          console.log('📄 Campaign data:', data);
          setCampaign({ ...data, id: doc.id });
          
          // Get assignment stats when campaign data loads
          getAssignmentStats(campaignId);
        } else {
          console.log('❌ Campaign document does not exist');
          setCampaign(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching campaign:', error);
        setLoading(false);
      }
    );

    // Set up interval to refresh assignment stats every 10 seconds
    const statsInterval = setInterval(() => {
      if (campaignId) {
        getAssignmentStats(campaignId);
      }
    }, 10000); // Refresh every 10 seconds

    // Also refresh stats when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && campaignId) {
        getAssignmentStats(campaignId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      campaignUnsubscribe();
      clearInterval(statsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [campaignId, user.uid]);

  if (loading) {
    return (
      <div style={{
        padding: '4rem',
        textAlign: 'center',
        color: 'white',
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '3rem',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Loading Campaign Details</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1rem' }}>Please wait while we fetch the campaign information...</p>
        </div>
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div style={{
        padding: '4rem',
        textAlign: 'center',
        color: 'white',
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '3rem',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderTop: '4px solid #ef4444',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
          </div>
          <h1 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '600' }}>No Campaign ID Provided</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 2rem 0', fontSize: '1rem' }}>Unable to load campaign details without a valid campaign ID.</p>
          <button 
            onClick={onBack} 
            style={{ 
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{
        padding: '4rem',
        textAlign: 'center',
        color: 'white',
        background: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '3rem',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderTop: '4px solid #ef4444',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <span style={{ fontSize: '2rem' }}>❌</span>
          </div>
          <h1 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '600' }}>Campaign Not Found</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 2rem 0', fontSize: '1rem' }}>The requested campaign could not be found or may have been deleted.</p>
          <button 
            onClick={onBack} 
            style={{ 
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      background: 'transparent',
      color: 'white',
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '3rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.2)';
            (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.1)';
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          ← Back to Campaigns
        </button>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: 'white',
          margin: 0,
          flex: 1,
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          {String(campaign.name || 'Campaign Details')}
        </h1>
        <button
          onClick={() => getAssignmentStats(campaignId!)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
          }}
        >
          🔄 Refresh Stats
        </button>
        <span style={{
          padding: '0.5rem 1rem',
          background: campaign.isActive ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          boxShadow: campaign.isActive ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 4px 12px rgba(239, 68, 68, 0.4)',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          {campaign.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* Campaign Configuration */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderTop: '4px solid #8b5cf6',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(139, 92, 246, 0.3)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#8b5cf6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Campaign Configuration</h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Trigger Type</p>
            <p style={{ color: 'white', fontSize: '1.3rem', margin: 0, fontWeight: '600' }}>
              {String(campaign.triggerType || 'Unknown')}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Discount</p>
            <p style={{ color: '#10b981', fontSize: '1.8rem', margin: 0, fontWeight: '700' }}>
              {campaign.discountType === 'dollar' ? '$' : ''}{String(campaign.discountAmount || 0)}{campaign.discountType === 'percentage' ? '%' : ''}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Minimum Purchase</p>
            <p style={{ color: 'white', fontSize: '1.3rem', margin: 0, fontWeight: '600' }}>
              ${String(campaign.minimumPurchase || 0)}
            </p>
          </div>

          {campaign.triggerType?.includes('inactive') && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Inactive Days</p>
              <p style={{ color: 'white', fontSize: '1.3rem', margin: 0, fontWeight: '600' }}>
                {String(campaign.daysSinceLastVisit || 30)} days
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cloud Function Automation Status */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderTop: '4px solid #10b981',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(16, 185, 129, 0.3)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#10b981',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.5rem' }}>☁️</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
            Cloud Function Automation
          </h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Automation Status</p>
            <p style={{ 
              color: campaign.autoProcessing?.enabled ? '#10b981' : '#ef4444', 
              fontSize: '1.3rem', 
              margin: '0.5rem 0',
              fontWeight: '700'
            }}>
              {campaign.autoProcessing?.enabled ? '✅ ENABLED' : '❌ DISABLED'}
            </p>
            {campaign.autoProcessing?.enabled && (
              <p style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>
                Runs every {String(campaign.autoProcessing.intervalHours || 24)} hour(s)
              </p>
            )}
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Last Processed</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: '600' }}>
              {formatDate(campaign.lastProcessed)}
            </p>
            {campaign.lastProcessedBy && (
              <p style={{ 
                color: String(campaign.lastProcessedBy).includes('cloud_function') ? '#10b981' : '#3b82f6',
                fontSize: '0.9rem',
                marginTop: '0.5rem',
                fontWeight: '500'
              }}>
                {String(campaign.lastProcessedBy).includes('auto') ? '🤖 Automated' : 
                 String(campaign.lastProcessedBy).includes('cloud_function') ? '☁️ Cloud Function' : '👤 Manual'}
              </p>
            )}
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Next Run Time</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: '600' }}>
              {getNextRunTime(campaign)}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Last Result</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: '600' }}>
              {String(campaign.lastRunResult || 'No runs yet')}
            </p>
          </div>
        </div>
        
        <div style={{
          padding: '1.5rem',
          background: campaign.autoProcessing?.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '16px',
          border: `1px solid ${campaign.autoProcessing?.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderLeft: `4px solid ${campaign.autoProcessing?.enabled ? '#10b981' : '#ef4444'}`
        }}>
          <p style={{ color: 'white', margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>
            {campaign.autoProcessing?.enabled ? 
              '✅ This campaign runs automatically 24/7 via Cloud Functions. The system checks every hour and processes campaigns based on their individual intervals.' :
              '⚠️ Automation is disabled. This campaign only runs when manually triggered from the dashboard.'}
          </p>
        </div>
      </div>

      {/* Assignment Statistics */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderTop: '4px solid #f59e0b',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(245, 158, 11, 0.3)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget as HTMLElement;
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#f59e0b',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
            Assignment Statistics
          </h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '2.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #3b82f6',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', color: '#3b82f6', zIndex: 2 }}>
              <span style={{ fontSize: '1.5rem' }}>👥</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
              Total Assignments
            </h3>
            <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0, color: '#3b82f6' }}>
              {String(assignmentStats.totalAssignments)}
            </p>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
              All campaign assignments
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '2.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #10b981',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(16, 185, 129, 0.3)';
          }}
          onMouseLeave={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', color: '#10b981', zIndex: 2 }}>
              <span style={{ fontSize: '1.5rem' }}>⭐</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
              Active Promotions
            </h3>
            <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0, color: '#10b981' }}>
              {String(assignmentStats.activePromotions)}
            </p>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
              Ready to be used
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            padding: '2.5rem',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #a855f7',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
            textAlign: 'center'
          }}
          onMouseEnter={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 40px rgba(168, 85, 247, 0.3)';
          }}
          onMouseLeave={(e) => {
            const card = e.currentTarget as HTMLElement;
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 8px 40px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', color: '#a855f7', zIndex: 2 }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
              Used Promotions
            </h3>
            <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: 0, color: '#a855f7' }}>
              {String(assignmentStats.usedPromotions)}
            </p>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
              Successfully redeemed
            </div>
          </div>
        </div>

        {/* Recent Assignments */}
        {assignmentStats.recentAssignments.length > 0 && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.3rem', fontWeight: '600' }}>Recent Assignments</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {assignmentStats.recentAssignments.map((assignment: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  marginBottom: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}>
                  <div>
                    <p style={{ color: 'white', margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>
                      {assignment.customerName}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                      {formatDate(assignment.createdAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      color: assignment.isUsed ? '#a855f7' : assignment.isActive ? '#10b981' : '#ef4444',
                      margin: 0,
                      fontWeight: '700',
                      fontSize: '1.2rem'
                    }}>
                      {assignment.discountType === 'dollar' ? '$' : ''}{String(assignment.discountAmount)}{assignment.discountType === 'percentage' ? '%' : ''}
                    </p>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      background: assignment.isUsed ? 'rgba(168, 85, 247, 0.2)' : assignment.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: assignment.isUsed ? '#a855f7' : assignment.isActive ? '#10b981' : '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      border: `1px solid ${assignment.isUsed ? 'rgba(168, 85, 247, 0.3)' : assignment.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      marginTop: '0.5rem'
                    }}>
                      {assignment.isUsed ? 'USED' : assignment.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(CampaignDetailsPage);