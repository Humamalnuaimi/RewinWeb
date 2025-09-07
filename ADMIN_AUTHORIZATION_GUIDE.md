# Admin Authorization Setup Guide

## Overview
The Admin Dashboard needs special authorization to access customer and outlet data that regular users cannot access. This guide explains how to set up proper authorization.

## Current Issue
The Admin Dashboard is getting `permission_denied` errors when trying to access Realtime Database data, while the main app can access it successfully. This is due to Firebase security rules.

## Solution Options

### Option 1: Firebase Security Rules (Recommended)

#### Step 1: Update Realtime Database Rules
Go to Firebase Console > Realtime Database > Rules and update the rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "customers": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "outlets": {
      ".read": "auth != null", 
      ".write": "auth != null"
    },
    "checkIns": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "transactions": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "points": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "admin": {
      ".read": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('adminEmails').child(auth.token.email.replace('.', ',')).exists())",
      ".write": "auth != null && (root.child('admins').child(auth.uid).exists() || root.child('adminEmails').child(auth.token.email.replace('.', ',')).exists())"
    }
  }
}
```

#### Step 2: Add Admin Users to Database
In Firebase Console > Realtime Database, add admin users:

```json
{
  "admins": {
    "jW94RyPlFBfGiw06RBpvikfy6zQ2": {
      "email": "alnuaimi.humam@gmail.com",
      "role": "admin",
      "createdAt": "2025-07-23T22:30:25.877Z"
    }
  },
  "adminEmails": {
    "alnuaimi.humam@gmail.com": {
      "uid": "jW94RyPlFBfGiw06RBpvikfy6zQ2",
      "role": "admin"
    },
    "admin@rewin.com": {
      "role": "admin"
    },
    "humamal@rewin.com": {
      "role": "admin"
    }
  }
}
```

### Option 2: Firestore Admin Collection

#### Step 1: Create Admin Collection
In Firestore, create a collection called `admins`:

```javascript
// Add this to your Firebase setup
const adminDoc = {
  uid: "jW94RyPlFBfGiw06RBpvikfy6zQ2",
  email: "alnuaimi.humam@gmail.com",
  role: "admin",
  permissions: ["read_all", "write_all", "manage_users"],
  createdAt: new Date()
};

// Add to Firestore
await addDoc(collection(firestore, 'admins'), adminDoc);
```

#### Step 2: Update Admin Dashboard Authorization
The Admin Dashboard already includes authorization checks. You can enhance them:

```typescript
// Enhanced admin check
const checkAdminAuthorization = async () => {
  try {
    // Check Firestore admin collection
    const adminQuery = query(
      collection(firestore, 'admins'),
      where('uid', '==', user?.uid)
    );
    const adminSnapshot = await getDocs(adminQuery);
    
    if (!adminSnapshot.empty) {
      console.log('✅ Admin authorized via Firestore');
      return true;
    }
    
    // Check email-based authorization
    const adminEmails = ['alnuaimi.humam@gmail.com', 'admin@rewin.com', 'humamal@rewin.com'];
    const isAdmin = adminEmails.includes(user?.email || '');
    
    if (isAdmin) {
      console.log('✅ Admin authorized via email');
      return true;
    }
    
    console.log('❌ Not authorized as admin');
    return false;
  } catch (error) {
    console.log('❌ Admin check failed:', error);
    return false;
  }
};
```

### Option 3: Custom Claims (Advanced)

#### Step 1: Set Custom Claims via Firebase Functions
Create a Firebase Function to set admin claims:

```javascript
// In Firebase Functions
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Verify the request is from an authorized admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
  }
  
  const adminEmails = ['alnuaimi.humam@gmail.com', 'admin@rewin.com', 'humamal@rewin.com'];
  if (!adminEmails.includes(context.auth.token.email)) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized to set admin claims');
  }
  
  // Set custom claim
  await admin.auth().setCustomUserClaims(data.uid, { admin: true });
  
  return { success: true };
});
```

#### Step 2: Update Security Rules
```json
{
  "rules": {
    ".read": "auth != null && auth.token.admin === true",
    ".write": "auth != null && auth.token.admin === true"
  }
}
```

## Testing Authorization

### Test Admin Access
1. Open the Admin Dashboard
2. Check browser console for authorization logs
3. Verify you can see customer and outlet data
4. Test admin functions like user management

### Debug Authorization Issues
If you still get permission errors:

1. **Check Firebase Console**: Verify admin users are added correctly
2. **Check Security Rules**: Ensure rules allow admin access
3. **Check User Token**: Verify the user has proper authentication
4. **Check Network Tab**: Look for failed requests in browser dev tools

## Recommended Implementation

For your current setup, I recommend **Option 1 (Firebase Security Rules)** because:

1. ✅ Simple to implement
2. ✅ Secure and scalable
3. ✅ Works with existing authentication
4. ✅ Easy to manage admin users
5. ✅ No additional infrastructure needed

## Next Steps

1. Update Firebase Realtime Database rules
2. Add admin users to the database
3. Test the Admin Dashboard
4. Monitor access logs in Firebase Console

## Security Best Practices

1. **Regular Audits**: Review admin access regularly
2. **Principle of Least Privilege**: Only grant necessary permissions
3. **Logging**: Monitor admin actions
4. **Backup**: Keep admin user lists backed up
5. **Rotation**: Rotate admin credentials periodically

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check security rules and admin user list
2. **Authentication Failed**: Verify user is properly signed in
3. **Data Not Loading**: Check if data exists at expected paths
4. **Admin Not Recognized**: Verify admin email/UID is correct

### Debug Commands

```javascript
// Check current user
console.log('User:', auth.currentUser);

// Check admin status
const adminEmails = ['alnuaimi.humam@gmail.com'];
console.log('Is Admin:', adminEmails.includes(auth.currentUser?.email));

// Test database access
const testRef = ref(database, 'test');
get(testRef).then(() => console.log('Access OK')).catch(e => console.log('Access failed:', e));
``` 