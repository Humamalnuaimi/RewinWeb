# Firebase Realtime Database Security Rules for Admin Dashboard

## Current Issue
The admin dashboard is getting `permission_denied` errors when trying to access outlet data from paths like `/users/{userId}/outlets`.

## Solution: Updated Security Rules

Go to your Firebase Console:
1. Select your Rewin project
2. Click on "Realtime Database" in the left sidebar
3. Click on the "Rules" tab
4. Replace the current rules with these:

```json
{
  "rules": {
    // Allow authenticated users to access their own data
    "users": {
      "$userId": {
        // Users can access their own data
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId",
        
        // Admin access - allow admin users to read all user data
        ".read": "auth != null && (auth.uid == $userId || root.child('admins').child(auth.uid).exists())",
        ".write": "auth != null && (auth.uid == $userId || root.child('admins').child(auth.uid).exists())",
        
        "outlets": {
          // Users can access their own outlets
          ".read": "auth != null && auth.uid == $userId",
          ".write": "auth != null && auth.uid == $userId",
          
          // Admin access - allow admin users to read all outlets
          ".read": "auth != null && (auth.uid == $userId || root.child('admins').child(auth.uid).exists())",
          ".write": "auth != null && (auth.uid == $userId || root.child('admins').child(auth.uid).exists())"
        }
      }
    },
    
    // Root level outlets (if they exist)
    "outlets": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    
    // Admin users list
    "admins": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    
    // Allow access to other collections
    "customers": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    
    "businesses": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Alternative: Simpler Rules (Less Secure)

If you want simpler rules that allow more access:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## How to Apply

1. Copy the rules you want to use
2. Go to Firebase Console → Realtime Database → Rules
3. Replace the existing rules
4. Click "Publish"

## Testing

After updating the rules:
1. Refresh your admin dashboard
2. Check the browser console for any remaining permission errors
3. Try clicking on a user to see if their outlets load properly

## Note

The first set of rules provides better security by:
- Allowing users to access only their own data
- Providing admin access for dashboard functionality
- Maintaining security for sensitive operations

The simpler rules allow all authenticated users to access all data, which is less secure but easier to implement. 