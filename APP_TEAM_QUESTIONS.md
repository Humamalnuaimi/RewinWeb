# Questions for App Team - Firebase Data Structure

## Background
We're building an Admin Dashboard that needs to read the same account and outlet data as your mobile app. We need to understand your exact Firebase structure to ensure consistency.

## Key Questions

### 1. **Account Data Structure**
- **Question**: How do you store user/account data in Firebase?
- **What we need to know**:
  - Collection name: Is it `/users` or something else?
  - Document structure: What fields do you store for each user?
  - Example: `{ displayName, email, createdAt, isActive }`

### 2. **Outlet Data Structure**
- **Question**: How do you store outlet data for each account?
- **What we need to know**:
  - Collection path: Is it `/users/{userId}/outlets`?
  - Document structure: What fields for each outlet?
  - Example: `{ name, address, phone, createdAt }`

### 3. **Customer Data Structure**
- **Question**: How do you store customer data for each account?
- **What we need to know**:
  - Collection path: Is it `/users/{userId}/web_customers`?
  - Document structure: What fields for each customer?
  - Example: `{ name, phoneNumber, points, outletId, createdAt }`

### 4. **Data Access Patterns**
- **Question**: How does your mobile app read this data?
- **What we need to know**:
  - Do you use Firestore or Realtime Database?
  - Do you use real-time listeners (`onSnapshot`) or one-time reads?
  - How do you handle user authentication and data access?

### 5. **Security Rules**
- **Question**: What are your current Firestore security rules?
- **What we need to know**:
  - Can users read other users' data?
  - Do you have admin-level access for certain users?
  - Example rules structure

## Current Assumptions (Please Verify)

### What We Think You Use:
```javascript
// Users collection
/users/{userId}/
├── displayName: string
├── email: string
├── createdAt: timestamp
├── isActive: boolean

// Outlets subcollection
/users/{userId}/outlets/{outletId}/
├── name: string
├── address: string
├── phone: string
├── createdAt: timestamp

// Customers subcollection
/users/{userId}/web_customers/{customerId}/
├── name: string
├── phoneNumber: string
├── points: number
├── outletId: string
├── createdAt: timestamp
```

### What We Need Confirmation On:
- [ ] Collection names and paths
- [ ] Field names and types
- [ ] Authentication and access patterns
- [ ] Security rules
- [ ] Any additional fields we're missing

## Questions for App Team

### Please provide:

1. **Firebase Project Details**:
   - Project ID: `rewin-f4ca1` (correct?)
   - Database type: Firestore or Realtime Database?

2. **Data Structure**:
   - Can you share a sample user document structure?
   - Can you share a sample outlet document structure?
   - Can you share a sample customer document structure?

3. **Access Patterns**:
   - How does your mobile app authenticate users?
   - How does your mobile app read user data?
   - How does your mobile app read outlet data?
   - How does your mobile app read customer data?

4. **Security**:
   - What are your current Firestore security rules?
   - Do you have admin users with special access?

5. **Testing**:
   - Can you create a test account with sample data?
   - Can you share the test account credentials?

## What We're Building

We're building an Admin Dashboard that will:
- Display all user accounts
- Show outlet and customer counts per account
- Allow account management (view, edit, delete)
- Provide SMS management features
- Export data to CSV

## Next Steps

1. **Get answers from app team** to the questions above
2. **Update Admin Dashboard** to match your exact structure
3. **Test with real data** from your Firebase project
4. **Deploy and monitor** for any issues

## Contact Information

- **Admin Dashboard Developer**: [Your Name]
- **App Team Contact**: [App Team Contact]
- **Firebase Project**: rewin-f4ca1
- **Current Issue**: Admin Dashboard not showing account data due to structure mismatch

---

*Please provide this information so we can ensure the Admin Dashboard reads data exactly the same way as your mobile app.* 