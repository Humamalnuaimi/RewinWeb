import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';

export interface PromotionUsagePayload {
  customerId: string;
  promotionId: string;
  usedAt?: any;
  usedBy?: string;
  campaignId?: string | null;
  source?: string;
  discountType?: 'dollar' | 'percentage';
  discountAmount?: number;
}

export class PromotionUsageService {
  static async recordUsage(payload: PromotionUsagePayload) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const docRef = await addDoc(collection(firestore, 'users', user.uid, 'promotionUsage'), {
      customerId: payload.customerId,
      promotionId: payload.promotionId,
      usedAt: payload.usedAt ?? Timestamp.now(),
      usedBy: payload.usedBy ?? user.email,
      campaignId: payload.campaignId ?? null,
      source: payload.source ?? 'manual',
      discountType: payload.discountType ?? null,
      discountAmount: payload.discountAmount ?? null
    });
    return docRef.id;
  }
}


