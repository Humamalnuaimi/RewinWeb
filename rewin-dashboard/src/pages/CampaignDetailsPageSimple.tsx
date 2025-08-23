import React, { useState, useEffect, memo } from 'react';
import { firestore } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { type User } from 'firebase/auth';

interface CampaignDetailsPageProps {
  user: User;
  onBack: () => void;
  campaignId?: string;
}

const CampaignDetailsPageSimple: React.FC<CampaignDetailsPageProps> = ({ user, onBack, campaignId }) => {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  console.log('🔍 Simple page - campaignId:', campaignId);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid, 'campaigns', campaignId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('📄 Simple page - Campaign data:', data);
          setCampaign({ ...data, id: doc.id });
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Simple page error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
          <h3 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Loading Campaign</h3>
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
          <h1 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '600' }}>No Campaign ID</h1>
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
          >
            Back
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
          <h1 style={{ color: 'white', margin: '0 0 1rem 0', fontSize: '1.8rem', fontWeight: '600' }}>Campaign Not Found</h1>
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
          >
            Back
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
          ← Back
        </button>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: 'white',
          margin: 0,
          flex: 1,
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Campaign: {String(campaign.name || 'Unnamed')}
        </h1>
      </div>
      
      {/* Basic Info Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderTop: '4px solid #3b82f6',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#3b82f6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.5rem' }}>📋</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Basic Information</h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Campaign ID</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: '600', fontFamily: 'monospace' }}>
              {String(campaignId)}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Campaign Name</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
              {String(campaign.name || 'N/A')}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Trigger Type</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
              {String(campaign.triggerType || 'N/A')}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Status</p>
            <span style={{
              display: 'inline-block',
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
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Discount</p>
            <p style={{ color: '#10b981', fontSize: '1.5rem', margin: 0, fontWeight: '700' }}>
              {campaign.discountType === 'dollar' ? '$' : ''}{String(campaign.discountAmount || 0)}{campaign.discountType === 'percentage' ? '%' : ''}
            </p>
          </div>
        </div>
      </div>
      
      {/* Automation Card */}
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
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Automation Settings</h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
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
              margin: 0,
              fontWeight: '700'
            }}>
              {campaign.autoProcessing?.enabled ? '✅ ENABLED' : '❌ DISABLED'}
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>Run Interval</p>
            <p style={{ color: 'white', fontSize: '1.1rem', margin: 0, fontWeight: '600' }}>
              {String(campaign.autoProcessing?.intervalHours || 24)} hours
            </p>
          </div>
        </div>
      </div>
      
      {/* Debug Info Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2.5rem',
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
            <span style={{ fontSize: '1.5rem' }}>🔍</span>
          </div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Debug Information</h2>
        </div>
        
        <pre style={{ 
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '1.5rem', 
          borderRadius: '16px',
          fontSize: '0.85rem',
          overflow: 'auto',
          color: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          lineHeight: '1.5',
          maxHeight: '400px'
        }}>
          {JSON.stringify(campaign, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default memo(CampaignDetailsPageSimple);
