const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Get system health and status
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      firebase: {
        auth: 'connected',
        firestore: 'connected'
      }
    };

    // Test Firebase connections
    try {
      await admin.auth().listUsers(1);
    } catch (error) {
      health.firebase.auth = 'error';
      health.status = 'degraded';
    }

    try {
      await admin.firestore().collection('users').limit(1).get();
    } catch (error) {
      health.firebase.firestore = 'error';
      health.status = 'degraded';
    }

    res.json({
      success: true,
      health
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      success: false,
      health: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    // Get Firebase usage statistics
    const listUsersResult = await admin.auth().listUsers();
    const totalUsers = listUsersResult.users.length;

    // Count total documents across all collections
    let totalDocuments = 0;
    let totalCustomers = 0;
    let totalTransactions = 0;
    let totalOutlets = 0;

    const usersSnapshot = await admin.firestore().collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Count customers
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();
      totalCustomers += customersSnapshot.size;

      // Count outlets
      const outletsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('outlets').get();
      totalOutlets += outletsSnapshot.size;

      // Count transactions
      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions').get();
      totalTransactions += transactionsSnapshot.size;
    }

    totalDocuments = totalCustomers + totalTransactions + totalOutlets + totalUsers;

    // Calculate storage estimates (rough estimates)
    const estimatedStorage = {
      users: totalUsers * 1024, // ~1KB per user
      customers: totalCustomers * 2048, // ~2KB per customer
      transactions: totalTransactions * 1536, // ~1.5KB per transaction
      outlets: totalOutlets * 1024, // ~1KB per outlet
      total: (totalUsers * 1024) + (totalCustomers * 2048) + (totalTransactions * 1536) + (totalOutlets * 1024)
    };

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalTransactions,
        totalOutlets,
        totalDocuments,
        estimatedStorage: {
          users: `${(estimatedStorage.users / 1024 / 1024).toFixed(2)} MB`,
          customers: `${(estimatedStorage.customers / 1024 / 1024).toFixed(2)} MB`,
          transactions: `${(estimatedStorage.transactions / 1024 / 1024).toFixed(2)} MB`,
          outlets: `${(estimatedStorage.outlets / 1024 / 1024).toFixed(2)} MB`,
          total: `${(estimatedStorage.total / 1024 / 1024).toFixed(2)} MB`
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version
        }
      }
    });

  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ error: 'Failed to get system statistics' });
  }
});

// Get Firebase usage and costs (estimated)
router.get('/firebase-usage', async (req, res) => {
  try {
    // Get all users
    const listUsersResult = await admin.auth().listUsers();
    const totalUsers = listUsersResult.users.length;

    // Count all documents
    let totalReads = 0;
    let totalWrites = 0;
    let totalCustomers = 0;
    let totalTransactions = 0;
    let totalOutlets = 0;

    const usersSnapshot = await admin.firestore().collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Count customers
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();
      totalCustomers += customersSnapshot.size;

      // Count outlets
      const outletsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('outlets').get();
      totalOutlets += outletsSnapshot.size;

      // Count transactions
      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions').get();
      totalTransactions += transactionsSnapshot.size;
    }

    // Estimate reads and writes (this is a rough estimate)
    totalReads = totalUsers + totalCustomers + totalTransactions + totalOutlets;
    totalWrites = Math.floor(totalReads * 0.3); // Assume 30% of reads are writes

    // Estimate costs (Firebase pricing as of 2024)
    const costs = {
      auth: {
        users: totalUsers,
        cost: totalUsers * 0.01 // $0.01 per user per month
      },
      firestore: {
        reads: totalReads,
        writes: totalWrites,
        storage: (totalCustomers + totalTransactions + totalOutlets) * 0.000001, // 1KB per document
        readCost: totalReads * 0.00006, // $0.06 per 100K reads
        writeCost: totalWrites * 0.00018, // $0.18 per 100K writes
        storageCost: ((totalCustomers + totalTransactions + totalOutlets) * 0.000001) * 0.18 // $0.18 per GB
      }
    };

    const totalCost = costs.auth.cost + costs.firestore.readCost + costs.firestore.writeCost + costs.firestore.storageCost;

    res.json({
      success: true,
      usage: {
        auth: {
          totalUsers,
          estimatedCost: `$${costs.auth.cost.toFixed(2)}/month`
        },
        firestore: {
          totalReads,
          totalWrites,
          totalStorage: `${costs.firestore.storage.toFixed(2)} GB`,
          readCost: `$${costs.firestore.readCost.toFixed(2)}/month`,
          writeCost: `$${costs.firestore.writeCost.toFixed(2)}/month`,
          storageCost: `$${costs.firestore.storageCost.toFixed(2)}/month`
        },
        total: {
          estimatedCost: `$${totalCost.toFixed(2)}/month`
        }
      }
    });

  } catch (error) {
    console.error('Firebase usage error:', error);
    res.status(500).json({ error: 'Failed to get Firebase usage' });
  }
});

// System backup (export all data)
router.post('/backup', async (req, res) => {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      users: [],
      customers: [],
      transactions: [],
      outlets: []
    };

    // Get all users
    const listUsersResult = await admin.auth().listUsers();
    backupData.users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime
    }));

    // Get all data from Firestore
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Get customers
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();
      
      customersSnapshot.docs.forEach(doc => {
        backupData.customers.push({
          id: doc.id,
          userId: userId,
          ...doc.data()
        });
      });

      // Get outlets
      const outletsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('outlets').get();
      
      outletsSnapshot.docs.forEach(doc => {
        backupData.outlets.push({
          id: doc.id,
          userId: userId,
          ...doc.data()
        });
      });

      // Get transactions
      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions').get();
      
      transactionsSnapshot.docs.forEach(doc => {
        backupData.transactions.push({
          id: doc.id,
          userId: userId,
          ...doc.data()
        });
      });
    }

    res.json({
      success: true,
      backup: {
        timestamp: backupData.timestamp,
        summary: {
          users: backupData.users.length,
          customers: backupData.customers.length,
          outlets: backupData.outlets.length,
          transactions: backupData.transactions.length
        },
        data: backupData
      }
    });

  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// System performance monitoring
router.get('/performance', async (req, res) => {
  try {
    const performance = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      firebase: {
        authLatency: 0,
        firestoreLatency: 0
      }
    };

    // Test Firebase performance
    const authStart = Date.now();
    try {
      await admin.auth().listUsers(1);
      performance.firebase.authLatency = Date.now() - authStart;
    } catch (error) {
      performance.firebase.authLatency = -1;
    }

    const firestoreStart = Date.now();
    try {
      await admin.firestore().collection('users').limit(1).get();
      performance.firebase.firestoreLatency = Date.now() - firestoreStart;
    } catch (error) {
      performance.firebase.firestoreLatency = -1;
    }

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Performance monitoring error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

module.exports = router; 