// FEATURE: Firebase Configuration
// FILE: firebase.service.ts
// PURPOSE: Firebase initialization and Google Auth configuration
// LAST MODIFIED: January 28, 2025

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, type User, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential, GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
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

  // Get user count for dashboard
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

  // 6. GET SINGLE USER BY ID
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

  // 7. GET USER'S CUSTOMERS
  static async getUserCustomers(userId: string) {
    try {
      console.log(`👥 Fetching customers for user: ${userId}`);
      
      const customersRef = collection(db, 'users', userId, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      const customers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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

  // 8. GET USER'S OUTLETS
  static async getUserOutlets(userId: string) {
    try {
      console.log(`🏪 Fetching outlets for user: ${userId}`);
      
      const outletsRef = collection(db, 'users', userId, 'outlets');
      const outletsSnapshot = await getDocs(outletsRef);
      
      const outlets = outletsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
      
      console.log(`✅ Analytics calculated for user ${userId}:`, {
        customersCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPointsEarned,
        totalPointsRedeemed,
        checkInsCount,
        transactionsCount: filteredTransactions.length
      });
      
      return {
        success: true,
        analytics: {
          customersCount,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalPoints: totalPointsEarned,
          totalPointsRedeemed,
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
}

export default AuthService;
