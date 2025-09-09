import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { CreditCard } from 'lucide-react';
import '../../styles/billing.css';

interface BillingUser {
  uid: string;
  email?: string;
  displayName?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

const statusBadge = (status?: string) => {
  const key = status ?? 'none';
  const label =
    key === 'active' ? 'Active' :
    key === 'past_due' ? 'Past Due' :
    key === 'paused' ? 'Paused' :
    key === 'canceled' ? 'Canceled' : 'None';
  return <span className={`status-badge ${`is-${key}`}`}>{label}</span>;
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
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h2 className="billing-title"><CreditCard size={22} /> Billing</h2>
          <div className="billing-subtitle">Manage users’ Stripe status and customer links</div>
        </div>
      </div>

      <div className="billing-table">
        <div className="billing-table-head">
          <div>User</div>
          <div>Email</div>
          <div>Status</div>
          <div>Customer</div>
        </div>
        {loading ? (
          <div style={{ padding: '1.25rem' }}>Loading...</div>
        ) : (
          users.map(u => (
            <div key={u.uid} onClick={() => navigate(`/admin/billing/${u.uid}`)} className="billing-row">
              <div className="billing-cell-strong">{u.displayName || u.uid}</div>
              <div className="billing-cell-dim">{u.email || '-'}</div>
              <div>{statusBadge(u.subscriptionStatus)}</div>
              <div className="billing-cell-code">{u.stripeCustomerId || '-'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BillingListPage;
