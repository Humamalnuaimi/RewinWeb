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
      
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        
        // Check customer promotions for this campaign
        const promotionsSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions')
        );
        
        for (const promoDoc of promotionsSnapshot.docs) {
          const promo = promoDoc.data();
          const promoId = promoDoc.id;
          
          // Only collect promotions that belong to THIS specific campaign
          if (promo.campaignId === campaignId) {
            campaignPromotionIds.add(promoId);
            console.log('🎯 Found campaign promotion:', promoId, 'for campaign:', campaignId);
          }
        }
      }
      
      console.log('📋 Total promotions for this campaign:', campaignPromotionIds.size);
      
      // Now check promotion usage, but ONLY for promotions that belong to this campaign
      console.log('📊 Checking promotion usage collection...');
      const promotionUsageSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'promotionUsage'));
      
      for (const usageDoc of promotionUsageSnapshot.docs) {
        const usage = usageDoc.data();
        
        // ONLY count usage if the promotion ID belongs to THIS campaign
        if (campaignPromotionIds.has(usage.promotionId)) {
          console.log('💳 Found usage for THIS campaign:', usage.promotionId);
          usedPromotionIds.add(usage.promotionId);
          usedPromotions++;
        } else {
          console.log('⏭️ Skipping usage for different campaign/promotion:', usage.promotionId);
        }
      }
      
      console.log('🎯 Found', usedPromotions, 'used promotions from THIS campaign only');
      
      // Now build the final stats and recent assignments from the campaign promotions we found
      for (const customerDoc of customersSnapshot.docs) {
        const customerId = customerDoc.id;
        const customerData = customerDoc.data();
        
        // Check customer promotions for this campaign
        const promotionsSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions')
        );
        
        for (const promoDoc of promotionsSnapshot.docs) {
          const promo = promoDoc.data();
          const promoId = promoDoc.id;
          
          // ONLY process promotions that belong to THIS specific campaign
          if (promo.campaignId === campaignId) {
            totalAssignments++;
            
            // Check if this promotion was used (from promotionUsage collection)
            const wasUsed = usedPromotionIds.has(promoId);
            
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
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8',
        backgroundColor: '#0f172a',
        minHeight: '100vh'
      }}>
        Loading campaign details...
      </div>
    );
  }

  if (!campaignId) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#ef4444',
        backgroundColor: '#0f172a',
        minHeight: '100vh'
      }}>
        <h1>No campaign ID provided</h1>
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem',
            backgroundColor: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#ef4444',
        backgroundColor: '#0f172a',
        minHeight: '100vh'
      }}>
        <h1>Campaign not found</h1>
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem',
            backgroundColor: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f1f5f9'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← Back to Campaigns
        </button>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#f1f5f9',
          margin: 0,
          flex: 1
        }}>
          {String(campaign.name || 'Campaign Details')}
        </h1>
        <button
          onClick={() => getAssignmentStats(campaignId!)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          🔄 Refresh Stats
        </button>
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: campaign.isActive ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}>
          {campaign.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* Campaign Configuration */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#f1f5f9', marginBottom: '1.5rem' }}>Campaign Configuration</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Trigger Type</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              {String(campaign.triggerType || 'Unknown')}
            </p>
          </div>
          
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Discount</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              {campaign.discountType === 'dollar' ? '$' : ''}{String(campaign.discountAmount || 0)}{campaign.discountType === 'percentage' ? '%' : ''}
            </p>
          </div>
          
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Minimum Purchase</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              ${String(campaign.minimumPurchase || 0)}
            </p>
          </div>

          {campaign.triggerType?.includes('inactive') && (
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Inactive Days</p>
              <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
                {String(campaign.daysSinceLastVisit || 30)} days
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cloud Function Automation Status */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem',
        border: '2px solid #10b981'
      }}>
        <h2 style={{ color: '#f1f5f9', marginBottom: '1.5rem' }}>
          ☁️ Cloud Function Automation
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Automation Status</p>
            <p style={{ 
              color: campaign.autoProcessing?.enabled ? '#10b981' : '#ef4444', 
              fontSize: '1.125rem', 
              margin: '0.25rem 0',
              fontWeight: 'bold'
            }}>
              {campaign.autoProcessing?.enabled ? '✅ ENABLED' : '❌ DISABLED'}
            </p>
            {campaign.autoProcessing?.enabled && (
              <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Runs every {String(campaign.autoProcessing.intervalHours || 24)} hour(s)
              </p>
            )}
          </div>
          
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Last Processed</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              {formatDate(campaign.lastProcessed)}
            </p>
            {campaign.lastProcessedBy && (
              <p style={{ 
                color: String(campaign.lastProcessedBy).includes('cloud_function') ? '#10b981' : '#3b82f6',
                fontSize: '0.875rem',
                marginTop: '0.25rem'
              }}>
                {String(campaign.lastProcessedBy).includes('auto') ? '🤖 Automated' : 
                 String(campaign.lastProcessedBy).includes('cloud_function') ? '☁️ Cloud Function' : '👤 Manual'}
              </p>
            )}
          </div>
          
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Next Run Time</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              {getNextRunTime(campaign)}
            </p>
          </div>
          
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Last Result</p>
            <p style={{ color: '#f1f5f9', fontSize: '1.125rem', margin: '0.25rem 0' }}>
              {String(campaign.lastRunResult || 'No runs yet')}
            </p>
          </div>
        </div>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: campaign.autoProcessing?.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          borderLeft: `4px solid ${campaign.autoProcessing?.enabled ? '#10b981' : '#ef4444'}`
        }}>
          <p style={{ color: '#f1f5f9', margin: 0 }}>
            {campaign.autoProcessing?.enabled ? 
              '✅ This campaign runs automatically 24/7 via Cloud Functions. The system checks every hour and processes campaigns based on their individual intervals.' :
              '⚠️ Automation is disabled. This campaign only runs when manually triggered from the dashboard.'}
          </p>
        </div>
      </div>

      {/* Assignment Statistics */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#f1f5f9', marginBottom: '1.5rem' }}>
          📊 Assignment Statistics
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <p style={{ color: '#3b82f6', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              {String(assignmentStats.totalAssignments)}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Total Assignments
            </p>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <p style={{ color: '#10b981', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              {String(assignmentStats.activePromotions)}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Active Promotions
            </p>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}>
            <p style={{ color: '#a855f7', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              {String(assignmentStats.usedPromotions)}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Used Promotions
            </p>
          </div>
        </div>

        {/* Recent Assignments */}
        {assignmentStats.recentAssignments.length > 0 && (
          <div>
            <h3 style={{ color: '#f1f5f9', marginBottom: '1rem' }}>Recent Assignments</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {assignmentStats.recentAssignments.map((assignment: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <p style={{ color: '#f1f5f9', margin: 0, fontWeight: '500' }}>
                      {assignment.customerName}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                      {formatDate(assignment.createdAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      color: assignment.isUsed ? '#a855f7' : assignment.isActive ? '#10b981' : '#ef4444',
                      margin: 0,
                      fontWeight: 'bold'
                    }}>
                      {assignment.discountType === 'dollar' ? '$' : ''}{String(assignment.discountAmount)}{assignment.discountType === 'percentage' ? '%' : ''}
                    </p>
                    <p style={{ 
                      color: assignment.isUsed ? '#a855f7' : assignment.isActive ? '#10b981' : '#ef4444',
                      fontSize: '0.75rem',
                      margin: '0.25rem 0 0 0'
                    }}>
                      {assignment.isUsed ? 'USED' : assignment.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </p>
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