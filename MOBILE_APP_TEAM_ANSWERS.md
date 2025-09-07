# Answers for Mobile App Team - Web Dashboard Integration

## Current Implementation Status

### 1. **Business Document Setup**

**Current Status**: ⚠️ **Needs Verification**

Our current implementation:
```javascript
// In PromotionService.getBusinessIdForUser()
const businessQuery = query(
  collection(firestore, 'businesses'),
  where('ownerId', '==', uid),
  where('isActive', '==', true)
);
```

This means we're **expecting** the business document to have an `ownerId` field, but we need to verify it exists in the actual Firebase data.

### 2. **User Authentication**

**Answer**: The user's Firebase UID is available as `user.uid` when they're logged in. For example:
- When creating promotions: We use `auth.currentUser.uid`
- This is the same UID that should be in the business document's `ownerId` field

### 3. **Business Creation Flow**

**Current Status**: ❌ **Not Implemented**

We don't have a business creation flow in the web dashboard. The business document needs to be created manually or through another system with the correct structure:
```json
{
  "name": "Business Name",
  "ownerId": "user-uid-here",
  "isActive": true
}
```

### 4. **Promotion Path Verification**

**Answer**: ✅ **Correctly Implemented**

Yes, we store promotions at `/users/{userId}/promotions/` where `userId` is the logged-in user's UID:
```javascript
const promotionRef = await addDoc(
  collection(firestore, 'users', user.uid, 'promotions'), 
  payload
);
```

### 5. **Business ID Handling**

**Answer**: Our implementation uses this logic:
1. Check if user profile has `businessId` field
2. Query `/businesses/` collection for documents where `ownerId == user.uid`
3. Fallback to default: `'esZRrfTvOdOgqsx9Dvo8'`

The mobile app should use the same business ID that's returned by this logic.

### 6. **Multiple Business Support**

**Current Implementation**: We take the **first** active business found:
```javascript
if (!businessSnapshot.empty) {
  return businessSnapshot.docs[0].id; // Takes first business
}
```

For proper multi-business support, we'd need a business selector in the UI.

### 7. **Field Verification**

**Answer**: ✅ **All Required Fields Included**

Our promotions include:
```javascript
{
  // Required fields
  title: "Promotion Title",
  description: "Description",
  type: "PROMOTION",              ✅
  discountType: "percentage",     ✅
  discountAmount: 10,             ✅
  minimumPurchase: 50,            ✅
  isActive: true,                 ✅
  
  // Additional fields
  businessId: "auto-populated",
  targetOutlets: [],
  createdAt: Timestamp,
  expiresAt: Timestamp,
  // ... all other required fields
}
```

### 8. **Debug Information**

To help debug, here's what we need to check:

**A. Get Current User UID**:
```javascript
// Add this to any component to log the user UID
console.log("Current User UID:", auth.currentUser?.uid);
```

**B. Check Business Document**:
```javascript
// Run in browser console when logged in
const businessId = 'esZRrfTvOdOgqsx9Dvo8';
const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));
console.log("Business Document:", businessDoc.data());
console.log("Has ownerId?", businessDoc.data()?.ownerId);
```

**C. Sample Promotion Document**:
```javascript
{
  "title": "10% Off",
  "description": "Special discount",
  "type": "PROMOTION",
  "discountType": "percentage",
  "discountAmount": 10,
  "minimumPurchase": 50,
  "isActive": true,
  "businessId": "esZRrfTvOdOgqsx9Dvo8",
  "targetOutlets": [],
  "targetAudience": "all",
  "createdAt": { "_seconds": 1704988800, "_nanoseconds": 0 },
  "expiresAt": { "_seconds": 1707580800, "_nanoseconds": 0 },
  "createdBy": "owner@business.com",
  "source": "manual",
  "minVisitsRequired": 0,
  "maxDaysSinceLastVisit": 0,
  "minTotalSpent": 0
}
```

### 9. **Campaign-Created Promotions**

**Answer**: ✅ **Correctly Using User ID**

Yes, campaigns create promotions using the same user ID:
```javascript
const customerPromotionRef = doc(
  collection(firestore, 'users', user.uid, 'customerPromotions', customerId, 'promotions')
);
```

## Action Items Needed

### 1. **Verify Business Document** (Critical)

We need to check if the business document at `/businesses/esZRrfTvOdOgqsx9Dvo8` has the `ownerId` field. If not, we need to add it:

```javascript
// This needs to be added to the business document
{
  "ownerId": "6TPoTZkfRPfHGmfWEYhKcO1XqeF2" // The UID of the dashboard user
}
```

### 2. **Create Debug Function**

Add this function to help debug:
```javascript
async function debugPromotionSystem() {
  const user = auth.currentUser;
  console.log("=== PROMOTION SYSTEM DEBUG ===");
  console.log("1. Current User UID:", user?.uid);
  
  // Check business document
  const businessId = 'esZRrfTvOdOgqsx9Dvo8';
  const businessDoc = await getDoc(doc(firestore, 'businesses', businessId));
  const businessData = businessDoc.data();
  
  console.log("2. Business Document Exists:", businessDoc.exists());
  console.log("3. Business ownerId:", businessData?.ownerId);
  console.log("4. ownerId matches current user:", businessData?.ownerId === user?.uid);
  
  // Check promotions
  const promotionsSnapshot = await getDocs(
    collection(firestore, 'users', user.uid, 'promotions')
  );
  console.log("5. Promotions count:", promotionsSnapshot.size);
  
  if (promotionsSnapshot.size > 0) {
    console.log("6. Sample promotion:", promotionsSnapshot.docs[0].data());
  }
}
```

### 3. **Fix Business Document** (If Needed)

If the business document is missing the `ownerId` field, run this in the Firebase console:
```javascript
await updateDoc(doc(firestore, 'businesses', 'esZRrfTvOdOgqsx9Dvo8'), {
  ownerId: '6TPoTZkfRPfHGmfWEYhKcO1XqeF2' // Replace with actual user UID
});
```

## Summary

The most likely issue is that the business document at `/businesses/esZRrfTvOdOgqsx9Dvo8` is missing the `ownerId` field. Once this field is added with the correct user UID, the mobile app should be able to find and display promotions correctly.

The web dashboard is creating promotions in the correct location (`/users/{uid}/promotions/`), but the mobile app can't find them because it can't determine the business owner's UID from the business document.
