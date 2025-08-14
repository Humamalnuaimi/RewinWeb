import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { firestore, auth } from '../firebase/config';
import { CustomerPromotionService } from './CustomerPromotionService';
import { CampaignService } from './CampaignService';

export class AutomationService {
  // Run birthday automation for today (timezone-neutral, uses local date by default)
  static async runBirthday(options?: { timezoneOffsetMinutes?: number; ttlDays?: number; campaignId?: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const tzOffset = options?.timezoneOffsetMinutes ?? 0;
    const now = new Date(Date.now() + tzOffset * 60_000);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const customersRef = collection(firestore, 'users', user.uid, 'customers');
    const snap = await getDocs(customersRef);

    const ttlDays = options?.ttlDays ?? 14;
    const expires = new Date(now);
    expires.setDate(expires.getDate() + ttlDays);

    let created = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as any;
      const dob = c.dateOfBirth || c.birthday;
      if (!dob) continue;
      const d = dob.toDate ? dob.toDate() : new Date(dob);
      if (String(d.getMonth() + 1).padStart(2, '0') === mm && String(d.getDate()).padStart(2, '0') === dd) {
        const promoId = CampaignService.buildBirthdayPromotionId(docSnap.id, yyyy);
        await CustomerPromotionService.upsertBoth(docSnap.id, promoId, {
          title: 'Happy Birthday!',
          description: 'Enjoy your special day with a reward',
          discountType: 'percentage',
          discountAmount: 20,
          minimumPurchase: 0,
          expiresAt: Timestamp.fromDate(expires),
          isActive: true,
          createdAt: Timestamp.now(),
          source: 'campaign_birthday',
          campaignId: options?.campaignId || null
        });
        created++;
      }
    }
    return { created };
  }

  // Run inactivity automation for customers inactive for N days
  static async runInactive(options: { daysInactive: number; ttlDays?: number; campaignId?: string }) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    if (!options?.daysInactive || options.daysInactive < 1) throw new Error('daysInactive must be >= 1');

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - options.daysInactive);

    const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const customersRef = collection(firestore, 'users', user.uid, 'customers');
    const snap = await getDocs(customersRef);

    const ttlDays = options?.ttlDays ?? 10;
    const expires = new Date(now);
    expires.setDate(expires.getDate() + ttlDays);

    let created = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as any;
      const lv = c.lastVisit || c.lastVisitAt || c.lastCheckInAt;
      if (!lv) continue;
      const last = lv.toDate ? lv.toDate() : new Date(lv);
      if (last <= cutoff) {
        const promoId = CampaignService.buildInactivePromotionId(docSnap.id, yyyymmdd);
        await CustomerPromotionService.upsertBoth(docSnap.id, promoId, {
          title: 'We Miss You!',
          description: 'Come back and enjoy a special reward',
          discountType: 'dollar',
          discountAmount: 5,
          minimumPurchase: 10,
          expiresAt: Timestamp.fromDate(expires),
          isActive: true,
          createdAt: Timestamp.now(),
          source: 'campaign_inactive',
          campaignId: options?.campaignId || null
        });
        created++;
      }
    }
    return { created };
  }
}


