import React, { useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './PromotionDetailsPage.css';
import './UserBillingPage.css';

const fmtMoney = (amount: number | undefined, currency: string | undefined) => {
  if (amount == null) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(amount / 100); } catch { return `$${(amount/100).toFixed(2)}`; }
};

const api = async (path: string, body: any) => {
  const res = await fetch(`/api/billing${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
};
const apiNoThrow = async (path: string, body: any) => { try { return await api(path, body); } catch { return null; } };

const UserBillingPage: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [autoPay, setAutoPay] = useState<boolean>(true);
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUid(null); setUserDoc(null); setLoading(false); return; }
      setUid(u.uid);
      setLoading(true);
      try {
        const snap = await getDoc(doc(firestore, 'users', u.uid));
        const data = snap.exists() ? snap.data() : {};
        setUserDoc(data);
        setAutoPay(data.autoPay !== false); // default true
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      setInvoiceLoading(true);
      const res = await apiNoThrow('/invoices/list', { uid, limit: 10 });
      setInvoices(Array.isArray(res?.invoices) ? res.invoices : []);
      setInvoiceLoading(false);
    };
    load();
  }, [uid]);

  const planSummary = useMemo(() => {
    if (!userDoc) return null;
    return {
      status: userDoc.subscriptionStatus || 'none',
      interval: userDoc.billingInterval || '-',
      monthly: userDoc.monthlyAmount || null,
      yearly: userDoc.yearlyAmount || null,
      currency: userDoc.currency || 'usd',
    };
  }, [userDoc]);

  const openPortal = async () => {
    if (!uid) return;
    const returnUrl = window.location.origin + '/billing';
    const res = await apiNoThrow('/portal', { uid, returnUrl });
    if (res?.url) window.location.href = res.url;
  };

  const saveAutoPay = async () => {
    if (!uid) return;
    setSavingPref(true);
    try { await setDoc(doc(firestore, 'users', uid), { autoPay }, { merge: true }); }
    finally { setSavingPref(false); }
  };

  return (
    <div className="billing-page">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="billing-header">
          <div className="header-center">
            <h1 className="title">Billing</h1>
            <p className="sub">Manage your subscription and payments</p>
          </div>
        </div>

        {/* Plan */}
        <div className="billing-card plan">
          <h3 className="section-title">Plan</h3>
          <p className="info-meta">Your current subscription</p>
          {loading ? (
            <div className="loading-text">Loading…</div>
          ) : (
            <div className="kv-grid">
              <div className="kv-box">
                <p className="kv-label">Status</p>
                <p className="kv-value">{planSummary?.status}</p>
              </div>
              <div className="kv-box">
                <p className="kv-label">Interval</p>
                <p className="kv-value">{planSummary?.interval}</p>
              </div>
              <div className="kv-box">
                <p className="kv-label">Monthly</p>
                <p className="kv-value money">{fmtMoney(planSummary?.monthly || (null as any), planSummary?.currency)}</p>
              </div>
            </div>
          )}
          <div className="actions-right">
            <button className="btn btn-secondary" onClick={openPortal}>Manage payment methods</button>
          </div>
        </div>

        {/* Preferences */}
        <div className="billing-card prefs">
          <h3 className="section-title">Preferences</h3>
          <div className="pref-row">
            <div className="pref-meta">
              <div className="title">Auto pay</div>
              <div className="desc">Automatically pay invoices when due</div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={autoPay} onChange={(e)=> setAutoPay(e.target.checked)} />
              <button className="btn btn-primary" disabled={savingPref} onClick={saveAutoPay}>{savingPref ? 'Saving…' : 'Save'}</button>
            </label>
          </div>
        </div>

        {/* Invoices */}
        <div className="billing-card invoices">
          <h3 className="section-title">Invoices</h3>
          {invoiceLoading ? (
            <div className="loading-text">Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div className="loading-text">No invoices yet</div>
          ) : (
            <div className="invoice-list">
              {invoices.map((inv:any)=> (
                <div key={inv.id} className="invoice-row">
                  <div>#{inv.number || inv.id.slice(-8)}</div>
                  <div style={{ textTransform: 'capitalize' }}>{inv.status}</div>
                  <div>{fmtMoney(inv.total, inv.currency)}</div>
                  <div>{inv.created ? new Date(inv.created*1000).toLocaleDateString() : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserBillingPage;
