import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase.service';
import { CreditCard, Search, ChevronRight, Copy } from 'lucide-react';
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

const filters = ['all','active','past_due','paused','canceled','none'] as const;

type FilterKey = typeof filters[number];

const BillingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = users;
    if (filter !== 'all') {
      arr = arr.filter(u => (u.subscriptionStatus ?? 'none') === filter);
    }
    if (q) {
      arr = arr.filter(u =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q) ||
        (u.stripeCustomerId || '').toLowerCase().includes(q)
      );
    }
    return arr.sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid));
  }, [users, query, filter]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h2 className="billing-title"><CreditCard size={22} /> Billing</h2>
          <div className="billing-subtitle">Manage users’ Stripe status and customer links</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="billing-toolbar">
        <div className="search-input">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or customer ID" />
        </div>
        <div className="filter-pills">
          {filters.map(f => (
            <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="billing-table">
        <div className="billing-table-head three-cols">
          <div>User</div>
          <div>Status</div>
          <div>Customer</div>
        </div>
        {loading ? (
          <div className="billing-loading">Loading...</div>
        ) : (
          filtered.map(u => (
            <div key={u.uid} className="billing-row three-cols" onClick={() => navigate(`/admin/billing/${u.uid}`)}>
              <div className="user-cell">
                <div className="avatar-circle">{(u.displayName || u.email || u.uid).slice(0,1).toUpperCase()}</div>
                <div className="user-ident">
                  <div className="name-text">{u.displayName || u.uid}</div>
                  <div className="email-text">{u.email || '—'}</div>
                </div>
              </div>
              <div>{statusBadge(u.subscriptionStatus)}</div>
              <div className="customer-cell" onClick={(e)=>e.stopPropagation()}>
                <code className="billing-cell-code">{u.stripeCustomerId || '—'}</code>
                {u.stripeCustomerId && (
                  <button className="icon-btn" title="Copy" onClick={() => copy(u.stripeCustomerId!)}><Copy size={14}/></button>
                )}
                <ChevronRight size={16} className="chevron" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BillingListPage;
