// FEATURE: Firebase Configuration
// FILE: firebase.service.ts
// PURPOSE: Firebase initialization and Google Auth configuration
// LAST MODIFIED: January 28, 2025

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, type User, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential, GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import BackendEmailService from './backend-email.service';

// Firebase configuration for Rewin project - MUST match the original dashboard config
const firebaseConfig = {
  apiKey: "AIzaSyCF366Uvs28FeRzhEH84Zvm6jVoX1QcnOU",
  authDomain: "rewin-f4ca1.firebaseapp.com",
  databaseURL: "https://rewin-f4ca1-default-rtdb.firebaseio.com",
  projectId: "rewin-f4ca1",
  storageBucket: "rewin-f4ca1.firebasestorage.app",
  messagingSenderId: "355525518295",
  appId: "1:355525518295:web:bdf73a20fb97186148a192", // Same as original dashboard
  measurementId: "G-H1WK02H8SN" // Same as original dashboard
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Admin email list - TODO: Move to Firestore for better management
const ADMIN_EMAILS = [
  'alnuaimi.humam@gmail.com', // Add your admin emails here
  // Add more admin emails as needed
];

// Auth Service
export class AuthService {
  // Check if user is admin
  static async isUserAdmin(user: User): Promise<boolean> {
    try {
      // Method 1: Check against admin email list
      if (ADMIN_EMAILS.includes(user.email || '')) {
        return true;
      }

      // Method 2: Check Firestore admin collection (optional)
      const adminDoc = await getDoc(doc(db, 'admins', user.email || ''));
      return adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Create admin record in Firestore
  static async createAdminRecord(user: User) {
    try {
      await setDoc(doc(db, 'admins', user.email || ''), {
        email: user.email,
        displayName: user.displayName,
        role: 'admin',
        createdAt: new Date(),
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Error creating admin record:', error);
    }
  }

  // Sign in with email and password
  static async signInWithEmail(email: string, password: string, loginType: 'admin' | 'user' = 'admin') {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Only check admin status if trying to access admin panel
      let isAdmin = false;
      if (loginType === 'admin') {
        isAdmin = await this.isUserAdmin(result.user);
        
        // If trying to access admin panel but not admin, deny access
        if (!isAdmin) {
          await signOut(auth);
          return {
            success: false,
            user: null,
            error: 'Access denied. Admin privileges required.'
          };
        }
        
        // Create/update admin record for admin users
        await this.createAdminRecord(result.user);
      }

      // For user login, allow any authenticated user (no admin check needed)

      return {
        success: true,
        user: result.user,
        isAdmin,
        loginType,
        error: null
      };
    } catch (error: any) {
      return {
        success: false,
        user: null,
        isAdmin: false,
        error: error.message
      };
    }
  }

  // Sign in with Google
  static async signInWithGoogle(loginType: 'admin' | 'user' = 'admin') {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Only check admin status if trying to access admin panel
      let isAdmin = false;
      if (loginType === 'admin') {
        isAdmin = await this.isUserAdmin(result.user);
        
        // If trying to access admin panel but not admin, deny access
        if (!isAdmin) {
          await signOut(auth);
          return {
            success: false,
            user: null,
            error: 'Access denied. Admin privileges required.'
          };
        }
        
        // Create/update admin record for admin users
        await this.createAdminRecord(result.user);
      }

      // For user login, allow any authenticated user (no admin check needed)

      return {
        success: true,
        user: result.user,
        isAdmin,
        loginType,
        error: null
      };
    } catch (error: any) {
      return {
        success: false,
        user: null,
        isAdmin: false,
        error: error.message
      };
    }
  }

  // Sign out
  static async signOut() {
    try {
      await signOut(auth);
      return {
        success: true,
        error: null
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get current user
  static getCurrentUser() {
    return auth.currentUser;
  }

  // Check if user is authenticated
  static isAuthenticated() {
    return !!auth.currentUser;
  }

  // Get users from Firestore (for admin panel)
  static async getUsers() {
    try {
      console.log('🔍 Fetching users from Firestore users collection...');
      
      // Try without orderBy first to avoid issues with missing fields
      const usersCollection = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollection);
      
      console.log('📊 Total user documents found:', querySnapshot.size);
      
      const users: any[] = [];
      
      // Process each user and get their outlet count
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        console.log('👤 User document:', doc.id, userData);
        
        // Get outlet count for this user
        let outletCount = 0;
        try {
          const outletsCollection = collection(db, 'users', doc.id, 'outlets');
          const outletsSnapshot = await getDocs(outletsCollection);
          outletCount = outletsSnapshot.size;
          console.log(`🏪 User ${doc.id} has ${outletCount} outlets`);
        } catch (error) {
          console.log(`⚠️ Could not fetch outlets for user ${doc.id}:`, error);
        }
        
        users.push({
          uid: doc.id,
          email: userData.email || '',
          displayName: userData.displayName || userData.name || '',
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt || new Date().toISOString(),
          lastSignIn: userData.lastSignIn?.toDate?.()?.toISOString() || userData.lastSignIn || new Date().toISOString(),
          disabled: userData.disabled || false,
          emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : true,
          photoURL: userData.photoURL || undefined,
          outletCount: outletCount
        });
      }
      
      console.log('✅ Processed users:', users.length, users);
      
      return {
        success: true,
        users,
        total: users.length,
        error: null
      };
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      return {
        success: false,
        users: [],
        total: 0,
        error: error.message
      };
    }
  }

  // Get user count for dashboard (original working approach)
  static async getUserCount() {
    try {
      const usersCollection = collection(db, 'users');
      const querySnapshot = await getDocs(usersCollection);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }

  // Create new user (Admin functionality)
  static async createUser(userData: { email: string; displayName: string; invitationType: 'email' | 'gmail' }) {
    try {
      console.log('🆕 Creating new user:', userData);
      
      // Store current admin user info before creating new user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Admin must be signed in to create users');
      }
      
      const adminEmail = currentUser.email;
      const adminUid = currentUser.uid;
      console.log('👤 Current admin:', adminEmail);
      
      // Store admin's current auth token for re-authentication
      const adminIdToken = await currentUser.getIdToken();
      
      // Create a unique user ID for Firestore (we'll create the auth user later via invitation)
      // This approach avoids the auth context switching issue
      const newUserUid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📝 Creating user document with ID:', newUserUid);
      
      // We'll create the Firestore document first, then handle the auth invitation
      let userRecord = {
        uid: newUserUid,
        email: userData.email,
        displayName: userData.displayName,
        emailVerified: false,
        disabled: false
      };
      
      // Create comprehensive Firestore user document following the previous admin panel pattern
      const userDocRef = doc(db, 'users', userRecord.uid);
      
      const userDocData = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userData.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: false,
        createdAt: serverTimestamp(),
        lastSignIn: null,
        createdFrom: 'admin_panel_v2',
        authMethod: userData.invitationType,
        invitationStatus: userData.invitationType === 'email' ? 'pending' : 'completed',
        
        // Mobile app compatibility fields
        totalCustomers: 0,
        totalOutlets: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        totalPoints: 0,
        
        // Settings and preferences
        settings: {
          notifications: true,
          emailUpdates: true,
          timezone: 'UTC',
          currency: 'USD',
          language: 'en'
        },
        
        // Business info
        businessInfo: {
          name: userData.displayName,
          type: 'retail',
          industry: 'general',
          description: '',
          website: '',
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          }
        },
        
        // Analytics and stats
        analytics: {
          totalCustomers: 0,
          totalRevenue: 0,
          totalPointsEarned: 0,
          totalPointsRedeemed: 0,
          totalCheckIns: 0,
          averageCustomerRating: 0,
          topPerformingOutlet: '',
          lastUpdated: new Date().toISOString()
        }
      };
      
      await setDoc(userDocRef, userDocData);
      console.log('✅ User document created successfully in Firestore');
      
      // Send invitation email (this doesn't affect auth context)
      let emailSent = false;
      try {
        const setupLink = userData.invitationType === 'email' 
          ? `${window.location.origin}/signup?token=${newUserUid}&email=${encodeURIComponent(userData.email)}`
          : `${window.location.origin}/admin/login`;

        const emailResult = await BackendEmailService.sendUserInvitation({
          userEmail: userData.email,
          userName: userData.displayName,
          invitationType: userData.invitationType,
          setupLink: setupLink
        });

        if (emailResult.success) {
          console.log('✅ Invitation email sent successfully to:', userData.email);
          emailSent = true;
        } else {
          console.log('⚠️ Failed to send invitation email:', emailResult.error);
          console.log('📧 User created but invitation email not sent. Manual invitation required.');
        }
      } catch (emailError) {
        console.log('⚠️ Email service error:', emailError);
        console.log('📧 User created but invitation email not sent. Manual invitation required.');
      }
      
      // Admin session remains intact - no sign out needed!
      console.log('✅ Admin session preserved, no re-authentication needed');
      
      // Note: Collections will be automatically created by Firebase when first document is added
      // Collections that will be created as needed:
      // - campaigns, checkins, customerPromotions, customers, outlets
      // - promotionUsage, transactions, twilio_account, twilio_events
      // - web_customers, web_transactions, web_visits
      
      console.log('🎉 Enhanced user creation completed successfully');
      
      return {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userData.displayName,
          emailVerified: userRecord.emailVerified,
          disabled: false,
          createdAt: new Date().toISOString(),
          lastSignIn: null,
          authMethod: userData.invitationType,
          invitationStatus: userData.invitationType === 'email' ? 'pending' : 'completed',
          mobileAppCompatible: true,
          outletCount: 0
        },
        message: emailSent 
          ? (userData.invitationType === 'email' 
            ? 'User created and invitation email sent successfully!'
            : 'User created and Google sign-in invitation sent successfully!')
          : 'User created successfully, but invitation email failed to send. Please configure Gmail SMTP service.',
        requiresReauth: false, // Admin session is preserved
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Create user error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'Failed to create user';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = 'Email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        user: null,
        message: null,
        error: errorMessage
      };
    }
  }

  // Delete user with complete data cleanup (reverses the creation process)
  static async deleteUser(userId: string) {
    try {
      console.log(`🗑️ Starting user deletion for: ${userId}`);
      
      // 1. Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', userId);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        console.log(`❌ User document ${userId} does not exist in Firestore`);
        return {
          success: false,
          error: 'User document not found in Firestore'
        };
      }
      
      console.log(`✅ Found user document in Firestore: ${userId}`);
      const userData = userDocSnapshot.data();
      
      // 2. Get data summary before deletion
      const dataSummary = {
        webCustomers: 0,
        webTransactions: 0,
        customers: 0,
        transactions: 0,
        outlets: 0,
        campaigns: 0,
        promotions: 0
      };
      
      // Count all collections (matching old admin panel exactly)
      const collections = [
        // Web dashboard collections
        'web_customers', 
        'web_transactions', 
        'web_visits',
        // Mobile app collections
        'customers', 
        'transactions', 
        'outlets',
        'checkins',
        // Shared collections
        'campaigns',
        'promotions',
        'promotionUsage',
        'customerPromotions',
        'twilio_account',
        'twilio_events'
      ];
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, 'users', userId, collectionName);
          const snapshot = await getDocs(collectionRef);
          const summaryKey = collectionName.replace('web_', '');
          if (summaryKey in dataSummary) {
            (dataSummary as any)[summaryKey] = snapshot.size;
          }
          console.log(`📊 ${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`⚠️ Error counting ${collectionName}:`, error);
        }
      }
      
      console.log('📊 Data summary before deletion:', dataSummary);
      
      // 3. Delete ALL subcollections first (Firestore-first approach)
      let totalDeleted = 0;
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, 'users', userId, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          if (snapshot.size > 0) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnapshot => {
              batch.delete(docSnapshot.ref);
            });
            await batch.commit();
            totalDeleted += snapshot.size;
            console.log(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
          }
        } catch (error) {
          console.log(`❌ Error deleting ${collectionName}:`, error);
        }
      }
      
      // 4. Delete main user document
      try {
        console.log(`🗑️ Deleting main user document: users/${userId}`);
        await deleteDoc(userDocRef);
        console.log('✅ Main user document deleted successfully');
        totalDeleted += 1;
      } catch (error) {
        console.error('❌ Error deleting main user document:', error);
        throw error;
      }
      
      // 5. Try to delete from Firebase Auth via backend API
      let authDeleted = false;
      try {
        console.log('🔐 Attempting to delete Firebase Auth user via backend...');
        const response = await fetch('http://localhost:3001/api/auth/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            uid: userId,
            email: userData?.email 
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Firebase Auth user deleted successfully');
            authDeleted = true;
          } else {
            console.log('⚠️ Backend auth deletion failed:', result.error);
          }
        } else {
          console.log('⚠️ Backend auth deletion request failed:', response.status);
        }
      } catch (authError) {
        console.log('⚠️ Could not connect to backend for auth deletion:', authError);
      }
      
      const deletionSummary = {
        userInfo: {
          uid: userId,
          email: userData?.email || 'unknown',
          displayName: userData?.displayName || 'unknown',
          createdFrom: userData?.createdFrom || 'unknown'
        },
        dataSummary,
        totalDeleted,
        collectionsCleaned: collections.filter(col => {
          const summaryKey = col.replace('web_', '');
          return summaryKey in dataSummary && (dataSummary as any)[summaryKey] > 0;
        }),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ User deletion completed successfully:', deletionSummary);
      
      return {
        success: true,
        message: authDeleted 
          ? 'User completely deleted from Firebase Auth and Firestore with all associated data'
          : 'User deleted from Firestore with all associated data (Firebase Auth deletion requires backend setup)',
        deletionSummary: {
          ...deletionSummary,
          authDeleted
        },
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      return {
        success: false,
        message: null,
        deletionSummary: null,
        error: error.message || 'Failed to delete user'
      };
    }
  }

  // 6. UPDATE USER
  static async updateUser(userId: string, userData: { displayName?: string; email?: string }) {
    try {
      console.log(`✏️ Updating user: ${userId}`, userData);
      
      const userDocRef = doc(db, 'users', userId);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        return {
          success: false,
          error: 'User not found',
          user: null
        };
      }
      
      // Update the user document in Firestore
      const updateData: any = {};
      if (userData.displayName !== undefined) {
        updateData.displayName = userData.displayName;
      }
      if (userData.email !== undefined) {
        updateData.email = userData.email;
      }
      updateData.updatedAt = serverTimestamp();
      
      await updateDoc(userDocRef, updateData);
      
      console.log(`✅ User ${userId} updated successfully`);
      
      return {
        success: true,
        message: 'User updated successfully',
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }

  // 6.1. CREATE OUTLET FOR USER
  static async createOutlet(userId: string, outletData: { name: string; location?: string; address?: string }) {
    try {
      console.log(`🏪 Creating outlet for user: ${userId}`, outletData);
      
      // Generate a unique outlet ID
      const outletId = `outlet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const outletDocRef = doc(db, 'users', userId, 'outlets', outletId);
      
      const newOutlet = {
        name: outletData.name.trim(),
        location: outletData.location?.trim() || '',
        address: outletData.address?.trim() || '',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: userId
      };
      
      await setDoc(outletDocRef, newOutlet);
      
      console.log(`✅ Outlet ${outletId} created successfully for user ${userId}`);
      return { 
        success: true, 
        outlet: { id: outletId, ...newOutlet }, 
        message: 'Outlet created successfully',
        error: null 
      };
    } catch (error: any) {
      console.error('❌ Error creating outlet:', error);
      return { success: false, outlet: null, error: error.message };
    }
  }

  // 7. GET SINGLE USER BY ID
  static async getUserById(userId: string) {
    try {
      console.log(`🔍 Fetching user by ID: ${userId}`);
      
      const userDocRef = doc(db, 'users', userId);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        return {
          success: false,
          error: 'User not found',
          user: null
        };
      }
      
      const userData = userDocSnapshot.data();
      console.log(`✅ User found:`, userData);
      
      return {
        success: true,
        user: {
          uid: userId,
          ...userData
        },
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching user by ID:', error);
      return {
        success: false,
        error: error.message,
        user: null
      };
    }
  }

  // 7. GET USER'S CUSTOMERS (with calculated current balance)
  static async getUserCustomers(userId: string) {
    try {
      console.log(`👥 Fetching customers for user: ${userId}`);
      
      const customersRef = collection(db, 'users', userId, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      // Get transactions to calculate current balance for each customer
      const transactionsRef = collection(db, 'users', userId, 'web_transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const customers = customersSnapshot.docs.map(doc => {
        const customerData = doc.data();
        const customerId = doc.id;
        
        // Calculate current balance and points redeemed from transactions for this customer
        let currentBalance = 0;
        let totalPointsRedeemed = 0;
        let totalPointsEarned = 0;
        let firstVisitDate = null;
        let lastVisitDate = null;
        
        const customerPhone = customerData.phoneNumber || customerData.phone;
        
        const customerTransactions = transactions.filter(t => {
          // Match by customerId, customerPhone, or phone number (with and without +)
          const transactionPhone = t.customerPhone || t.phone;
          const phoneMatch = customerPhone && transactionPhone && (
            customerPhone === transactionPhone ||
            customerPhone.replace(/^\+/, '') === transactionPhone.replace(/^\+/, '') ||
            customerPhone === transactionPhone.replace(/^\+/, '') ||
            customerPhone.replace(/^\+/, '') === transactionPhone
          );
          
          return t.customerId === customerId || 
                 t.customerId === customerData.customerId ||
                 phoneMatch;
        });
        
        console.log(`Customer ${customerId} (${customerPhone}): found ${customerTransactions.length} transactions`);
        
        // Sort transactions by date to find first/last visit
        const sortedTransactions = customerTransactions.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateA.getTime() - dateB.getTime();
        });
        
        if (sortedTransactions.length > 0) {
          const firstTransaction = sortedTransactions[0];
          const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
          
          firstVisitDate = firstTransaction.createdAt?.toDate ? firstTransaction.createdAt.toDate() : new Date(firstTransaction.createdAt);
          lastVisitDate = lastTransaction.createdAt?.toDate ? lastTransaction.createdAt.toDate() : new Date(lastTransaction.createdAt);
        }
        
        customerTransactions.forEach(transaction => {
          const pointsChanged = transaction.pointsChanged || 0;
          const transactionType = transaction.transactionType || '';
          const isManualTransaction = transaction.isManualTransaction || false;
          
          console.log(`  Transaction: ${transactionType}, points: ${pointsChanged}, manual: ${isManualTransaction}`);
          
          if (transactionType.toUpperCase() === 'EARNED' && isManualTransaction && pointsChanged > 0) {
            currentBalance += pointsChanged;
            totalPointsEarned += pointsChanged;
          } else if (transactionType.toUpperCase() === 'REDEEMED' && pointsChanged < 0) {
            currentBalance += pointsChanged; // pointsChanged is already negative for redeemed
            totalPointsRedeemed += Math.abs(pointsChanged); // Store as positive number
          }
        });
        
        console.log(`Customer ${customerId}: stored totalPoints=${customerData.totalPoints}, calculated currentBalance=${currentBalance}, pointsRedeemed=${totalPointsRedeemed}`);
        
        // Use calculated balance if we found transactions, otherwise use stored totalPoints
        const finalBalance = customerTransactions.length > 0 ? currentBalance : (customerData.totalPoints || 0);
        
        return {
          id: customerId,
          ...customerData,
          // Use calculated current balance or fallback to stored totalPoints
          totalPoints: Math.max(0, finalBalance), // Ensure non-negative
          storedTotalPoints: customerData.totalPoints, // Keep original for reference
          calculatedBalance: currentBalance,
          transactionCount: customerTransactions.length,
          // Add calculated fields for CSV export
          pointsRedeemed: totalPointsRedeemed,
          totalPointsRedeemed: totalPointsRedeemed,
          lifetimePointsEarned: totalPointsEarned || customerData.lifetimePointsEarned || 0,
          firstVisitedAt: firstVisitDate || customerData.firstVisitedAt || customerData.createdAt,
          lastVisitedAt: lastVisitDate || customerData.lastVisitedAt || customerData.updatedAt,
          visitCount: customerTransactions.length || customerData.visitCount || 0
        };
      });
      
      console.log(`✅ Found ${customers.length} customers for user ${userId}`);
      
      return {
        success: true,
        customers,
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching user customers:', error);
      return {
        success: false,
        customers: [],
        error: error.message
      };
    }
  }

  // 8. GET USER'S OUTLETS (with customer counts based on home outlet like old admin panel)
  static async getUserOutlets(userId: string) {
    try {
      console.log(`🏪 Fetching outlets for user: ${userId}`);
      
      const outletsRef = collection(db, 'users', userId, 'outlets');
      const outletsSnapshot = await getDocs(outletsRef);
      
      // Also fetch customers to calculate outlet customer counts
      const customersRef = collection(db, 'users', userId, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      const userCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`Found ${userCustomers.length} customers for user ${userId}`);
      
      const outlets = [];
      
      // Process outlets with customer counts (matching old admin panel logic)
      for (const outletDoc of outletsSnapshot.docs) {
        const outletData = outletDoc.data();
        const outletId = outletDoc.id;
        
        // Count customers for this specific outlet using outletId (primary) and outletName (fallback)
        // Each customer belongs to one home outlet based on their stable outletId field
        const outletCustomers = userCustomers.filter(customer => {
          const customerOutletId = customer.outletId;        // Stable field - use this first
          const customerOutletName = customer.outletName;    // Stable field - fallback only
          const currentOutletId = outletDoc.id;
          const outletName = outletData.name;
          
          // PRIMARY: Match by outletId (most reliable - this is the stable field)
          let matches = false;
          if (customerOutletId && customerOutletId === currentOutletId) {
            matches = true;
            console.log(`Customer ${customer.id} matched by outletId: ${customerOutletId} === ${currentOutletId}`);
          }
          // FALLBACK: Only if outletId is missing, try outletName (case-insensitive)
          else if (!customerOutletId && customerOutletName && outletName && customerOutletName.toLowerCase() === outletName.toLowerCase()) {
            matches = true;
            console.log(`Customer ${customer.id} matched by outletName (fallback): ${customerOutletName} === ${outletName}`);
          }
          // NO FALLBACK: If customer has outletId but it doesn't match, don't assign to any outlet
          // This prevents customers from being assigned to multiple outlets with the same name
          
          return matches;
        });
        
        console.log(`Outlet ${outletId} has ${outletCustomers.length} customers`);
        
        outlets.push({
          id: outletDoc.id,
          ...outletData,
          customerCount: outletCustomers.length,
          // Normalize display name to uppercase for consistency
          displayName: outletData.name ? outletData.name.toUpperCase() : outletData.name
        });
      }
      
      console.log(`✅ Found ${outlets.length} outlets for user ${userId}`);
      
      return {
        success: true,
        outlets,
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching user outlets:', error);
      return {
        success: false,
        outlets: [],
        error: error.message
      };
    }
  }

  // 9. GET USER'S ANALYTICS (matching old admin panel calculation)
  static async getUserAnalytics(userId: string, timePeriod: string = 'week') {
    try {
      console.log(`📊 Fetching analytics for user: ${userId}, period: ${timePeriod}`);
      
      // Get user's web_transactions for analytics (matching old admin panel)
      const webTransactionsRef = collection(db, 'users', userId, 'web_transactions');
      const webTransactionsSnapshot = await getDocs(webTransactionsRef);
      
      const webTransactions = webTransactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get user's customers count
      const customersRef = collection(db, 'users', userId, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      const customersCount = customersSnapshot.size;
      
      // Get user's web_visits for check-ins
      const webVisitsRef = collection(db, 'users', userId, 'web_visits');
      const webVisitsSnapshot = await getDocs(webVisitsRef);
      
      // Calculate analytics based on time period
      const now = new Date();
      let startDate = new Date();
      
      switch (timePeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      // Filter web_transactions by time period
      const filteredTransactions = webTransactions.filter(transaction => {
        let transactionDate;
        if (transaction.timestamp && transaction.timestamp.toDate) {
          transactionDate = transaction.timestamp.toDate();
        } else if (transaction.timestamp) {
          transactionDate = new Date(transaction.timestamp);
        } else {
          return false;
        }
        return transactionDate >= startDate;
      });
      
      // Calculate metrics (matching old admin panel logic)
      let totalPointsEarned = 0;
      let totalPointsRedeemed = 0;
      
      filteredTransactions.forEach(transaction => {
        const pointsChanged = transaction.pointsChanged || 0;
        const transactionType = transaction.transactionType || '';
        const isManualTransaction = transaction.isManualTransaction || false;
        
        if (transactionType.toUpperCase() === 'EARNED' && isManualTransaction && pointsChanged > 0) {
          totalPointsEarned += pointsChanged;
        } else if (transactionType.toUpperCase() === 'REDEEMED' && pointsChanged < 0) {
          totalPointsRedeemed += Math.abs(pointsChanged);
        }
      });
      
      // Calculate revenue: 1 point = $0.10 (matching old admin panel)
      const totalRevenue = totalPointsEarned * 0.1;
      
      // Calculate check-ins from web_visits
      const filteredVisits = webVisitsSnapshot.docs.filter(doc => {
        const visit = doc.data();
        let visitDate;
        if (visit.timestamp && visit.timestamp.toDate) {
          visitDate = visit.timestamp.toDate();
        } else if (visit.timestamp) {
          visitDate = new Date(visit.timestamp);
        } else {
          return false;
        }
        return visitDate >= startDate;
      });
      
      const checkInsCount = filteredVisits.length;
      
      // Calculate current total points balance (sum of all customers' calculated current balance)
      let totalCurrentPoints = 0;
      
      // Get customers with calculated current balance
      const customersResponse = await this.getUserCustomers(userId);
      if (customersResponse.success) {
        customersResponse.customers.forEach(customer => {
          totalCurrentPoints += customer.totalPoints || 0; // This is now the calculated current balance
        });
      }

      console.log(`✅ Analytics calculated for user ${userId}:`, {
        customersCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPointsEarned,
        totalPointsRedeemed,
        totalCurrentPoints,
        checkInsCount,
        transactionsCount: filteredTransactions.length
      });
      
      return {
        success: true,
        analytics: {
          customersCount,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalPointsEarned,
          totalPointsRedeemed,
          totalCurrentPoints, // Current points balance across all customers
          checkInsCount,
          transactionsCount: filteredTransactions.length
        },
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching user analytics:', error);
      return {
        success: false,
        analytics: {
          customersCount: 0,
          totalRevenue: 0,
          totalPoints: 0,
          totalPointsRedeemed: 0,
          checkInsCount: 0,
          transactionsCount: 0
        },
        error: error.message
      };
    }
  }

  // 10. GET CUSTOMER GROWTH OVER TIME
  static async getCustomerGrowth(userId: string, days: number = 7) {
    try {
      console.log(`📈 Fetching customer growth for user: ${userId}, last ${days} days`);
      
      const customersRef = collection(db, 'users', userId, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      const customers = customersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || data.timestamp || new Date()
        };
      });

      // Create array for the last N days
      const growthData = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        // Count customers created on this day
        const customersOnDay = customers.filter(customer => {
          let customerDate;
          if (customer.createdAt && customer.createdAt.toDate) {
            customerDate = customer.createdAt.toDate();
          } else if (customer.createdAt) {
            customerDate = new Date(customer.createdAt);
          } else {
            return false;
          }
          return customerDate >= date && customerDate < nextDate;
        });

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        growthData.push({
          date: date.toISOString().split('T')[0],
          dayName: dayNames[date.getDay()],
          count: customersOnDay.length,
          isToday: i === 0
        });
      }

      console.log(`✅ Customer growth data calculated:`, growthData);
      
      return {
        success: true,
        growthData,
        totalCustomers: customers.length,
        error: null
      };
      
    } catch (error: any) {
      console.error('❌ Error fetching customer growth:', error);
      return {
        success: false,
        growthData: [],
        totalCustomers: 0,
        error: error.message
      };
    }
  }

  // 11. BULK IMPORT CUSTOMERS
  static async bulkImportCustomers(userId: string, customers: any[], duplicateHandling: 'skip' | 'update' | 'merge') {
    try {
      console.log(`📥 Bulk importing ${customers.length} customers for user: ${userId}`);
      
      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Get existing customers to check for duplicates
      const existingCustomersRef = collection(db, 'users', userId, 'customers');
      const existingCustomersSnapshot = await getDocs(existingCustomersRef);
      const existingCustomers = new Map();
      
      existingCustomersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const phone = data.phoneNumber || data.phone;
        const email = data.email;
        if (phone) existingCustomers.set(phone, { id: doc.id, data });
        if (email) existingCustomers.set(email, { id: doc.id, data });
      });

      // Process customers in batches
      const batchSize = 500;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchCustomers = customers.slice(i, i + batchSize);
        
        for (const customerData of batchCustomers) {
          try {
            const phone = customerData.phoneNumber;
            const email = customerData.email;
            
            // Check for duplicates
            const existingByPhone = phone ? existingCustomers.get(phone) : null;
            const existingByEmail = email ? existingCustomers.get(email) : null;
            const existing = existingByPhone || existingByEmail;
            
            if (existing) {
              if (duplicateHandling === 'skip') {
                skippedCount++;
                continue;
              } else if (duplicateHandling === 'update') {
                // Update existing customer
                const customerRef = doc(db, 'users', userId, 'customers', existing.id);
                batch.update(customerRef, {
                  ...customerData,
                  updatedAt: serverTimestamp()
                });
                importedCount++;
              } else if (duplicateHandling === 'merge') {
                // Merge data (keep existing data, add new fields)
                const customerRef = doc(db, 'users', userId, 'customers', existing.id);
                const mergedData = {
                  ...existing.data,
                  ...customerData,
                  totalPoints: Math.max(existing.data.totalPoints || 0, customerData.totalPoints || 0),
                  updatedAt: serverTimestamp()
                };
                batch.update(customerRef, mergedData);
                importedCount++;
              }
            } else {
              // Create new customer
              const customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const customerRef = doc(db, 'users', userId, 'customers', customerId);
              
              const newCustomerData = {
                ...customerData,
                customerId,
                createdAt: customerData.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              
              batch.set(customerRef, newCustomerData);
              importedCount++;
            }
          } catch (error: any) {
            console.error('Error processing customer:', error);
            errors.push(`Customer ${customerData.name || customerData.email || 'unknown'}: ${error.message}`);
            errorCount++;
          }
        }
        
        // Commit this batch
        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} imported successfully`);
      }

      console.log(`✅ Bulk import completed: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors`);
      
      return {
        success: true,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        errorDetails: errors,
        message: `Import completed: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors`
      };
      
    } catch (error: any) {
      console.error('❌ Bulk import error:', error);
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: customers.length,
        errorDetails: [error.message],
        message: 'Bulk import failed'
      };
    }
  }
}

export default AuthService;
