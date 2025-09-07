# Fix Business Owner ID Issue

## The Problem
- Promotions exist at: `/users/q0yOEJHtibdN5UPJFGlwngwdtoS2/promotions/`
- Mobile app can't find them because the business document is missing the `ownerId` field

## Solution

### Step 1: Check Current Business Document

In Firebase Console:
1. Navigate to: `/businesses/`
2. Find document with ID: `esZRrfTvOdOgqsx9Dvo8` (or your business ID)
3. Check if it has an `ownerId` field

### Step 2: Add/Update the ownerId Field

If the `ownerId` field is missing or incorrect, update it:

1. Click on the business document
2. Add/Edit field:
   - Field name: `ownerId`
   - Type: `string`
   - Value: `q0yOEJHtibdN5UPJFGlwngwdtoS2`

### Step 3: Verify Business Document Structure

Your business document should look like this:
```json
{
  "name": "Your Business Name",
  "ownerId": "q0yOEJHtibdN5UPJFGlwngwdtoS2",  // CRITICAL FIELD
  "isActive": true,
  // ... other fields
}
```

### Step 4: Test in Mobile App

After adding the `ownerId` field:
1. Restart the mobile app
2. Check if promotions now appear
3. Look for these debug messages in app logs:
   - "✅ Found business owner UID from business doc: q0yOEJHtibdN5UPJFGlwngwdtoS2"
   - "Found X promotions"

## Alternative: Quick Console Fix

Run this in your browser console while on Firebase Console:
```javascript
// Get Firestore instance from Firebase Console
const db = firebase.firestore();

// Update the business document
await db.doc('businesses/esZRrfTvOdOgqsx9Dvo8').update({
  ownerId: 'q0yOEJHtibdN5UPJFGlwngwdtoS2'
});

console.log('✅ Business ownerId updated!');
```

## Why This Works

The mobile app flow:
1. Reads business document from `/businesses/{businessId}`
2. Gets `ownerId` from that document
3. Uses `ownerId` to read promotions from `/users/{ownerId}/promotions/`

Without the `ownerId` field, the app doesn't know to look under your user ID for promotions.

## Verification

After fixing, the mobile app should be able to:
1. Find your user ID from the business document
2. Read promotions from `/users/q0yOEJHtibdN5UPJFGlwngwdtoS2/promotions/`
3. Display active promotions to customers
