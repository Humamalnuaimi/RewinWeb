# Admin Dashboard Integration Guide

## Current Issue
The Admin Dashboard is not displaying account and outlet data because it was trying to read from the wrong Firebase structure. The main dashboard uses **Firestore** while the Admin Dashboard was trying to use **Firebase Realtime Database**.

## Firebase Data Structure (Correct)

### Firestore Collections
```
/users/{userId}/
├── displayName: string
├── email: string
├── createdAt: timestamp
├── isActive: boolean
├── /web_customers/
│   ├── {customerId}/
│   │   ├── name: string
│   │   ├── phoneNumber: string
│   │   ├── points: number
│   │   ├── outletId: string
│   │   ├── lastVisitOutletId: string
│   │   ├── visitedOutlets: array
│   │   └── createdAt: timestamp
└── /outlets/
    ├── {outletId}/
    │   ├── name: string
    │   ├── address: string
    │   ├── phone: string
    │   └── createdAt: timestamp
```

### Access Patterns
- **Customers**: `users/{userId}/web_customers`
- **Outlets**: `users/{userId}/outlets`
- **Users**: `users` (root collection)

## Fixed Admin Dashboard

### What Was Fixed
1. **Data Source**: Changed from Realtime Database to Firestore
2. **Collection Paths**: Updated to use correct Firestore paths
3. **Account Loading**: Now reads from `/users` collection and counts customers/outlets per user
4. **Sample Data**: Creates test data in the correct Firestore structure

### Current Functionality
- ✅ Loads all user accounts from Firestore
- ✅ Counts customers per account (`web_customers` collection)
- ✅ Counts outlets per account (`outlets` collection)
- ✅ Creates sample test data in correct structure
- ✅ Displays account data in table format

## Working with App Team

### 1. Data Structure Verification
Ask the app team to confirm:
- [ ] All user data is stored in `/users/{userId}` collection
- [ ] Customer data is stored in `/users/{userId}/web_customers` subcollection
- [ ] Outlet data is stored in `/users/{userId}/outlets` subcollection
- [ ] Each user has proper `displayName`, `email`, and `createdAt` fields

### 2. Access Permissions
Ensure the Admin Dashboard has proper Firestore security rules:
```javascript
// Example Firestore rules for Admin Dashboard
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin users to read all user data
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.admin == true);
      
      // Allow users to manage their own data
      allow write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

### 3. Data Synchronization
The app team should ensure:
- [ ] Mobile app writes customer data to `web_customers` collection
- [ ] Mobile app writes outlet data to `outlets` collection
- [ ] User registration creates proper user document in `/users` collection
- [ ] All timestamps use consistent format (Firestore Timestamp)

### 4. Testing Checklist
- [ ] Create test user account
- [ ] Add test outlets to user account
- [ ] Add test customers to user account
- [ ] Verify Admin Dashboard displays the data
- [ ] Test account deletion functionality
- [ ] Test outlet deletion functionality

## Admin Dashboard Features

### Current Features
1. **Account Management**
   - View all user accounts
   - See customer count per account
   - See outlet count per account
   - Delete accounts (with confirmation)

2. **Outlet Management**
   - View all outlets per account
   - Delete outlets (preserves customer data)
   - Create test outlets

3. **Customer Management**
   - View all customers per account
   - Edit customer information
   - Delete customers
   - Export customer data to CSV

4. **SMS Management**
   - Twilio account configuration
   - Multi-account SMS system
   - SMS sending and logging

### Planned Features
1. **Real-time Updates**: Live data updates when mobile app changes data
2. **Advanced Analytics**: Customer behavior analysis
3. **Campaign Management**: SMS and email campaigns
4. **Reporting**: Detailed reports and exports

## Troubleshooting

### Common Issues
1. **No accounts showing**: Check if users collection exists and has data
2. **Empty customer counts**: Verify `web_customers` subcollection exists
3. **Empty outlet counts**: Verify `outlets` subcollection exists
4. **Permission errors**: Check Firestore security rules

### Debug Information
The Admin Dashboard includes detailed console logging:
- Account loading process
- Customer and outlet counts
- Error messages and stack traces
- Sample data creation process

## Next Steps

1. **Coordinate with App Team**: Share this guide and verify data structure
2. **Test Integration**: Create test data and verify Admin Dashboard functionality
3. **Deploy Updates**: Push the fixed Admin Dashboard to production
4. **Monitor Performance**: Watch for any issues with data loading
5. **Gather Feedback**: Collect feedback from admin users

## Contact Information
- **Admin Dashboard Developer**: [Your Name]
- **App Team Contact**: [App Team Contact]
- **Firebase Project**: rewin-f4ca1
- **Project ID**: rewin-f4ca1

---

*This guide ensures proper integration between the mobile app and Admin Dashboard by using consistent Firebase data structures and access patterns.* 