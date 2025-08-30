# 📱 Mobile App Team - CSV Import Integration Notice

## 🚨 **URGENT: New Customer Data Structure & Mobile App Integration Required**

### 📋 **What We Implemented (Admin Panel)**

We've implemented a comprehensive **CSV Import/Export system** for the admin panel that allows business owners to:

1. **Export customer data** with 40+ fields including all customer information
2. **Import large CSV files** (94,000+ customers) from other reward systems
3. **Bulk customer management** with proper field mapping and data validation

### 🔧 **New Customer Data Fields Added to Firebase**

When customers are imported via CSV, they now include these additional fields that **may not exist in your current mobile app logic**:

#### **Extended Customer Fields:**
```javascript
// Basic Info (Enhanced)
firstName: string
lastName: string  
fullName: string
displayName: string

// Points & Financial (New)
availablePoints: number
pointsRedeemed: number
totalPointsRedeemed: number
totalSpent: number

// Dates & Timestamps (Enhanced)
dateJoined: string
firstVisitedAt: string | null
firstVisit: string | null
lastVisitedAt: string | null
lastVisit: string | null
processedTimestamp: string | null

// Visit & Activity (Enhanced)
visits: number
totalVisits: number
active: boolean
processed: boolean

// Outlet Information (Enhanced)
homeOutletId: string | null
homeOutletName: string | null
checkInOutletId: string | null
checkInOutletName: string | null

// Marketing Preferences (Multiple Formats)
reachable_email: boolean
emailOptIn: boolean
reachable_sms: boolean
smsOptIn: boolean
optedInForSMS: boolean
reachable_push: boolean
pushOptIn: boolean

// Customer Status (New)
isStarred: boolean
isRegistered: boolean
registered: boolean

// Additional Info (Enhanced)
comments: string
source: string
customerGroup: string
customerId: string

// Extended Data (New)
gender: string
age: number | null
city: string
state: string
zipCode: string
zip: string
address: string
referralCode: string
referredBy: string

// Import Metadata (New)
importedAt: string
importSource: string ('csv_bulk_import')
```

### 🔍 **Potential Issues for Mobile App**

#### **1. Field Name Conflicts**
- We use **multiple field names** for the same data (e.g., `reachableEmail` AND `reachable_email`)
- Your app might be reading from one field while we're writing to another

#### **2. Data Type Mismatches**
- **Points**: We calculate `totalPoints` as current balance, but also store `availablePoints`
- **Dates**: We store dates in multiple formats (ISO strings, Firebase timestamps)
- **Booleans**: Marketing preferences stored as both `true/false` and `'TRUE'/'FALSE'`

#### **3. Missing Field Handling**
- Imported customers might have fields your app doesn't expect
- Your app might crash if it expects certain fields that don't exist

### 🚨 **What You Need to Check**

#### **1. Customer Data Reading Logic**
```javascript
// Check if your app handles these field variations:
const customerPoints = customer.totalPoints || customer.availablePoints || 0;
const emailOptIn = customer.reachableEmail || customer.reachable_email || customer.emailOptIn || false;
const smsOptIn = customer.reachableSMS || customer.reachable_sms || customer.optedInForSMS || false;
```

#### **2. Points Calculation**
- **Admin Panel**: `totalPoints` = current balance (earned - redeemed)
- **Mobile App**: Verify you're using the same calculation method
- **Issue**: If app shows different points than admin panel, users will be confused

#### **3. Marketing Preferences**
```javascript
// Your app should check ALL these variations:
const canSendEmail = customer.reachableEmail || customer.reachable_email || customer.emailOptIn;
const canSendSMS = customer.reachableSMS || customer.reachable_sms || customer.optedInForSMS;
const canSendPush = customer.reachablePush || customer.reachable_push || customer.pushOptIn;
```

#### **4. Customer Registration Status**
- Check if your app handles `wasRegistered`, `isRegistered`, or `registered` fields
- Imported customers might have different registration statuses

### 🔧 **Recommended Mobile App Updates**

#### **1. Robust Field Reading**
```javascript
// Use fallback field reading
const getCustomerField = (customer, fieldNames) => {
  for (const fieldName of fieldNames) {
    if (customer[fieldName] !== undefined && customer[fieldName] !== null) {
      return customer[fieldName];
    }
  }
  return null;
};

// Usage examples:
const customerName = getCustomerField(customer, ['name', 'fullName', 'displayName']);
const emailOptIn = getCustomerField(customer, ['reachableEmail', 'reachable_email', 'emailOptIn']);
```

#### **2. Points Consistency**
```javascript
// Ensure points calculation matches admin panel
const currentPoints = customer.totalPoints || customer.availablePoints || 0;
const lifetimePoints = customer.lifetimePointsEarned || customer.lifetimePoints || 0;
const redeemedPoints = customer.pointsRedeemed || customer.totalPointsRedeemed || 0;
```

#### **3. Date Handling**
```javascript
// Handle multiple date formats
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    return dateValue.toDate(); // Firebase Timestamp
  }
  return new Date(dateValue); // ISO string
};
```

### 🧪 **Testing Requirements**

#### **Test with Imported Customers:**
1. **Login/Authentication** - Can imported customers log in?
2. **Points Display** - Do points match admin panel?
3. **Marketing Preferences** - Are opt-in/out settings respected?
4. **Profile Information** - Is customer data displayed correctly?
5. **Transactions** - Can imported customers earn/redeem points?

#### **Test Edge Cases:**
- Customers with missing fields
- Customers with `importSource: 'csv_bulk_import'`
- Customers with multiple outlet assignments
- Customers with extended data fields

### 📞 **Next Steps**

1. **Review your customer data reading logic** against the fields above
2. **Test with imported customers** in Firebase
3. **Update field reading** to handle multiple field name variations
4. **Verify points calculation** matches admin panel
5. **Test marketing preferences** work correctly

### 🔗 **Technical Details**

- **Import Source**: All CSV imported customers have `importSource: 'csv_bulk_import'`
- **Batch Size**: Imports are processed in batches of 500
- **Firestore Path**: `/users/{userId}/customers/{customerId}`
- **Admin Panel Branch**: `Testadmin-7`

### ❓ **Questions for App Team**

1. How does your app currently read customer data from Firestore?
2. Which field names do you use for points, marketing preferences, and customer info?
3. Do you have any field validation that might reject imported customers?
4. How do you handle customers with missing or null fields?

---

**Please test thoroughly and let us know if you find any issues with imported customers not appearing or behaving correctly in the mobile app.**

**Contact**: Admin Panel Team  
**Date**: ${new Date().toISOString().split('T')[0]}  
**Priority**: HIGH - Customer data integrity issue
