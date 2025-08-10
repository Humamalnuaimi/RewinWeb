import { collection, getDocs, setDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';

export interface CustomerPromotionPayload {
  title: string;
  description?: string;
  discountType: 'dollar' | 'percentage';
  discountAmount: number;
  minimumPurchase?: number;
  isActive?: boolean;
  isUsed?: boolean;
  createdAt?: any;
  expiresAt?: any | null;
  outletId?: string | null;
  campaignId?: string | null;
  source?: 'campaign_birthday' | 'campaign_inactive' | 'manual' | string;
  createdBy?: string;
  masterPromotionId?: string | null;
}

export class CustomerPromotionService {
  static getBasePath(uid: string, customerId: string) {
    return ['users', uid, 'customerPromotions', customerId, 'promotions'] as const;
  }

  static async upsert(customerId: string, promotionId: string, payload: CustomerPromotionPayload) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const normalized: CustomerPromotionPayload = {
      title: payload.title,
      description: payload.description || '',
      discountType: payload.discountType,
      discountAmount: payload.discountAmount,
      minimumPurchase: payload.minimumPurchase ?? 0,
      isActive: payload.isActive ?? true,
      isUsed: payload.isUsed ?? false,
      createdAt: payload.createdAt ?? Timestamp.now(),
      expiresAt: payload.expiresAt ?? null,
      outletId: payload.outletId ?? null,
      campaignId: payload.campaignId ?? null,
      source: payload.source || 'manual',
      createdBy: payload.createdBy || user.email || null,
      masterPromotionId: payload.masterPromotionId ?? null
    };

    await setDoc(
      doc(firestore, ...this.getBasePath(user.uid, customerId), promotionId),
      normalized,
      { merge: true }
    );
    return promotionId;
  }

  static async markUsed(customerId: string, promotionId: string, usedAt?: any) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    await updateDoc(
      doc(firestore, ...this.getBasePath(user.uid, customerId), promotionId),
      {
        isUsed: true,
        isActive: false,
        usedAt: usedAt ?? Timestamp.now()
      }
    );
  }

  static async listByCustomer(customerId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const snap = await getDocs(collection(firestore, ...this.getBasePath(user.uid, customerId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}


