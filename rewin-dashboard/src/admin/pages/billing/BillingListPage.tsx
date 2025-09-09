import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { CreditCard, CheckCircle, XCircle, PauseCircle, Clock } from 'lucide-react';

interface BillingUser {
  uid: string;
  email?: string;
  displayName?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

const statusBadge = (status?: string) => {
  const common: React.CSSProperties = { padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 };
  switch (status) {
    case 'active': return <span style={{ ...common, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}>Active</span>;
    case 'past_due': return <span style={{ ...common, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>Past Due</span>;
    case 'paused': return <span style={{ ...common, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.35)' }}>Paused</span>;
    case 'canceled': return <span style={{ ...common, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }}>Canceled</span>;
    default: return <span style={{ ...common, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>None</span>;
  }
};

const BillingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BillingUser[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, 'users'));
        const rows: BillingUser[] = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
        setUsers(rows);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: '1.5rem', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CreditCard size={22} /> Billing
        </h2>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.75rem', padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 700 }}>
          <div>User</div>
          <div>Email</div>
          <div>Status</div>
          <div>Customer</div>
        </div>
        {loading ? (
          <div style={{ padding: '1.25rem' }}>Loading...</div>
        ) : (
          users.map(u => (
            <div key={u.uid} onClick={() => navigate(`/admin/billing/${u.uid}`)} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.75rem', padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
              <div style={{ fontWeight: 700 }}>{u.displayName || u.uid}</div>
              <div style={{ opacity: 0.85 }}>{u.email || '-'}</div>
              <div>{statusBadge(u.subscriptionStatus)}</div>
              <div style={{ fontFamily: 'monospace', opacity: 0.8 }}>{u.stripeCustomerId || '-'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BillingListPage;
