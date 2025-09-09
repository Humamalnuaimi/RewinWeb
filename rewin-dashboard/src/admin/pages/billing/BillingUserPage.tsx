import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { ArrowLeft, Copy } from 'lucide-react';
import '../../styles/billing.css';

const api = async (path: string, body: any) => {
  let token: string | undefined;
  try {
    const { auth } = await import('../../services/firebase.service');
    // @ts-ignore
    token = await auth.currentUser?.getIdToken?.();
  } catch {}
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = res.statusText || `HTTP ${res.status}`;
    try {
      if (!res.bodyUsed) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          msg = typeof data === 'string' ? data : JSON.stringify(data);
        } else {
          msg = await res.text();
        }
      }
    } catch {}
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
};

const BillingUserPage: React.FC = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [priceId, setPriceId] = useState<string>('');
  const [priceMonthlyId, setPriceMonthlyId] = useState<string>('');
  const [priceYearlyId, setPriceYearlyId] = useState<string>('');
  const [interval, setInterval] = useState<'month'|'year'>('month');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [monthlyUsd, setMonthlyUsd] = useState<string>('');
  const [yearlyUsd, setYearlyUsd] = useState<string>('');
  const [productName, setProductName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!uid) return;
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const data = snap.data() as any || {};
      setUser({ uid, ...data });
      setPriceId(data?.priceId || '');
      setPriceMonthlyId(data?.priceMonthlyId || '');
      setPriceYearlyId(data?.priceYearlyId || '');
      setInterval(data?.billingInterval === 'year' ? 'year' : 'month');
      setLoading(false);
    };
    load();
  }, [uid]);

  // invoices removed in simplified page

  const ensureCustomer = async () => {
    const res = await api('/billing/create-customer', { uid, email: user?.email, name: user?.displayName });
    await setDoc(doc(db, 'users', uid!), { stripeCustomerId: res.customerId }, { merge: true });
    setUser((p: any) => ({ ...p, stripeCustomerId: res.customerId }));
  };

  const savePlan = async () => {
    if (!uid) return;
    const m = Number(monthlyUsd || 0);
    const y = Number(yearlyUsd || 0);
    if (!m && !y) {
      alert('Enter a monthly and/or yearly price');
      return;
    }
    setSaving(true);
    try {
      const r = await api('/billing/create-plan', { uid, name: productName || undefined, monthlyUsd: m, yearlyUsd: y });
      setPriceMonthlyId(r.priceMonthlyId || '');
      setPriceYearlyId(r.priceYearlyId || '');
      setPriceId(r.priceId || '');
      setUser((p: any) => ({ ...p, priceMonthlyId: r.priceMonthlyId || null, priceYearlyId: r.priceYearlyId || null, priceId: r.priceId || null, billingInterval: r.billingInterval }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e:any) {
      alert(e?.message || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const startCheckout = async () => {
    let selectedPrice = interval === 'year' ? (priceYearlyId || '') : (priceMonthlyId || '');
    if (!selectedPrice) {
      await savePlan();
      selectedPrice = interval === 'year' ? (priceYearlyId || '') : (priceMonthlyId || '');
    }
    if (!selectedPrice) {
      alert('Create the plan first');
      return;
    }
    const successUrl = window.location.origin + `/admin/billing/${uid}`;
    const cancelUrl = successUrl;
    const res = await api('/billing/checkout', { uid, priceId: selectedPrice, mode: 'subscription', successUrl, cancelUrl });
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

      {/* Basic plan creation */}
      <div className="billing-columns">
        <div className="left-col">
          <div className="glass-panel">
            <div className="panel-head">
              <h3 className="panel-title">Create plan</h3>
              <p className="panel-caption">Set simple monthly/yearly prices in USD</p>
            </div>
            <label className="field-label">Plan name (optional)</label>
            <input className="glass-input" value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. Starter" />

            <div className="interval-switch" role="group" aria-label="Billing Interval">
              <button className={`switch ${interval==='month'?'active':''}`} onClick={()=>setInterval('month')}>Monthly</button>
              <button className={`switch ${interval==='year'?'active':''}`} onClick={()=>setInterval('year')}>Yearly</button>
            </div>

            <label className="field-label">Monthly price ($)</label>
            <input className="glass-input" inputMode="decimal" value={monthlyUsd} onChange={e=>setMonthlyUsd(e.target.value)} placeholder="e.g. 19.99" />
            <label className="field-label" style={{ marginTop: 8 }}>Yearly price ($)</label>
            <input className="glass-input" inputMode="decimal" value={yearlyUsd} onChange={e=>setYearlyUsd(e.target.value)} placeholder="e.g. 199" />
            {saved && <div className="muted-text mb-2">Saved</div>}
            <div className="field-actions">
              <button className="btn btn-secondary" disabled={saving} onClick={savePlan}>{saving ? 'Saving…' : 'Create/Update Plan'}</button>
              <button className="btn btn-primary" onClick={startCheckout}>Start Checkout</button>
            </div>

            {(priceMonthlyId || priceYearlyId) && (
              <div className="muted-text" style={{ marginTop: 8 }}>
                Created prices: {priceMonthlyId ? `M: ${priceMonthlyId}` : ''} {priceYearlyId ? `Y: ${priceYearlyId}` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="right-col">
          <div className="glass-panel">
            <div className="panel-head">
              <h3 className="panel-title">Customer</h3>
              <p className="panel-caption">ID: <code>{user.stripeCustomerId || '-'}</code></p>
            </div>
            <div className="inline-actions">
              {!user.stripeCustomerId && (
                <button className="btn btn-secondary" onClick={ensureCustomer}>Create Customer</button>
              )}
              <button className="btn btn-secondary" onClick={openPortal}>Open Portal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingUserPage;
