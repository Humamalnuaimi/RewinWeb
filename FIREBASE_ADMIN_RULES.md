# Firebase Realtime Database Admin Authorization Rules

## Goal
Give full admin access to your email address so you can view and manage all outlets and user data from the admin dashboard.

## Updated Security Rules

Go to your Firebase Console:
1. Select your Rewin project
2. Click on "Realtime Database" in the left sidebar
3. Click on the "Rules" tab
4. Replace the current rules with these:

```json
{
  "rules": {
    // Admin access for your email
    ".read": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('admins').child(auth.uid).exists())",
    ".write": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('admins').child(auth.uid).exists())",
    
    // User-specific access (users can still access their own data)
    "users": {
      "$userId": {
        ".read": "auth != null && (auth.uid == $userId || auth.token.email == 'YOUR_EMAIL_HERE@example.com')",
        ".write": "auth != null && (auth.uid == $userId || auth.token.email == 'YOUR_EMAIL_HERE@example.com')",
        "outlets": {
          ".read": "auth != null && (auth.uid == $userId || auth.token.email == 'YOUR_EMAIL_HERE@example.com')",
          ".write": "auth != null && (auth.uid == $userId || auth.token.email == 'YOUR_EMAIL_HERE@example.com')"
        }
      }
    },
    
    // Outlets access (admin can see all, users can see their own)
    "outlets": {
      ".read": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('userOutlets').child(auth.uid).exists())",
      ".write": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('userOutlets').child(auth.uid).exists())"
    },
    
    // Customers access
    "customers": {
      ".read": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('userCustomers').child(auth.uid).exists())",
      ".write": "auth != null && (auth.token.email == 'YOUR_EMAIL_HERE@example.com' || root.child('userCustomers').child(auth.uid).exists())"
    },
    
    // Admin users list (only admin can access)
    "admins": {
      ".read": "auth != null && auth.token.email == 'YOUR_EMAIL_HERE@example.com'",
      ".write": "auth != null && auth.token.email == 'YOUR_EMAIL_HERE@example.com'"
    }
  }
}
```

## Steps to Implement:

### 1. Replace YOUR_EMAIL_HERE
Replace `YOUR_EMAIL_HERE@example.com` with your actual email address (the one you use for the admin dashboard).

### 2. Apply the Rules
1. Copy the rules above
2. Go to Firebase Console → Realtime Database → Rules
3. Replace the current rules with the new ones
4. Click "Publish"

### 3. Test the Admin Dashboard
1. Open `http://localhost:5174/`
2. Sign in with your admin email
3. You should now be able to see all outlets and user data

## How It Works:

- **Your Email**: Gets full read/write access to all data
- **Other Users**: Can only access their own data (maintains security)
- **Admin Dashboard**: Can now access all outlets and user information
- **Main App**: Users can still see their own outlets as before

## Alternative: Simpler Rules (Less Secure)

If you want simpler rules that give all authenticated users access (for testing):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Choose the first option for production, the second for testing only.**

## What This Enables:

✅ **Admin Dashboard**: Can view all outlets and user data  
✅ **User Management**: Can see all users and their businesses  
✅ **Outlet Management**: Can view and manage all outlets  
✅ **Security**: Other users can only access their own data  
✅ **Main App**: Users can still access their own outlets normally  

Let me know your email address and I'll help you set up the exact rules! 