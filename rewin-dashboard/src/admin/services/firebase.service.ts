// FEATURE: Firebase Configuration
// FILE: firebase.service.ts
// PURPOSE: Firebase initialization and Google Auth configuration
// LAST MODIFIED: January 28, 2025

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

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
}

export default AuthService;
