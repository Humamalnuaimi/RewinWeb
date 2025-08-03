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

// Delete user with complete data cleanup
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`Starting complete deletion for user: ${userId}`);
    
    // 1. Get user info before deletion for backup
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
      console.log('User not found in Auth, proceeding with Firestore cleanup');
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
    
    // 3. Create backup/export (optional - can be enabled later)
    // const backupData = {
    //   userInfo,
    //   dataSummary,
    //   timestamp: new Date().toISOString()
    // };
    // await admin.firestore().collection('deleted_users_backup').doc(userId).set(backupData);
    
    // 4. Delete Auth user
    if (userInfo) {
      await admin.auth().deleteUser(userId);
      console.log('Auth user deleted successfully');
    }
    
    // 5. Delete all subcollections with batch operations
    const collections = [
      'web_customers', 
      'web_transactions', 
      'customers', 
      'transactions', 
      'outlets',
      'web_visits'
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
    
    // 6. Delete user document
    await admin.firestore().collection('users').doc(userId).delete();
    console.log('User document deleted successfully');
    
    // 7. Prepare response with deletion summary
    const deletionSummary = {
      userInfo,
      dataSummary,
      totalDeleted,
      collectionsCleaned: collections.filter(col => dataSummary[col] > 0 || col === 'outlets' || col === 'web_visits'),
      timestamp: new Date().toISOString()
    };
    
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

// Create new user
router.post('/', [
  body('email').isEmail().normalizeEmail(),
  body('displayName').isLength({ min: 1 }).trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { email, displayName, password } = req.body;
    
    console.log('Create user request:', { email, displayName });
    
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      displayName,
      password,
      emailVerified: false
    });
    
    console.log('User created successfully:', userRecord.uid);
    
    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime
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

module.exports = router; 