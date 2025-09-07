import React, { useState, useEffect } from 'react';
import { auth, firestore, database } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';

// Icon components
  const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  );

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );

const DollarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
    </svg>
  );

const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  );

const PersonAddIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  );

const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
    </svg>
  );

const CrownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8l3 4h2l-3 4-3-4H7l3-4z"/>
    </svg>
  );

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'accounts' | 'userBusinesses'>('dashboard');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [outletCount, setOutletCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentPage === 'accounts') {
      loadUsers();
    }
    const unsubscribeOutlets = loadOutlets();

    return () => {
      if (unsubscribeOutlets) {
      unsubscribeOutlets();
      }
    };
  }, [currentPage]);

  const loadOutlets = () => {
    console.log('🏪 Loading outlets from Realtime Database...');
    console.log('🔍 Using root /outlets path');
    
    // Use root outlets path instead of user-specific paths
    const outletsRef = ref(database, 'outlets');
    
    const unsubscribe = onValue(outletsRef, (snapshot) => {
      console.log('📊 Snapshot exists:', snapshot.exists());
      console.log('📊 Snapshot key:', snapshot.key);
      console.log('📊 Snapshot value:', snapshot.val());
      
      const outletsData = snapshot.val();
      if (outletsData) {
        console.log('✅ Raw outlets data:', outletsData);
        const outletsList = Object.keys(outletsData).map(key => ({
          id: key,
          ...outletsData[key]
        }));
        setOutlets(outletsList);
        setOutletCount(outletsList.length);
        console.log('✅ Loaded all outlets:', outletsList);
        console.log('📊 Total outlets count:', outletsList.length);
        console.log('🏪 Outlet names:', outletsList.map(outlet => outlet.name || outlet.outletName || `Outlet ${outlet.id}`));
    } else {
        setOutlets([]);
        setOutletCount(0);
        console.log('❌ No outlets found in root /outlets path');
        console.log('🔍 This could mean:');
        console.log('   - The path /outlets does not exist');
        console.log('   - The outlets are stored in a different path');
        console.log('   - Security rules are blocking access');
      }
    }, (error) => {
      console.error('❌ Error loading outlets:', error);
      console.error('🔍 Error details:', error instanceof Error ? error.message : String(error));
      setOutlets([]);
      setOutletCount(0);
    });
    
    return unsubscribe;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading users...');
      // For now, we'll use a combination of known users and try to fetch from Firebase
      // In a real admin dashboard, you'd use Firebase Admin SDK to list all users
      const knownUsers = [
        {
          uid: 'jW94RyPlFBfGiw06RBpvikfy6zQ2',
          email: 'alnuaimi.humam@gmail.com',
          displayName: 'Humam Al-Nuaimi',
          createdAt: new Date('2025-07-19'),
          lastSignIn: new Date('2025-07-23')
        },
        {
          uid: 'TRaP0sWcL5eC4lbWqZKEklejlX93',
          email: 'sicario0o0o@gmail.com',
          displayName: 'sicario0o0o',
          createdAt: new Date('2025-07-10'),
          lastSignIn: new Date('2025-07-23')
        },
        {
          uid: 'GsPOjjTOUAXWIRi5tUrnB9wH',
          email: 'humam@gmail.com',
          displayName: 'humam',
          createdAt: new Date('2025-07-12'),
          lastSignIn: new Date('2025-07-14')
        }
      ];
      
      // Try to get current user info to add to the list
      const currentUser = auth.currentUser;
      console.log('👤 Current user:', currentUser);
      
      if (currentUser && !knownUsers.find(u => u.uid === currentUser.uid)) {
        console.log('➕ Adding current user to list');
        knownUsers.push({
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email || 'Unknown User',
          createdAt: new Date(currentUser.metadata.creationTime || Date.now()),
          lastSignIn: new Date(currentUser.metadata.lastSignInTime || Date.now())
        });
      }
      
      setUsers(knownUsers);
      console.log('✅ Loaded users:', knownUsers);
      console.log('📊 Total users count:', knownUsers.length);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserBusinesses = async (userId: string) => {
    setLoading(true);
    try {
      console.log('🏪 Loading outlets for user:', userId);
      console.log('🔍 Using Firestore path: /users/{userId}/outlets');
      
      // Get the selected user details
      const selectedUser = users.find(user => user.uid === userId);
      if (selectedUser) {
        console.log('🔍 User email:', selectedUser.email);
        console.log('🔍 User UID:', selectedUser.uid);
        
        // Try the debug function for ALL users, not just sicario0o0o@gmail.com
        console.log('🔍 Checking multiple paths for user:', selectedUser.email);
        const outletsList = await checkMultiplePathsForUser(selectedUser.email);
        if (outletsList.length > 0) {
          setUserBusinesses(outletsList);
          console.log('✅ Loaded outlets from multiple path check:', outletsList);
      return;
        }
      }
      
      // Fallback to standard Firestore path if debug didn't find anything
      console.log('🔍 No outlets found via debug, trying standard Firestore path...');
      const outletsRef = collection(firestore, 'users', userId, 'outlets');
      
      console.log('📊 Checking if collection exists...');
      const querySnapshot = await getDocs(outletsRef);
      
      console.log('📊 Query snapshot size:', querySnapshot.size);
      console.log('📊 Query snapshot empty:', querySnapshot.empty);
      
      const outletsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Raw outlets data:', outletsList);
      console.log('📊 Number of outlets found:', outletsList.length);
      
      setUserBusinesses(outletsList);
      console.log('✅ Loaded outlets from Firestore:', outletsList);
      console.log('🏪 Outlet names:', outletsList.map(outlet => (outlet as any).name || (outlet as any).outletName || `Outlet ${outlet.id}`));
    } catch (error) {
      console.error('❌ Error loading outlets:', error);
      console.error('🔍 Error details:', error instanceof Error ? error.message : String(error));
      setUserBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: any) => {
    setSelectedUser(user);
    await loadUserBusinesses(user.uid);
    setCurrentPage('userBusinesses');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCardClick = (page: 'dashboard' | 'accounts' | 'userBusinesses') => {
    setCurrentPage(page);
  };

  const checkFirebasePaths = () => {
    console.log('🔍 Checking Firebase database structure...');
    
    // Check users level
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      console.log('📊 Users level data:', snapshot.val());
    }, { onlyOnce: true });
    
    // Check outlets level (if it exists at root)
    const outletsRef = ref(database, 'outlets');
    onValue(outletsRef, (snapshot) => {
      console.log('📊 Root outlets data:', snapshot.val());
    }, { onlyOnce: true });
  };

  const checkDatabaseStructure = () => {
    console.log('🔍 Checking complete Firebase database structure...');
    
    // Check all possible paths
    const pathsToCheck = [
      'users',
      'outlets', 
      'customers',
      'businesses',
      'accounts',
      'data',
      'app',
      'rewin'
    ];
    
    pathsToCheck.forEach(path => {
      const pathRef = ref(database, path);
      onValue(pathRef, (snapshot) => {
        console.log(`📊 Path "/${path}":`, {
          exists: snapshot.exists(),
          key: snapshot.key,
          value: snapshot.val(),
          hasChildren: snapshot.hasChildren()
        });
      }, { onlyOnce: true });
    });
  };

  const checkMultiplePathsForUser = async (email: string) => {
    console.log('🔍 Checking multiple paths for user:', email);
    
    // Generate possible user IDs based on the email
    const emailParts = email.split('@')[0]; // Get part before @
    const possibleUserIds = [
      // Try the actual user ID from the users list first
      ...users.filter(user => user.email === email).map(user => user.uid),
      // Try common variations based on email
      emailParts,
      emailParts.replace(/[^a-zA-Z0-9]/g, ''), // Remove special characters
      emailParts.toLowerCase(),
      emailParts.toUpperCase(),
      // Try some common patterns
      'user1',
      'test',
      'admin',
      'demo'
    ];
    
    console.log('🔍 Generated possible user IDs:', possibleUserIds);
    
    // FIRST: Check user-specific paths (highest priority)
    const userSpecificPaths = [
      // Standard user-specific paths
      ...possibleUserIds.map(uid => `users/${uid}/outlets`),
      // Alternative paths that might exist
      ...possibleUserIds.map(uid => `users/${uid}/businesses`),
      ...possibleUserIds.map(uid => `users/${uid}/stores`),
      ...possibleUserIds.map(uid => `users/${uid}/locations`),
      // Email-based paths
      `users/${email}/outlets`,
      `users/${email}/businesses`
    ];
    
    console.log('🔍 Checking user-specific paths first:', userSpecificPaths);
    
    for (const path of userSpecificPaths) {
      try {
        console.log(`🔍 Checking user-specific path: ${path}`);
        const pathParts = path.split('/') as [string, ...string[]];
        const outletsRef = collection(firestore, ...pathParts);
        const querySnapshot = await getDocs(outletsRef);
        
        console.log(`📊 User-specific path ${path}: ${querySnapshot.size} documents found`);
        
        if (querySnapshot.size > 0) {
          console.log(`✅ Found user-specific outlets in path: ${path}`);
          const outletsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('🏪 User-specific outlet names:', outletsList.map(outlet => (outlet as any).name || (outlet as any).outletName || (outlet as any).businessName || `Outlet ${outlet.id}`));
          return outletsList;
        }
    } catch (error) {
        console.log(`❌ Error checking user-specific path ${path}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
            // SECOND: If no user-specific outlets found, try to filter businesses by owner
        try {
          console.log('🔍 No user-specific outlets found. Checking businesses collection and filtering by owner...');
          const businessesRef = collection(firestore, 'businesses');
          const querySnapshot = await getDocs(businessesRef);
          
          console.log(`📊 Total businesses found: ${querySnapshot.size}`);
          
          if (querySnapshot.size > 0) {
            const allBusinesses = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Log all businesses for debugging
            console.log('🔍 All businesses data:', allBusinesses.map(business => ({
              id: business.id,
              name: (business as any).name,
              ownerId: (business as any).ownerId,
              email: (business as any).email,
              type: (business as any).type,
              outletName: (business as any).outletName,
              businessName: (business as any).businessName,
              isOutlet: (business as any).isOutlet,
              category: (business as any).category,
              status: (business as any).status
            })));
            
            // Filter businesses that belong to this specific user
            const userBusinesses = allBusinesses.filter(business => {
              const ownerId = (business as any).ownerId;
              const ownerEmail = (business as any).email;
              
              console.log(`🔍 Checking business ${business.id}: ownerId=${ownerId}, ownerEmail=${ownerEmail}`);
              
              // Check if this business belongs to the user
              const isOwnerMatch = ownerId && possibleUserIds.includes(ownerId);
              const isEmailMatch = ownerEmail && ownerEmail === email;
              
              console.log(`🔍 Business ${business.id}: isOwnerMatch=${isOwnerMatch}, isEmailMatch=${isEmailMatch}`);
              
              return isOwnerMatch || isEmailMatch;
            });
            
            console.log(`📊 User-specific businesses found: ${userBusinesses.length}`);
            
            if (userBusinesses.length > 0) {
              console.log('✅ Found user-specific businesses');
              console.log('🏪 User business names:', userBusinesses.map(business => (business as any).name || `Business ${business.id}`));
              
              // Check if any of these businesses have specific outlet names
              const businessesWithSpecificNames = userBusinesses.filter(business => {
                const name = (business as any).name;
                const outletName = (business as any).outletName;
                const businessName = (business as any).businessName;
                
                // Check if this business has a specific name (not generic)
                const hasSpecificName = (name && name !== 'sicario0o0o\'s Business') ||
                                      (outletName && outletName !== 'sicario0o0o\'s Business') ||
                                      (businessName && businessName !== 'sicario0o0o\'s Business');
                
                console.log(`🔍 Business ${business.id}: hasSpecificName=${hasSpecificName}, name=${name}, outletName=${outletName}, businessName=${businessName}`);
                
                return hasSpecificName;
              });
              
              if (businessesWithSpecificNames.length > 0) {
                console.log('✅ Found businesses with specific names');
                console.log('🏪 Specific business names:', businessesWithSpecificNames.map(business => (business as any).name || (business as any).outletName || (business as any).businessName || `Business ${business.id}`));
                return businessesWithSpecificNames;
              }
              
              // If no specific names found, continue to check alternative collections
              console.log('⚠️ No specific names found in businesses, continuing to check alternative collections...');
            }
          }
        } catch (error) {
          console.log(`❌ Error checking businesses collection:`, error instanceof Error ? error.message : String(error));
        }
        
        // THIRD: Try to find outlets in a different collection or path
        try {
          console.log('🔍 Trying alternative outlet paths...');
          
          // Try different possible collections for outlets
          const alternativePaths = [
            'outlets',
            'stores', 
            'locations',
            'restaurants',
            'businesses'
          ];
          
          for (const collectionName of alternativePaths) {
            try {
              console.log(`🔍 Checking collection: ${collectionName}`);
              const altRef = collection(firestore, collectionName);
              const altSnapshot = await getDocs(altRef);
              
              console.log(`📊 ${collectionName} collection: ${altSnapshot.size} documents found`);
              
              if (altSnapshot.size > 0) {
                const altDocs = altSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }));
                
                // Log first few documents to see structure
                console.log(`🔍 First 3 ${collectionName} documents:`, altDocs.slice(0, 3).map(doc => ({
                  id: doc.id,
                  name: (doc as any).name,
                  outletName: (doc as any).outletName,
                  businessName: (doc as any).businessName,
                  ownerId: (doc as any).ownerId,
                  email: (doc as any).email,
                  type: (doc as any).type
                })));
                
                // Filter by user
                const userDocs = altDocs.filter(doc => {
                  const ownerId = (doc as any).ownerId;
                  const ownerEmail = (doc as any).email;
                  const isOwnerMatch = ownerId && possibleUserIds.includes(ownerId);
                  const isEmailMatch = ownerEmail && ownerEmail === email;
                  return isOwnerMatch || isEmailMatch;
                });
                
                console.log(`📊 User-specific ${collectionName} found: ${userDocs.length}`);
                
                if (userDocs.length > 0) {
                  console.log(`✅ Found user-specific ${collectionName}`);
                  console.log(`🏪 ${collectionName} names:`, userDocs.map(doc => (doc as any).name || (doc as any).outletName || (doc as any).businessName || `${collectionName} ${doc.id}`));
                  return userDocs;
                }
              }
            } catch (error) {
              console.log(`❌ Error checking ${collectionName} collection:`, error instanceof Error ? error.message : String(error));
            }
          }
        } catch (error) {
          console.log(`❌ Error checking alternative paths:`, error instanceof Error ? error.message : String(error));
        }
    
    console.log('❌ No user-specific outlets found');
    return [];
  };

  if (currentPage === 'userBusinesses') {
  return (
    <div style={{
        minHeight: '100vh',
      background: 'transparent',
        padding: '20px'
    }}>
      {/* Header */}
      <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        padding: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
              width: '40px',
              height: '40px',
              background: '#dc2626',
              borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              R
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                Rewin Dashboard
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Loyalty Program Management
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
              onClick={() => handleCardClick('accounts')}
            style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
                fontSize: '14px'
            }}
          >
              ← Back to Users
          </button>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
              Welcome back, {user?.email}
        </div>
          <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                background: 'rgba(220, 38, 38, 0.8)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Sign Out
          </button>
        </div>
      </div>

        {/* User Businesses Page Content */}
      <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {selectedUser?.displayName || selectedUser?.email}'s Outlets
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Manage all outlet accounts for this user
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ color: 'white', fontSize: '18px' }}>Loading businesses...</div>
      </div>
          ) : (
            <div>
              {/* User Info */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '24px'
              }}>
                <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '20px' }}>
                  User Information
                </h3>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '8px' }}>
                  <strong style={{ color: 'white' }}>Email:</strong> {selectedUser?.email}
    </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '8px' }}>
                  <strong style={{ color: 'white' }}>User ID:</strong> {selectedUser?.uid}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', marginBottom: '8px' }}>
                  <strong style={{ color: 'white' }}>Total Outlets:</strong> {userBusinesses.length}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  Showing all outlets in the system
                </div>
              </div>

              {/* Businesses List */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {userBusinesses.map((business) => (
                  <div key={business.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                          {business.name || business.outletName || 'Unnamed Outlet'}
                        </h4>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>
                          Outlet ID: {business.id}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>
                          Type: {business.type || 'Unknown'}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                          Status: {business.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: business.isActive ? '#10b981' : '#6b7280',
                        borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {business.isActive ? '✓' : '○'}
      </div>
    </div>

                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          Created: {business.createdAt ? 
                            (business.createdAt.toDate ? 
                              business.createdAt.toDate().toLocaleDateString() : 
                              new Date(business.createdAt).toLocaleDateString()
                            ) : 'Unknown'}
                        </span>
                        {business.settings && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.8)'
                          }}>
                            Has Settings
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {userBusinesses.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '16px'
                }}>
                  This user has no outlet accounts yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentPage === 'accounts') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'transparent',
        padding: '20px'
      }}>
        {/* Header */}
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
          marginBottom: '40px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#dc2626',
          borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              R
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                Rewin Dashboard
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Loyalty Program Management
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
              onClick={() => handleCardClick('dashboard')}
          style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
                fontSize: '14px'
          }}
        >
              ← Back to Dashboard
        </button>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
              Welcome back, {user?.email}
            </div>
          <button
              onClick={handleSignOut}
            style={{
                padding: '8px 16px',
                background: 'rgba(220, 38, 38, 0.8)',
              border: 'none',
              borderRadius: '6px',
                color: 'white',
              cursor: 'pointer',
                fontSize: '14px'
            }}
          >
              Sign Out
          </button>
      </div>
    </div>

        {/* Users Page Content */}
    <div style={{ 
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              User Accounts (Updated: {new Date().toLocaleTimeString()})
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Manage all user accounts and their associated businesses
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ color: 'white', fontSize: '18px' }}>Loading users...</div>
            </div>
          ) : (
            <div>
              {/* Users Summary */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '24px'
              }}>
                <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '20px' }}>
                  Users Overview
                </h3>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
                  Total Users: <strong style={{ color: 'white' }}>{users.length}</strong>
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '8px' }}>
                  Note: This shows known users. New users will appear here after they sign in.
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '4px' }}>
                  Current user: {auth.currentUser?.email || 'Not signed in'}
                </div>
              </div>

              {/* Users List */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {users.map((user) => (
                  <div 
                    key={user.uid} 
                    onClick={() => handleUserClick(user)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '18px', fontWeight: 'bold' }}>
                          {user.displayName || user.email}
                          {user.uid === auth.currentUser?.uid && (
                            <span style={{ 
                              marginLeft: '8px', 
                              background: '#dc2626', 
                      color: 'white',
                              padding: '2px 6px', 
                      borderRadius: '4px',
                              fontSize: '12px' 
                            }}>
                              YOU
                            </span>
                          )}
                        </h4>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>
                          Email: {user.email}
                </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>
                          User ID: {user.uid}
    </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>
                          Created: {user.createdAt.toLocaleDateString()}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                          Last Sign In: {user.lastSignIn.toLocaleDateString()}
                        </div>
                      </div>
      <div style={{
                        width: '40px',
                        height: '40px',
                        background: '#10b981',
                        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          Click to view businesses →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '16px'
                }}>
                  No users found in the database.
          </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#dc2626',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            R
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
              Rewin Dashboard
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Loyalty Program Management
            </div>
          </div>
          </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
            color: 'white',
                fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🏠</span>
            All Outlets ({outletCount})
            <span>▼</span>
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Welcome back, {user?.email}
          </div>
            <button
            onClick={handleSignOut}
              style={{
              padding: '8px 16px',
              background: 'rgba(220, 38, 38, 0.8)',
                border: 'none',
                borderRadius: '6px',
              color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
            Sign Out
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            All Outlets (Admin View)
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.7)' }}>
            View all outlet accounts in the system
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '400px',
          marginBottom: '24px'
        }}>
          {/* Accounts */}
          <div 
            onClick={() => handleCardClick('accounts')}
              style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '24px',
              border: '2px solid #dc2626',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
                cursor: 'pointer',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
                  USERS
          </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  {users.length}
        </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  User accounts • Click to manage →
      </div>
  </div>
              <div style={{ color: '#dc2626' }}>
                <UsersIcon />
              </div>
            </div>
          </div>

          {/* Total Points */}
      <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
            border: '2px solid #f59e0b',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                  TOTAL POINTS
        </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  0
          </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  All outlets • Click to view details →
                </div>
              </div>
              <div style={{ color: '#f59e0b' }}>
                <StarIcon />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
            <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #10b981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                  TOTAL REVENUE
            </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  $0
          </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  All outlets
                </div>
              </div>
              <div style={{ color: '#10b981' }}>
                <DollarIcon />
              </div>
            </div>
      </div>

          {/* Check-ins Today */}
      <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
            border: '2px solid #8b5cf6',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '8px' }}>
                  CHECK-INS TODAY
        </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  0
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  All outlets • Click to view details →
                </div>
              </div>
              <div style={{ color: '#8b5cf6' }}>
                <BookIcon />
              </div>
            </div>
          </div>

          {/* New Signups Today */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #ec4899',
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ec4899', marginBottom: '8px' }}>
                  NEW SIGNUPS TODAY
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  0
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  All outlets • Click to view details →
                </div>
              </div>
              <div style={{ color: '#ec4899' }}>
                <PersonAddIcon />
              </div>
      </div>
    </div>

          {/* Active Outlets */}
        <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #06b6d4',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#06b6d4', marginBottom: '8px' }}>
                  ACTIVE OUTLETS
        </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  {outletCount}
      </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Click to manage outlets →
  </div>
              </div>
              <div style={{ color: '#06b6d4' }}>
                <BuildingIcon />
              </div>
            </div>
          </div>

          {/* Rewards System */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #10b981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                  3-TIER
        </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Campaigns • Promotions • Points →
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
              </div>
            </div>
    </div>

          {/* Admin Panel */}
      <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #f59e0b',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                  ADMIN
      </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Manage users & settings →
                </div>
              </div>
              <div style={{ color: '#f59e0b' }}>
                <CrownIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
);
};

export default AdminDashboard; 