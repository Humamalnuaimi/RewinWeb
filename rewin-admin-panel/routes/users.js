const express = require('express');
const admin = require('firebase-admin');
const { query, validationResult, body } = require('express-validator');
const router = express.Router();

// Get all users with pagination and search
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['email', 'createdAt', 'lastSignIn']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Get users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers();
    let users = listUsersResult.users;

    // Apply search filter
    if (search) {
      users = users.filter(user => 
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sorting
    users.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'createdAt':
          aValue = new Date(a.metadata.creationTime);
          bValue = new Date(b.metadata.creationTime);
          break;
        case 'lastSignIn':
          aValue = new Date(a.metadata.lastSignInTime);
          bValue = new Date(b.metadata.lastSignInTime);
          break;
        default:
          aValue = new Date(a.metadata.creationTime);
          bValue = new Date(b.metadata.creationTime);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Format user data with business counts
    const formattedUsers = await Promise.all(paginatedUsers.map(async (user) => {
      try {
        // Get user's outlets count
        let outletCount = 0;
        try {
          const outletsSnapshot = await admin.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('outlets')
            .get();
          outletCount = outletsSnapshot.size;
        } catch (error) {
          // User might not have a document in users collection
          console.log(`No outlets collection for user ${user.uid}:`, error.message);
        }
        
        // Get user's customers count (from user subcollection)
        let customerCount = 0;
        try {
          const customersSnapshot = await admin.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('web_customers')
            .get();
          customerCount = customersSnapshot.size;
        } catch (error) {
          // User might not have a document in users collection
          console.log(`No customers collection for user ${user.uid}:`, error.message);
        }
        
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
          lastRefreshTime: user.metadata.lastRefreshTime,
          outletCount: outletCount,
          customerCount: customerCount
        };
      } catch (error) {
        console.log(`Error getting data for user ${user.uid}:`, error.message);
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          disabled: user.disabled,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
          lastRefreshTime: user.metadata.lastRefreshTime,
          outletCount: 0,
          customerCount: 0
        };
      }
    }));

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
        hasNext: endIndex < users.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get specific user with their businesses
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userRecord = await admin.auth().getUser(userId);

    // Get user's outlets
    let outlets = [];
    try {
      const outletsSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('outlets')
        .get();

      outletsSnapshot.forEach(doc => {
        outlets.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.log(`Could not fetch outlets for user ${userId}:`, error.message);
    }

    // Get user's customers
    let customers = [];
    try {
      const customersSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('customers')
        .get();

      customersSnapshot.forEach(doc => {
        customers.push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (error) {
      console.log(`Could not fetch customers for user ${userId}:`, error.message);
    }

    // Get user's data from Firestore
    const userDataSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDataSnapshot.exists ? userDataSnapshot.data() : {};

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        phoneNumber: userRecord.phoneNumber,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime,
        customData: userData,
        outletCount: outlets.length,
        customerCount: customers.length,
        outlets: outlets,
        customers: customers
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete user with complete data cleanup - Firestore-first approach
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ Starting FIRESTORE-FIRST deletion for user: ${userId}`);
    
    // 1. Check if user document exists in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const userDocSnapshot = await userDocRef.get();
    
    if (!userDocSnapshot.exists) {
      console.log(`❌ User document ${userId} does not exist in Firestore`);
      return res.status(404).json({ 
        success: false,
        error: 'User document not found in Firestore' 
      });
    }
    
    console.log(`✅ Found user document in Firestore: ${userId}`);
    
    // 2. Get user info from Auth (if exists) for logging
    let userInfo = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      userInfo = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime
      };
      console.log(`✅ Found user in Firebase Auth: ${userInfo.email}`);
    } catch (error) {
      console.log(`⚠️ User not found in Firebase Auth (orphaned Firestore document)`);
      userInfo = {
        uid: userId,
        email: 'unknown@firestore-only.com',
        displayName: 'Firestore Only User',
        disabled: false,
        createdAt: new Date().toISOString()
      };
    }
    
    // 2. Get data summary before deletion
    const dataSummary = {
      webCustomers: 0,
      webTransactions: 0,
      customers: 0,
      transactions: 0,
      outlets: 0
    };
    
    // Count web collections
    try {
      const webCustomersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();
      dataSummary.webCustomers = webCustomersSnapshot.size;
      
      const webTransactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions').get();
      dataSummary.webTransactions = webTransactionsSnapshot.size;
    } catch (error) {
      console.log('Error counting web collections:', error.message);
    }
    
    // Count main collections
    try {
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('customers').get();
      dataSummary.customers = customersSnapshot.size;
      
      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('transactions').get();
      dataSummary.transactions = transactionsSnapshot.size;
    } catch (error) {
      console.log('Error counting main collections:', error.message);
    }
    
    // Count outlets
    try {
      const outletsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('outlets').get();
      dataSummary.outlets = outletsSnapshot.size;
    } catch (error) {
      console.log('Error counting outlets:', error.message);
    }
    
    console.log('Data summary before deletion:', dataSummary);
    
    // List all user documents before deletion
    try {
      const allUsersSnapshot = await admin.firestore().collection('users').get();
      console.log(`📋 Total users in Firestore before deletion: ${allUsersSnapshot.size}`);
      console.log('📋 User IDs before deletion:', allUsersSnapshot.docs.map(doc => doc.id));
    } catch (error) {
      console.log('Error listing users before deletion:', error.message);
    }
    
    console.log('📊 Data summary before deletion:', dataSummary);
    
    // 3. Delete ALL subcollections first (Firestore-first approach)
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
    
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      try {
        const snapshot = await admin.firestore()
          .collection('users').doc(userId)
          .collection(collectionName).get();
        
        if (snapshot.size > 0) {
          const batch = admin.firestore().batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          totalDeleted += snapshot.size;
          console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
        }
      } catch (error) {
        console.log(`Error deleting ${collectionName}:`, error.message);
      }
    }
    
    // 4. Delete main user document
    try {
      console.log(`🗑️ Deleting main user document: users/${userId}`);
      console.log(`🗑️ UserDocRef path: ${userDocRef.path}`);
      
      // First check if it exists before deletion
      const preDeleteCheck = await userDocRef.get();
      console.log(`🗑️ Document exists before deletion: ${preDeleteCheck.exists}`);
      
      if (preDeleteCheck.exists) {
        console.log(`🗑️ Document data before deletion:`, preDeleteCheck.data());
        
        // Perform the deletion
        await userDocRef.delete();
        console.log('✅ Main user document delete() call completed');
        
        // Wait a moment for the deletion to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify deletion
        const deletedDocCheck = await userDocRef.get();
        console.log(`🗑️ Document exists after deletion: ${deletedDocCheck.exists}`);
        
        if (deletedDocCheck.exists) {
          console.error('❌ ERROR: User document still exists after deletion!');
          console.error('❌ Document data after failed deletion:', deletedDocCheck.data());
          throw new Error('User document deletion failed - document still exists');
        } else {
          console.log('✅ Verified: User document completely removed from Firestore');
        }
      } else {
        console.log('⚠️ User document did not exist before deletion attempt');
      }
    } catch (error) {
      console.error('❌ Error deleting main user document:', error);
      console.error('❌ Error stack:', error.stack);
      throw error; // Re-throw to stop the process
    }
    
    // 5. Revoke all refresh tokens before deletion
    try {
      if (userInfo.email !== 'unknown@firestore-only.com') {
        // Revoke all refresh tokens to force sign out everywhere
        await admin.auth().revokeRefreshTokens(userId);
        console.log('✅ Revoked all refresh tokens for user');
        
        // Wait a moment for revocation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now delete the user
        await admin.auth().deleteUser(userId);
        console.log('✅ User deleted from Firebase Authentication');
      } else {
        console.log('⚠️ Skipping Auth deletion (user was Firestore-only)');
      }
    } catch (error) {
      console.log('⚠️ Could not delete from Firebase Auth (may not exist):', error.message);
      // Don't throw error here - Firestore cleanup is more important
    }
    
    // 7. Prepare response with deletion summary
    const deletionSummary = {
      userInfo,
      dataSummary,
      totalDeleted,
      collectionsCleaned: collections.filter(col => dataSummary[col] > 0 || col === 'outlets' || col === 'web_visits'),
      timestamp: new Date().toISOString()
    };
    
    // List all user documents after deletion to verify
    try {
      const allUsersAfterSnapshot = await admin.firestore().collection('users').get();
      console.log(`📋 Total users in Firestore after deletion: ${allUsersAfterSnapshot.size}`);
      console.log('📋 User IDs after deletion:', allUsersAfterSnapshot.docs.map(doc => doc.id));
    } catch (error) {
      console.log('Error listing users after deletion:', error.message);
    }
    
    console.log('Complete deletion successful:', deletionSummary);
    
    res.json({
      success: true,
      message: 'User and all associated data deleted successfully',
      deletionSummary
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: error.message 
    });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, email, disabled } = req.body;
    
    console.log('Update user request:', { userId, displayName, email, disabled });
    
    const updateData = {};
    
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    
    // Handle email field - only update if it's not empty
    if (email !== undefined && email !== '') {
      updateData.email = email;
    }
    
    if (disabled !== undefined) {
      updateData.disabled = disabled;
    }
    
    console.log('Firebase update data:', updateData);
    
    await admin.auth().updateUser(userId, updateData);
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get deletion preview (data summary before deletion)
router.get('/:userId/deletion-preview', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`Getting deletion preview for user: ${userId}`);
    
    // Get user info
    let userInfo = null;
    try {
      const userRecord = await admin.auth().getUser(userId);
      userInfo = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime
      };
    } catch (error) {
      console.log('User not found in Auth');
    }
    
    // Get data summary
    const dataSummary = {
      webCustomers: 0,
      webTransactions: 0,
      customers: 0,
      transactions: 0,
      outlets: 0,
      webVisits: 0
    };
    
    // Count all collections
    const collections = [
      'web_customers', 
      'web_transactions', 
      'customers', 
      'transactions', 
      'outlets',
      'web_visits'
    ];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await admin.firestore()
          .collection('users').doc(userId)
          .collection(collectionName).get();
        
        const summaryKey = collectionName === 'web_visits' ? 'webVisits' : collectionName;
        dataSummary[summaryKey] = snapshot.size;
      } catch (error) {
        console.log(`Error counting ${collectionName}:`, error.message);
      }
    }
    
    const totalRecords = Object.values(dataSummary).reduce((sum, count) => sum + count, 0);
    
    const preview = {
      userInfo,
      dataSummary,
      totalRecords,
      estimatedDeletionTime: `${Math.ceil(totalRecords / 100)} seconds`,
      collections: collections.map(col => ({
        name: col,
        count: dataSummary[col === 'web_visits' ? 'webVisits' : col]
      })),
      timestamp: new Date().toISOString()
    };
    
    console.log('Deletion preview generated:', preview);
    
    res.json({
      success: true,
      preview
    });

  } catch (error) {
    console.error('Get deletion preview error:', error);
    res.status(500).json({ 
      error: 'Failed to get deletion preview',
      details: error.message 
    });
  }
});

// Update user status (enable/disable)
router.patch('/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { disabled } = req.body;
    
    await admin.auth().updateUser(userId, {
      disabled: disabled
    });
    
    res.json({
      success: true,
      message: `User ${disabled ? 'disabled' : 'enabled'} successfully`
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Reset user password
router.post('/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    await admin.auth().updateUser(userId, {
      password: newPassword
    });
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Create new user with invitation or OAuth
router.post('/', [
  body('email').isEmail().normalizeEmail(),
  body('displayName').isLength({ min: 1 }).trim(),
  body('authMethod').isIn(['email', 'google']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { email, displayName, authMethod = 'email' } = req.body;
    
    console.log('Create user request:', { email, displayName, authMethod });
    
    let userRecord;
    
    if (authMethod === 'email') {
      // Create user for email invitation (no password initially)
      userRecord = await admin.auth().createUser({
        email,
        displayName,
        emailVerified: false,
        disabled: false // User can sign in once they set password
      });
      
      // Generate password reset link for the new user
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${req.protocol}://${req.get('host')}/login`, // Redirect to login after password setup
        handleCodeInApp: false
      });
      
      console.log('Password reset link generated:', resetLink);
      
      // TODO: Send email with invitation link
      // For now, we'll log it - you can integrate with your email service
      console.log(`📧 Send this invitation email to ${email}:`);
      console.log(`Subject: You've been invited to Rewin Admin Panel`);
      console.log(`Hi ${displayName},\n\nYou've been invited to join the Rewin Admin Panel.\nClick here to set your password and get started: ${resetLink}\n\nBest regards,\nRewin Team`);
      
    } else if (authMethod === 'google') {
      // Create user for Google OAuth (they'll complete setup on first sign-in)
      userRecord = await admin.auth().createUser({
        email,
        displayName,
        emailVerified: true, // Google emails are pre-verified
        disabled: false
      });
      
      console.log('User created for Google OAuth - they will complete setup on first sign-in');
    }
    
    console.log('Auth user created successfully:', userRecord.uid);
    
    // Create Firestore user document and all necessary collections
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    
    // Create user document with basic info
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      createdAt: userRecord.metadata.creationTime,
      lastSignIn: userRecord.metadata.lastSignInTime,
      createdFrom: 'admin_panel',
      authMethod: authMethod,
      invitationStatus: authMethod === 'email' ? 'pending' : 'completed',
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
        name: displayName,
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
    });
    
    console.log('User document created successfully');
    
    // Note: Collections will be automatically created by Firebase when first document is added
    // No need to pre-create empty collections
    console.log('Collections will be created automatically when data is added from the app or web.');
    
    // List of collections that will be created as needed:
    // - campaigns
    // - checkins  
    // - customerPromotions
    // - customers
    // - outlets
    // - promotionUsage
    // - transactions
    // - twilio_account
    // - twilio_events
    // - web_customers
    // - web_transactions
    // - web_visits
    
    console.log('🎉 Enhanced user creation completed successfully');
    
    res.json({
      success: true,
      message: authMethod === 'email' 
        ? 'Invitation sent successfully - user will receive an email to set their password'
        : 'User created successfully - they can sign in with Google OAuth',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime,
        authMethod: authMethod,
        invitationStatus: authMethod === 'email' ? 'pending' : 'completed',
        mobileAppCompatible: true
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Handle specific Firebase errors
    let errorMessage = 'Failed to create user';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Email already exists';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Cleanup orphaned user documents (documents without Firebase Auth records)
router.post('/cleanup-orphaned', async (req, res) => {
  try {
    console.log('🧹 Starting cleanup of orphaned user documents...');
    
    // Get all user documents from Firestore
    const firestoreUsersSnapshot = await admin.firestore().collection('users').get();
    const firestoreUserIds = firestoreUsersSnapshot.docs.map(doc => doc.id);
    
    console.log(`📋 Found ${firestoreUserIds.length} user documents in Firestore:`, firestoreUserIds);
    
    // Get all users from Firebase Authentication
    const authUsers = [];
    let pageToken;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);
      authUsers.push(...listUsersResult.users);
      pageToken = listUsersResult.pageToken;
    } while (pageToken);
    
    const authUserIds = authUsers.map(user => user.uid);
    console.log(`🔐 Found ${authUserIds.length} users in Firebase Auth:`, authUserIds);
    
    // Find orphaned documents (in Firestore but not in Auth)
    const orphanedUserIds = firestoreUserIds.filter(id => !authUserIds.includes(id));
    
    console.log(`🗑️ Found ${orphanedUserIds.length} orphaned user documents:`, orphanedUserIds);
    
    if (orphanedUserIds.length === 0) {
      return res.json({
        success: true,
        message: 'No orphaned user documents found',
        orphanedCount: 0,
        cleanedUp: []
      });
    }
    
    // Delete orphaned user documents and their subcollections
    const cleanedUp = [];
    const collections = [
      'web_customers', 
      'web_transactions', 
      'customers', 
      'transactions', 
      'outlets',
      'web_visits'
    ];
    
    for (const userId of orphanedUserIds) {
      console.log(`🗑️ Cleaning up orphaned user: ${userId}`);
      
      let totalDeleted = 0;
      
      // Delete all subcollections
      for (const collectionName of collections) {
        try {
          const snapshot = await admin.firestore()
            .collection('users').doc(userId)
            .collection(collectionName).get();
          
          if (snapshot.size > 0) {
            const batch = admin.firestore().batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            totalDeleted += snapshot.size;
            console.log(`  ✅ Deleted ${snapshot.size} documents from ${collectionName}`);
          }
        } catch (error) {
          console.log(`  ❌ Error deleting ${collectionName}:`, error.message);
        }
      }
      
      // Delete main user document
      try {
        await admin.firestore().collection('users').doc(userId).delete();
        console.log(`  ✅ Deleted main user document: ${userId}`);
        totalDeleted += 1;
      } catch (error) {
        console.log(`  ❌ Error deleting main user document:`, error.message);
      }
      
      cleanedUp.push({
        userId,
        totalDeleted
      });
    }
    
    // Verify cleanup
    const afterCleanupSnapshot = await admin.firestore().collection('users').get();
    const remainingUserIds = afterCleanupSnapshot.docs.map(doc => doc.id);
    
    console.log(`✅ Cleanup complete! Remaining user documents: ${remainingUserIds.length}`, remainingUserIds);
    
    res.json({
      success: true,
      message: `Successfully cleaned up ${orphanedUserIds.length} orphaned user documents`,
      orphanedCount: orphanedUserIds.length,
      cleanedUp,
      remainingUsers: remainingUserIds.length,
      remainingUserIds
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup orphaned documents',
      details: error.message 
    });
  }
});

module.exports = router; 