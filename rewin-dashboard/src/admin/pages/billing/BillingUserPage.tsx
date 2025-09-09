import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { CreditCard, ExternalLink, ArrowLeft } from 'lucide-react';

const api = async (path: string, body: any) => {
  const res = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const BillingUserPage: React.FC = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [priceId, setPriceId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!uid) return;
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      setUser({ uid, ...(snap.data() || {}) });
      setPriceId((snap.data() as any)?.priceId || '');
      setLoading(false);
    };
    load();
  }, [uid]);

  const ensureCustomer = async () => {
    const res = await api('/billing/create-customer', { uid, email: user?.email, name: user?.displayName });
    await setDoc(doc(db, 'users', uid!), { stripeCustomerId: res.customerId }, { merge: true });
    setUser((p: any) => ({ ...p, stripeCustomerId: res.customerId }));
  };

  const startCheckout = async () => {
    if (!priceId) return alert('Set a Stripe priceId first');
    const successUrl = window.location.origin + `/admin/billing/${uid}`;
    const cancelUrl = successUrl;
    const res = await api('/billing/checkout', { uid, priceId, mode: 'subscription', successUrl, cancelUrl });
    window.location.href = res.url;
  };

  const openPortal = async () => {
    const returnUrl = window.location.origin + `/admin/billing/${uid}`;
    const res = await api('/billing/portal', { uid, returnUrl });
    window.location.href = res.url;
  };

  if (loading) return <div style={{ padding: '1.5rem', color: 'white' }}>Loading...</div>;
  if (!user) return <div style={{ padding: '1.5rem', color: 'white' }}>User not found</div>;

  return (
    <div style={{ padding: '1.5rem', color: 'white' }}>
      <button onClick={() => navigate('/admin/billing')} style={{ marginBottom: '1rem', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'8px 12px', borderRadius:10, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
        <ArrowLeft size={16}/> Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
        <CreditCard size={22} />
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Billing • {user.displayName || user.uid}</h2>
      </div>

      <div style={{ display:'grid', gap:'1rem', gridTemplateColumns:'1fr 1fr' }}>
        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, padding:'1rem' }}>
          <h3 style={{ margin:'0 0 .75rem 0' }}>Subscription</h3>
          <div style={{ opacity:.9, marginBottom:'.5rem' }}>Status: <strong>{user.subscriptionStatus || 'none'}</strong></div>
          <div style={{ opacity:.9, marginBottom:'.75rem' }}>Customer: <code>{user.stripeCustomerId || '-'}</code></div>
          <div style={{ display:'flex', gap:8 }}>
            {!user.stripeCustomerId && (
              <button onClick={ensureCustomer} style={{ padding:'10px 14px', background:'rgba(59,130,246,.2)', border:'1px solid rgba(59,130,246,.35)', borderRadius:10, color:'white', cursor:'pointer' }}>Create Customer</button>
            )}
            <button onClick={openPortal} style={{ padding:'10px 14px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.2)', borderRadius:10, color:'white', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
              Manage in Portal <ExternalLink size={16}/>
            </button>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, padding:'1rem' }}>
          <h3 style={{ margin:'0 0 .75rem 0' }}>Plan</h3>
          <label style={{ display:'block', marginBottom:6, opacity:.9 }}>Stripe priceId</label>
          <input value={priceId} onChange={e=>setPriceId(e.target.value)} placeholder="price_..." style={{ width:'100%', height:40, padding:'0 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.22)', background:'rgba(255,255,255,0.08)', color:'#fff' }}/>
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            <button onClick={startCheckout} style={{ padding:'10px 14px', background:'linear-gradient(135deg,#667eea,#764ba2)', border:'none', borderRadius:10, color:'white', cursor:'pointer' }}>Start Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingUserPage;
