import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

/**
 * Firebase Admin Setup Utility
 * This script helps set up admin authorization in Firebase Firestore
 */

export const setupAdminAuthorization = async (user: any) => {
  console.log('🔧 Setting up admin authorization...');
  
  try {
    // Add admin user to Firestore
    const adminData = {
      uid: user.uid,
      email: user.email,
      role: 'admin',
      permissions: ['read_all', 'write_all', 'manage_users'],
      createdAt: new Date().toISOString()
    };
    
    // Add to admins collection
    await setDoc(doc(firestore, 'admins', user.uid), adminData);
    
    // Add to adminEmails collection (for email-based lookup)
    const emailKey = user.email?.replace('.', ',') || 'unknown';
    await setDoc(doc(firestore, 'adminEmails', emailKey), {
      uid: user.uid,
      email: user.email,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    
    console.log('✅ Admin authorization setup complete');
    return true;
  } catch (error) {
    console.error('❌ Admin setup failed:', error);
    return false;
  }
};

export const checkAdminStatus = async (user: any) => {
  try {
    // Check if user is in admins collection
    const adminDoc = await getDoc(doc(firestore, 'admins', user.uid));
    if (adminDoc.exists()) {
      return true;
    }
    
    // Check if user email is in adminEmails collection
    const emailKey = user.email?.replace('.', ',') || 'unknown';
    const emailDoc = await getDoc(doc(firestore, 'adminEmails', emailKey));
    if (emailDoc.exists()) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Admin status check failed:', error);
    return false;
  }
};

export const getSecurityRulesTemplate = () => {
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to access their own data
    match /users/{userId}/{collection}/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow admin access to all data (for admin dashboard)
    match /{document=**} {
      allow read, write: if request.auth != null && 
        (request.auth.token.admin == true || 
         request.auth.token.email in ['alnuaimi.humam@gmail.com', 'admin@rewin.com']);
    }
    
    // Allow access to business collections for promotions
    match /businesses/{businessId}/{collection}/{document} {
      allow read, write: if request.auth != null;
    }
  }
}`;
}; 