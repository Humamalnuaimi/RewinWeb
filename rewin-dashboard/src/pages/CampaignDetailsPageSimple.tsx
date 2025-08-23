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
        padding: '2rem',
        textAlign: 'center',
        color: '#94a3b8',
        backgroundColor: '#0f172a',
        minHeight: '100vh'
      }}>
        Loading...
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
        <h1>No campaign ID</h1>
        <button onClick={onBack}>Back</button>
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
        <button onClick={onBack}>Back</button>
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
      <button onClick={onBack}>← Back</button>
      
      <h1>Campaign: {String(campaign.name || 'Unnamed')}</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Basic Info</h2>
        <p>ID: {String(campaignId)}</p>
        <p>Name: {String(campaign.name || 'N/A')}</p>
        <p>Type: {String(campaign.triggerType || 'N/A')}</p>
        <p>Active: {String(campaign.isActive ? 'Yes' : 'No')}</p>
        <p>Discount: {String(campaign.discountAmount || 0)} {String(campaign.discountType || '')}</p>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Automation</h2>
        <p>Enabled: {String(campaign.autoProcessing?.enabled ? 'Yes' : 'No')}</p>
        <p>Interval: {String(campaign.autoProcessing?.intervalHours || 24)} hours</p>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Debug Info</h2>
        <pre style={{ 
          backgroundColor: '#1e293b', 
          padding: '1rem', 
          borderRadius: '8px',
          fontSize: '0.8rem',
          overflow: 'auto'
        }}>
          {JSON.stringify(campaign, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default memo(CampaignDetailsPageSimple);
