import React, { useEffect, useMemo, useState } from 'react';
import { auth, firestore } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    <div style={{ minHeight: '100vh', padding: '24px', color: 'white' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(9,9,121,0.3), rgba(116,75,162,0.28))',
          border: '1px solid rgba(255,255,255,0.16)', borderRadius: 16, padding: '12px 16px', marginBottom: 16
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff, #c5a7ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Billing</h2>
            <div style={{ opacity: .9 }}>Manage your subscription and payments</div>
          </div>
        </div>

        {/* Plan */}
        <div style={{ background: 'linear-gradient(135deg, rgba(9,9,121,0.25), rgba(116,75,162,0.25))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, marginBottom: 16, position: 'relative' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Plan</h3>
            <div style={{ opacity: .85, marginTop: 6 }}>Your current subscription</div>
          </div>
          {loading ? (
            <div style={{ marginTop: 10, opacity: .85 }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', borderRadius: 12 }}>
                <div style={{ opacity: .85 }}>Status</div>
                <div style={{ fontWeight: 800 }}>{planSummary?.status}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', borderRadius: 12 }}>
                <div style={{ opacity: .85 }}>Interval</div>
                <div style={{ fontWeight: 800 }}>{planSummary?.interval}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px', borderRadius: 12 }}>
                <div style={{ opacity: .85 }}>Monthly</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{fmtMoney(planSummary?.monthly || null as any, planSummary?.currency)}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={openPortal}>Manage payment methods</button>
          </div>
        </div>

        {/* Preferences */}
        <div style={{ background: 'linear-gradient(135deg, rgba(9,9,121,0.25), rgba(116,75,162,0.25))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Preferences</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Auto pay</div>
              <div style={{ opacity: .85 }}>Automatically pay invoices when due</div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={autoPay} onChange={(e)=> setAutoPay(e.target.checked)} />
              <button className="btn btn-primary" disabled={savingPref} onClick={saveAutoPay}>{savingPref ? 'Saving…' : 'Save'}</button>
            </label>
          </div>
        </div>

        {/* Invoices */}
        <div style={{ background: 'linear-gradient(135deg, rgba(9,9,121,0.25), rgba(116,75,162,0.25))', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Invoices</h3>
          {invoiceLoading ? (
            <div style={{ marginTop: 10, opacity: .85 }}>Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div style={{ marginTop: 10, opacity: .85 }}>No invoices yet</div>
          ) : (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {invoices.map((inv:any)=> (
                <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
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
