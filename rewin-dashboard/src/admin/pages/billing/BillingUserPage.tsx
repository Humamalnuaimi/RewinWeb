import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { Copy } from 'lucide-react';
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
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

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

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const r = await api('/billing/plans', {});
        setPlans(r.plans || []);
      } catch {}
    };
    loadPlans();
  }, []);

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

  const assignPlan = async () => {
    if (!uid) return;
    const selectedPrice = interval === 'year' ? (priceYearlyId || '') : (priceMonthlyId || '');
    if (!selectedPrice && !priceMonthlyId && !priceYearlyId && !priceId) {
      alert('Select an existing plan or create one first');
      return;
    }
    const r = await api('/billing/set-plan', { uid, priceId: priceId || selectedPrice || null, priceMonthlyId: priceMonthlyId || null, priceYearlyId: priceYearlyId || null, billingInterval: interval });
    await setDoc(doc(db, 'users', uid!), { priceId: r.priceId, priceMonthlyId: r.priceMonthlyId, priceYearlyId: r.priceYearlyId, billingInterval: r.billingInterval }, { merge: true });
    setUser((p:any)=> ({ ...p, priceId: r.priceId, priceMonthlyId: r.priceMonthlyId, priceYearlyId: r.priceYearlyId, billingInterval: r.billingInterval }));
    setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
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
  const fmt = (cents?: number|null, curr: string = 'usd') => (typeof cents === 'number' ? `$${(cents/100).toFixed(2)} ${curr.toUpperCase()}` : '-');
  const planFromUser = plans.find(p => p.monthlyPriceId === user.priceMonthlyId || p.yearlyPriceId === user.priceYearlyId) || null;
  const monthlyAmt = planFromUser?.monthlyAmount || null;
  const yearlyAmt = planFromUser?.yearlyAmount || null;
  const currency = planFromUser?.currency || 'usd';

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h2 className="billing-title">Billing</h2>
          <div className="billing-subtitle">Manage plan assignment and prices</div>
        </div>
        <div className="user-right">
          <div className="user-left">
            <div className="avatar-circle avatar-sm">{(user.displayName || user.email || user.uid).slice(0,1).toUpperCase()}</div>
            <div>
              <div className="name-text name-sm">{user.displayName || user.uid}</div>
              <div className="email-text">{user.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* User summary */}
      <div className="user-summary">
        <div className="user-left">
          <div className="avatar-circle avatar-lg">
            {(user.displayName || user.email || user.uid).slice(0,1).toUpperCase()}
          </div>
          <div>
            <div className="name-text name-lg">{user.displayName || user.uid}</div>
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

      {/* Status overview card */}
      <div className="status-card mb-3">
        <div>
          <h3 className="status-title">Plan status</h3>
          <p className="status-desc">{(user.priceMonthlyId || user.priceYearlyId || user.priceId) ? 'Plan assigned to this account' : 'No plan assigned yet'}</p>
          <div className="info-row">
            <div className="info-chip"><span className="info-label">Interval</span><span className="info-value">{user.billingInterval || '-'}</span></div>
            <div className="info-chip price-chip"><span className="info-label">Monthly</span><span className="info-value price-value">{fmt(monthlyAmt, currency)}</span></div>
            <div className="info-chip price-chip"><span className="info-label">Yearly</span><span className="info-value price-value">{fmt(yearlyAmt, currency)}</span></div>
          </div>
        </div>
        <div className="status-bubble">
          <div className={`status-dot ${ (user.priceMonthlyId || user.priceYearlyId || user.priceId) ? 'green' : 'red' }`} />
        </div>
      </div>

      {/* Stacked panels */}
      <div className="panel-grid single">
        <div className="glass-panel panel-themed">
          <div className="panel-head">
            <h3 className="panel-title">Create plan</h3>
            <p className="panel-caption">Set simple monthly/yearly prices in USD</p>
          </div>
          <label className="field-label">Choose existing plan</label>
          <select
            className="glass-input select-glass select-caret-left"
            value={selectedPlanId}
            onChange={(e)=>{
              const id = e.target.value; setSelectedPlanId(id);
              const p = plans.find(pl=>pl.productId===id) || null; setSelectedPlan(p);
              setPriceMonthlyId(p?.monthlyPriceId || '');
              setPriceYearlyId(p?.yearlyPriceId || '');
            }}
          >
            <option value="">-- Select a plan --</option>
            {plans.map((p:any)=> (
              <option key={p.productId} value={p.productId}>{p.productName} • {fmt(p.monthlyAmount,p.currency)} / {fmt(p.yearlyAmount,p.currency)}</option>
            ))}
          </select>

          {selectedPlanId && (
            <div className="chosen-plan-preview">
              <div className="info-row">
                <div className="info-chip"><span className="info-label">Plan</span><span className="info-value">{selectedPlan?.productName || '-'}</span></div>
                <div className="info-chip price-chip"><span className="info-label">Monthly</span><span className="info-value price-value">{fmt(selectedPlan?.monthlyAmount, selectedPlan?.currency)}</span></div>
                <div className="info-chip price-chip"><span className="info-label">Yearly</span><span className="info-value price-value">{fmt(selectedPlan?.yearlyAmount, selectedPlan?.currency)}</span></div>
              </div>
            </div>
          )}

          {!selectedPlanId && (
            <>
              <label className="field-label mt-2">Plan name (optional)</label>
              <input className="glass-input" value={productName} onChange={e=>setProductName(e.target.value)} placeholder="e.g. Starter" />

              <label className="field-label">Monthly price ($)</label>
              <input className="glass-input" inputMode="decimal" value={monthlyUsd} onChange={e=>setMonthlyUsd(e.target.value)} placeholder="e.g. 19.99" />
              <label className="field-label mt-2">Yearly price ($)</label>
              <input className="glass-input" inputMode="decimal" value={yearlyUsd} onChange={e=>setYearlyUsd(e.target.value)} placeholder="e.g. 199" />
            </>
          )}
          {saved && <div className="muted-text mb-2">Saved</div>}
          <div className="field-actions">
            {!selectedPlanId && (
              <button className="btn btn-secondary" disabled={saving} onClick={savePlan}>{saving ? 'Saving…' : 'Create/Update Plan'}</button>
            )}
            <button className="btn btn-primary" onClick={assignPlan}>Assign Plan to User</button>
          </div>

          {(priceMonthlyId || priceYearlyId) && (
            <div className="muted-text mt-2">
              Created prices: {priceMonthlyId ? `M: ${priceMonthlyId}` : ''} {priceYearlyId ? `Y: ${priceYearlyId}` : ''}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default BillingUserPage;
