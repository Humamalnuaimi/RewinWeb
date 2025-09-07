import React, { useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import { firestore } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface PromotionDetailsPageProps {
  user: User;
  promotionId: string;
  onBack: () => void;
}

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

      // Fetch master promotion
      const promoSnap = await getDoc(doc(firestore, 'users', user.uid, 'promotions', promotionId));
      setPromotion(promoSnap.exists() ? { id: promoSnap.id, ...promoSnap.data() } : null);

      // Fetch customers (for names/phones)
      const customersSnap = await getDocs(collection(firestore, 'users', user.uid, 'customers'));
      const customersMap: Record<string, any> = {};
      customersSnap.docs.forEach(d => (customersMap[d.id] = d.data()));

      // Fetch flat assignments for this promotion
      const assignmentsQuery = query(
        collection(firestore, 'users', user.uid, 'customerPromotions'),
        where('masterPromotionId', '==', promotionId)
      );
      const assignmentsSnap = await getDocs(assignmentsQuery);

      let total = 0;
      let used = 0;
      let active = 0;
      const recent: any[] = [];

      assignmentsSnap.docs.forEach(d => {
        const a = d.data();
        total++;
        if (a.isUsed) used++;
        if (!a.isUsed && a.isActive) active++;
        if (recent.length < 10) {
          const c = customersMap[a.customerId] || {};
          recent.push({
            id: d.id,
            customerName: c.phoneNumber || c.phone || `${c.firstName || ''} ${c.lastName || ''}`.trim() || a.customerId,
            createdAt: a.createdAt,
            isActive: a.isActive && !a.isUsed,
            isUsed: a.isUsed,
            discountAmount: a.discountAmount,
            discountType: a.discountType
          });
        }
      });

      // Sort by creation date desc
      recent.sort((x, y) => {
        const ax = x.createdAt?.toDate?.() || new Date(x.createdAt || 0);
        const ay = y.createdAt?.toDate?.() || new Date(y.createdAt || 0);
        return ay.getTime() - ax.getTime();
      });

      setStats({ totalAssignments: total, activePromotions: active, usedPromotions: used, recentAssignments: recent.slice(0, 5) });
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
    <div style={{ padding: '2rem' }}>
      <button onClick={onBack} style={{
        background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: 8, marginBottom: '1rem'
      }}>← Back</button>

      <h1 style={{ color: 'white', margin: '0 0 1rem 0' }}>Promotion Details</h1>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.8)' }}>Loading...</div>
      ) : !promotion ? (
        <div style={{ color: 'rgba(255,255,255,0.8)' }}>Promotion not found</div>
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem'
          }}>
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 6 }}>Total Assigned</div>
              <div style={{ color: 'white', fontSize: '2rem', fontWeight: 900 }}>{stats.totalAssignments}</div>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 6 }}>Active</div>
              <div style={{ color: 'white', fontSize: '2rem', fontWeight: 900 }}>{stats.activePromotions}</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 6 }}>Used</div>
              <div style={{ color: 'white', fontSize: '2rem', fontWeight: 900 }}>{stats.usedPromotions}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ color: 'white', margin: '0 0 0.75rem 0' }}>{promotion.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>{promotion.description || '—'}</p>
            <div style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.75rem' }}>
              <span style={{ color: '#fbbf24' }}>Discount:</span> {promotion.discountType === 'percentage' ? `${promotion.discountAmount}%` : `$${promotion.discountAmount}`} •
              <span style={{ color: '#34d399', marginLeft: 8 }}>Min Purchase:</span> ${promotion.minimumPurchase}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.25rem' }}>
            <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>Recent Assignments</h3>
            {stats.recentAssignments.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.7)' }}>No assignments yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.recentAssignments.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.9)' }}>
                    <div>{item.customerName}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {item.isUsed ? 'Used' : (item.isActive ? 'Active' : 'Inactive')}
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
