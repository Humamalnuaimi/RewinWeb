# Required Firebase Security Rules for Campaign System

## Current Issue
The error "Missing or insufficient permissions" occurs because the campaign creation tries to:
1. Query the `businesses` collection to find businesses owned by the current user
2. Read/write to various user collections

## Required Firestore Security Rules

Add these rules to your Firestore Security Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to read/write their own sub-collections
      match /{collection}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Allow authenticated users to read businesses collection
    // (needed to find business by ownerId)
    match /businesses/{businessId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || resource.data.ownerId == request.auth.uid);
    }
    
    // Allow business owners to read/write their business sub-collections
    match /businesses/{businessId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/businesses/$(businessId)).data.ownerId == request.auth.uid;
    }
  }
}
```

## What These Rules Allow

### 1. **User Collections** (`/users/{userId}/...`)
- ✅ Users can read/write their own promotions: `/users/{userId}/promotions/`
- ✅ Users can read/write their own campaigns: `/users/{userId}/campaigns/`
- ✅ Users can read/write their own customers: `/users/{userId}/customers/`
- ✅ Users can read/write customer promotions: `/users/{userId}/customerPromotions/`

### 2. **Businesses Collection** (`/businesses/...`)
- ✅ Any authenticated user can READ business documents (needed to find business by ownerId)
- ✅ Only business owners can WRITE to their business documents
- ✅ Business owners can read/write their business sub-collections

## Alternative: Simpler Rules (Less Secure)

If you want to quickly test, you can use these more permissive rules temporarily:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Warning**: The simpler rules allow any authenticated user to read/write any document. Use only for testing.

## How to Update Rules

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Replace the existing rules with the new rules above
5. Click "Publish"

## Testing the Fix

After updating the rules:
1. Refresh your web dashboard
2. Try creating a campaign again
3. The "Missing or insufficient permissions" error should be resolved

The campaign creation should now work because:
- ✅ It can query the `businesses` collection to find your business
- ✅ It can read/write to your user collections for campaigns and promotions
