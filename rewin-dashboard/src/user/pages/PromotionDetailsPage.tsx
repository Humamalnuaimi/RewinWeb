import React, { useEffect, useMemo, useState } from 'react';
import { type User } from 'firebase/auth';
import { firestore } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Gift, Activity, CheckCircle2, Calendar, Store, Tag, BadgeDollarSign, Wallet } from 'lucide-react';
import './PromotionDetailsPage.css';

interface PromotionDetailsPageProps {
  user: User;
  promotionId: string;
  onBack: () => void;
}

const formatDate = (date: any) => {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString();
};

const PromotionDetailsPage: React.FC<PromotionDetailsPageProps> = ({ user, promotionId, onBack }) => {
  const [promotion, setPromotion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    activePromotions: 0,
    usedPromotions: 0,
    recentAssignments: [] as any[]
  });

  const loadData = async () => {
    try {
      setLoading(true);

      // Master promotion
      const promoSnap = await getDoc(doc(firestore, 'users', user.uid, 'promotions', promotionId));
      const master = promoSnap.exists() ? { id: promoSnap.id, ...promoSnap.data() } : null;
      setPromotion(master);

      // Customers (for labels)
      const customersSnap = await getDocs(collection(firestore, 'users', user.uid, 'customers'));
      const customersMap: Record<string, any> = {};
      customersSnap.docs.forEach(d => (customersMap[d.id] = d.data()));

      // Assignments
      const assignmentsQuery = query(
        collection(firestore, 'users', user.uid, 'customerPromotions'),
        where('masterPromotionId', '==', promotionId)
      );
      const assignmentsSnap = await getDocs(assignmentsQuery);

      // Usage records (dedupe by customer) — support multiple shapes the mobile app may write
      const usageCol = collection(firestore, 'users', user.uid, 'promotionUsage');
      const byIdSnap = await getDocs(query(usageCol, where('promotionId', '==', promotionId)));

      // Also try by title/name in case the app only stored text
      const byTitleSnap = master?.title ? await getDocs(query(usageCol, where('title', '==', master.title))) : ({ docs: [] } as any);
      const byPromotionTitleSnap = master?.title ? await getDocs(query(usageCol, where('promotionTitle', '==', master.title))) : ({ docs: [] } as any);
      const byNameSnap = master?.title ? await getDocs(query(usageCol, where('name', '==', master.title))) : ({ docs: [] } as any);

      // Merge all usage docs (de-dup by doc id)
      const usageDocsMap = new Map<string, any>();
      [byIdSnap, byTitleSnap, byPromotionTitleSnap, byNameSnap].forEach((snap: any) => {
        snap.docs?.forEach((d: any) => usageDocsMap.set(d.id, d));
      });
      const usageDocs = Array.from(usageDocsMap.values());

      const usedCustomerIds = new Set<string>();
      const itemsMap = new Map<string, any>(); // key: customerId

      // From assignments
      assignmentsSnap.docs.forEach(d => {
        const a: any = d.data();
        const cid = a.customerId;
        const customer = customersMap[cid] || {};
        const entry = {
          id: d.id,
          customerId: cid,
          customerName: customer.phoneNumber || customer.phone || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || cid,
          createdAt: a.createdAt,
          isActive: a.isActive && !a.isUsed,
          isUsed: !!a.isUsed,
          discountAmount: a.discountAmount,
          discountType: a.discountType,
          usedAt: a.usedAt || null
        };
        if (entry.isUsed) usedCustomerIds.add(cid);
        itemsMap.set(cid, entry);
      });

      // From usage collection
      usageDocs.forEach((d: any) => {
        const u: any = d.data();
        const cid = u.customerId;
        if (!cid) return;
        usedCustomerIds.add(cid);
        const customer = customersMap[cid] || {};
        const existing = itemsMap.get(cid);
        const entry = {
          id: existing?.id || d.id,
          customerId: cid,
          customerName: customer.phoneNumber || customer.phone || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || cid,
          createdAt: existing?.createdAt || u.usedAt || Timestamp.now(),
          isActive: false,
          isUsed: true,
          discountAmount: existing?.discountAmount ?? master?.discountAmount,
          discountType: existing?.discountType ?? master?.discountType,
          usedAt: u.usedAt || Timestamp.now()
        };
        itemsMap.set(cid, entry);
      });

      // Compute stats
      let active = 0;
      itemsMap.forEach(v => { if (!v.isUsed && v.isActive) active++; });
      const used = usedCustomerIds.size;
      const total = active + used;

      // Recent list (by usedAt/createdAt desc)
      const recent = Array.from(itemsMap.values())
        .sort((a, b) => {
          const ta = (a.usedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0)).getTime();
          const tb = (b.usedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0)).getTime();
          return tb - ta;
        })
        .slice(0, 5);

      setStats({ totalAssignments: total, activePromotions: active, usedPromotions: used, recentAssignments: recent });
    } catch (e) {
      console.error('Error loading promotion details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promotionId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionId]);

  return (
    <div className="promo-details">
      <div className="header-card">
        <button className="back-btn" onClick={onBack}>← Back to Promotions</button>
        <div className="header-center">
          <h1 className="header-title">Promotion Details</h1>
          <p className="header-sub">{promotion?.title || '—'}</p>
        </div>
        {promotion && (
          <span className={`status-badge ${promotion.isActive ? 'active' : 'inactive'}`}>
            {promotion.isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading-text">Loading...</div>
      ) : !promotion ? (
        <div className="loading-text">Promotion not found</div>
      ) : (
        <div>
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon"><Gift size={20} /></div>
              <div className="stat-label">Total Assigned</div>
              <div className="stat-value">{stats.totalAssignments}</div>
            </div>
            <div className="stat-card stat-active">
              <div className="stat-icon"><Activity size={20} /></div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{stats.activePromotions}</div>
            </div>
            <div className="stat-card stat-used">
              <div className="stat-icon"><CheckCircle2 size={20} /></div>
              <div className="stat-label">Used</div>
              <div className="stat-value">{stats.usedPromotions}</div>
            </div>
          </div>

          <div className="glass-card info-card">
            <div className="info-header">
              <div className="info-title">{promotion.title}</div>
              <div className="chips">
                <span className="chip chip-gold"><BadgeDollarSign size={14} />{promotion.discountType === 'percentage' ? `${promotion.discountAmount}% OFF` : `$${promotion.discountAmount} OFF`}</span>
                <span className="chip chip-green"><Wallet size={14} />Min ${promotion.minimumPurchase}</span>
                {promotion.campaignId && <span className="chip chip-purple">Campaign</span>}
                {promotion.source && <span className="chip chip-blue">{String(promotion.source).toUpperCase()}</span>}
              </div>
            </div>

            <p className="info-desc">{promotion.description || '—'}</p>

            <div className="meta-grid">
              <div className="meta-item"><Tag size={16} /> Type: {String(promotion.discountType || '—')}</div>
              <div className="meta-item"><Store size={16} /> Outlets: {Array.isArray(promotion.targetOutlets) ? promotion.targetOutlets.length : (promotion.targetOutlets ? 1 : 0)}</div>
              <div className="meta-item"><Calendar size={16} /> Created: {formatDate(promotion.createdAt)}</div>
              <div className="meta-item"><Calendar size={16} /> Expires: {formatDate(promotion.expiresAt)}</div>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="section-title">Recent Assignments</h3>
            {stats.recentAssignments.length === 0 ? (
              <div className="muted">No assignments yet</div>
            ) : (
              <div className="assignments-list">
                {stats.recentAssignments.map((item: any) => (
                  <div key={`${item.customerId}-${item.id}`} className="assignment-row">
                    <div className="assignment-left">
                      <div className="assignment-name">{item.customerName}</div>
                      <div className="assignment-date">{formatDate(item.usedAt || item.createdAt)}</div>
                    </div>
                    <div className="assignment-right">
                      <div className={`pill ${item.isUsed ? 'pill-used' : item.isActive ? 'pill-active' : 'pill-inactive'}`} style={{minWidth: 86, textAlign: 'center'}}>
                        {item.isUsed ? 'USED' : item.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionDetailsPage;
