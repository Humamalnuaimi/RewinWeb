import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { CreditCard, ExternalLink, ArrowLeft, Copy } from 'lucide-react';
import '../../styles/billing.css';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const savePlan = async () => {
    setSaving(true);
    try {
      await api('/billing/set-plan', { uid, priceId });
      setUser((p: any) => ({ ...p, priceId }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      alert('Failed to save: ' + (e as any)?.message);
    } finally {
      setSaving(false);
    }
  };

  const startCheckout = async () => {
    if (!priceId) return alert('Set a Stripe priceId first');
    const successUrl = window.location.origin + `/admin/billing/${uid}`;
    const cancelUrl = successUrl;
    const res = await api('/billing/checkout', { uid, priceId, mode: 'subscription', successUrl, cancelUrl });
    try {
      (window.top || window).location.href = res.url;
    } catch {
      window.open(res.url, '_blank');
    }
  };

  const openPortal = async () => {
    const returnUrl = window.location.origin + `/admin/billing/${uid}`;
    const res = await api('/billing/portal', { uid, returnUrl });
    try {
      (window.top || window).location.href = res.url;
    } catch {
      window.open(res.url, '_blank');
    }
  };

  if (loading) return <div className="billing-page">Loading...</div>;
  if (!user) return <div className="billing-page">User not found</div>;

  const statusKey = user.subscriptionStatus ?? 'none';

  return (
    <div className="billing-page">
      <div className="back-row">
        <button className="btn btn-secondary" onClick={() => navigate('/admin/billing')}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* User summary */}
      <div className="user-summary">
        <div className="user-left">
          <div className="avatar-circle" style={{ width: 44, height: 44 }}>
            {(user.displayName || user.email || user.uid).slice(0,1).toUpperCase()}
          </div>
          <div>
            <div className="name-text" style={{ fontSize: '1.1rem' }}>{user.displayName || user.uid}</div>
            <div className="email-text">{user.email}</div>
          </div>
        </div>
        <div className="user-right">
          <span className={`status-badge ${`is-${statusKey}`}`}>{statusKey === 'past_due' ? 'Past Due' : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}</span>
          {user.stripeCustomerId && (
            <button className="icon-btn" title="Copy customer ID" onClick={() => navigator.clipboard.writeText(user.stripeCustomerId)}>
              <Copy size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="panel-grid">
        <div className="glass-panel">
          <h3 className="panel-title">Subscription</h3>
          <div className="muted-text mb-2">Status: <strong>{user.subscriptionStatus || 'none'}</strong></div>
          <div className="muted-text mb-3">Customer: <code>{user.stripeCustomerId || '-'}</code></div>
          <div className="inline-actions">
            {!user.stripeCustomerId && (
              <button className="btn btn-secondary" onClick={ensureCustomer}>Create Customer</button>
            )}
            <button className="btn btn-secondary" onClick={openPortal}>
              Manage in Portal <ExternalLink size={16} />
            </button>
          </div>
        </div>

        <div className="glass-panel">
          <h3 className="panel-title">Plan</h3>
          <label className="field-label">Stripe priceId</label>
          <input className="glass-input" value={priceId} onChange={e => setPriceId(e.target.value)} placeholder="price_..." />
          {priceId && !priceId.startsWith('price_') && (
            <div className="muted-text mb-2">Hint: Use a price_... ID, not prod_...</div>
          )}
          {saved && <div className="muted-text mb-2">Saved</div>}
          <div className="field-actions">
            <button className="btn btn-secondary" disabled={saving} onClick={savePlan}>{saving ? 'Saving…' : 'Save Plan'}</button>
            <button className="btn btn-primary" onClick={startCheckout}>Start Checkout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingUserPage;
