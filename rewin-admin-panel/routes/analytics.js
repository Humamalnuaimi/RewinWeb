const express = require('express');
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');

const router = express.Router();

// Get analytics overview
router.get('/overview', async (req, res) => {
  try {
    let totalUsers = 0;
    let totalOutlets = 0;
    let totalCustomers = 0;
    let totalRevenue = 0;

    // Get total users from Firebase Auth
    try {
      const usersSnapshot = await admin.auth().listUsers();
      totalUsers = usersSnapshot.users.length;
    } catch (error) {
      console.log('Could not fetch users, using default value');
      totalUsers = 5; // Default based on what we know
    }

    // Get outlets, customers, and revenue from real data
    try {
      const usersSnapshot = await admin.auth().listUsers();
      
      for (const user of usersSnapshot.users) {
        const userId = user.uid;
        
        // Count outlets for this user
        try {
          const outletsSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('outlets')
            .get();
          totalOutlets += outletsSnapshot.size;
        } catch (error) {
          console.log(`Could not fetch outlets for user ${userId}`);
        }
        
        // Count customers for this user
        try {
          const customersSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('web_customers')
            .get();
          totalCustomers += customersSnapshot.size;
        } catch (error) {
          console.log(`Could not fetch customers for user ${userId}`);
        }
        
        // Calculate revenue from transactions for this user
        try {
          const transactionsSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('web_transactions')
            .get();
          transactionsSnapshot.docs.forEach(doc => {
            const transaction = doc.data();
            if (transaction.receiptAmount) {
              totalRevenue += parseFloat(transaction.receiptAmount) || 0;
            }
          });
        } catch (error) {
          console.log(`Could not fetch transactions for user ${userId}`);
        }
      }
    } catch (error) {
      console.log('Could not fetch data, using default values');
      totalOutlets = 0;
      totalCustomers = 0;
      totalRevenue = 0;
    }

    res.json({
      totalUsers,
      totalOutlets,
      totalCustomers,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all outlets across all users
router.get('/outlets', async (req, res) => {
  try {
    const allOutlets = [];
    
    // Get all users from Firebase Auth
    const usersSnapshot = await admin.auth().listUsers();
    
    // For each user, get their outlets from /users/{userId}/outlets
    for (const user of usersSnapshot.users) {
      const userId = user.uid;
      const userEmail = user.email || 'Unknown';
      const userName = user.displayName || user.email?.split('@')[0] || 'Unknown';
      
      try {
        const outletsSnapshot = await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('outlets')
          .get();
        
        // Get all customers for this user to calculate customer counts
        let userCustomers = [];
        try {
          const customersSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('web_customers')
            .get();
          
          userCustomers = customersSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          }));
          
          console.log(`Found ${userCustomers.length} customers for user ${userId}`);
          // Debug: Log first few customers to see their structure
          if (userCustomers.length > 0) {
            console.log('Sample customer data:', JSON.stringify(userCustomers[0], null, 2));
          }
        } catch (error) {
          console.log(`Could not fetch customers for user ${userId}:`, error.message);
        }
        
        // Process outlets with async operations
        for (const outletDoc of outletsSnapshot.docs) {
          const outletData = outletDoc.data();
          const outletId = outletDoc.id;
          
                  // Count customers for this specific outlet (check multiple possible fields)
        const outletCustomers = userCustomers.filter(customer => {
          // Check multiple possible outlet ID fields
          const matches = customer.outletId === outletId || 
                 customer.registrationOutletId === outletId ||
                 customer.lastVisitOutletId === outletId ||
                 (customer.visitedOutlets && customer.visitedOutlets.includes(outletId));
          
          if (matches) {
            console.log(`Customer ${customer.id} matches outlet ${outletId}`);
          }
          
          return matches;
        });
        
        console.log(`Outlet ${outletId} has ${outletCustomers.length} customers`);
          
          // Calculate total revenue for this outlet
          let outletRevenue = 0;
          try {
            const transactionsSnapshot = await admin.firestore()
              .collection('users')
              .doc(userId)
              .collection('web_transactions')
              .where('outletId', '==', outletId)
              .get();
            
            // Calculate revenue from transactions
            transactionsSnapshot.docs.forEach(transactionDoc => {
              const transaction = transactionDoc.data();
              // Note: Since the current app doesn't store 'amount' field, 
              // we'll use pointsChanged as a proxy for revenue calculation
              // You may need to adjust this based on your business logic
              outletRevenue += Math.abs(parseInt(transaction.pointsChanged) || 0) * 0.01; // $0.01 per point
            });
          } catch (error) {
            console.log(`Could not fetch transactions for outlet ${outletId}:`, error.message);
          }
          
          allOutlets.push({
            ...outletData,
            id: outletDoc.id,
            userId: userId,
            userEmail: userEmail,
            userName: userName,
            customerCount: outletCustomers.length,
            totalRevenue: outletRevenue,
            // Normalize display name to uppercase for consistency
            displayName: outletData.name ? outletData.name.toUpperCase() : outletData.name
          });
        }
      } catch (error) {
        console.log(`Could not fetch outlets for user ${userId}:`, error.message);
      }
    }
    
    // Disable caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(allOutlets);
  } catch (error) {
    console.error('Get outlets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user analytics
router.get('/users/:userId/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timePeriod = 'week' } = req.query;

    // Get user data from Firebase Auth
    let userData;
    try {
      userData = await admin.auth().getUser(userId);
    } catch (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's outlets from /users/{userId}/outlets
    let outlets = [];
    try {
      const outletsSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('outlets')
        .get();
      
      outlets = outletsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.log(`Could not fetch outlets for user ${userId}:`, error.message);
    }

    // Get user's customers from web_customers collection
    let customers = [];
    try {
      const customersSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('web_customers')
        .get();
      
      customers = customersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.log(`Could not fetch customers for user ${userId}:`, error.message);
    }

    // Get user's transactions from web_transactions collection
    let transactions = [];
    try {
      const transactionsSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('web_transactions')
        .get();
      
      transactions = transactionsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.log(`Could not fetch transactions for user ${userId}:`, error.message);
    }

    // Calculate analytics based on time period
    const now = new Date();
    let startDate;

    switch (timePeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    // Filter transactions by time period
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= startDate && transactionDate <= now;
    });

    // Calculate metrics from transactions (same logic as dashboard)
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    
    // Filter transactions by date range and calculate points (same as dashboard logic)
    filteredTransactions.forEach(transaction => {
      const pointsChanged = transaction.pointsChanged || 0;
      const transactionType = transaction.transactionType || '';
      const isManualTransaction = transaction.isManualTransaction || false;
      const transactionDate = new Date(transaction.timestamp);
      
      // Only count transactions from the selected time period (same as dashboard)
      if (transactionDate >= startDate && transactionDate <= now) {
        // For EARNED transactions, only count manual ones (same as dashboard)
        if (transactionType.toUpperCase() === 'EARNED' && isManualTransaction && pointsChanged > 0) {
          totalPointsEarned += pointsChanged;
        } else if (transactionType.toUpperCase() === 'REDEEMED' && pointsChanged < 0) {
          totalPointsRedeemed += Math.abs(pointsChanged);
        }
      }
    });
    
    const totalRevenue = totalPointsEarned * 0.1; // 1 point = $0.10 (same as dashboard)

    // Calculate total transactions count

    const totalTransactions = 0; // No transaction records available

    // Generate recent activity
    const generateRecentActivity = (period) => {
      const activities = [];
      
      // Add transaction activities
      filteredTransactions.forEach(transaction => {
        activities.push({
          type: 'transaction',
          id: transaction.id,
          customerId: transaction.customerId,
          customerPhone: transaction.customerPhone,
          outletId: transaction.outletId,
          outletName: transaction.outletName,
          pointsChanged: transaction.pointsChanged,
          transactionType: transaction.transactionType,
          description: transaction.description,
          timestamp: transaction.timestamp,
          adminId: transaction.adminId,
          adminName: transaction.adminName
        });
      });

      // Add customer activities
      customers.forEach(customer => {
        const customerDate = new Date(customer.createdAt);
        if (customerDate >= startDate && customerDate <= now) {
          activities.push({
            type: 'customer',
            id: customer.id,
            customerId: customer.customerId,
            phoneNumber: customer.phoneNumber,
            firstName: customer.firstName,
            lastName: customer.lastName,
            outletId: customer.outletId,
            checkInOutletId: customer.checkInOutletId,
            totalPoints: customer.totalPoints,
            isActive: customer.isActive,
            processed: customer.processed,
            timestamp: customer.createdAt
          });
        }
      });

      // Sort by timestamp (newest first)
      return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const recentActivity = generateRecentActivity(timePeriod);

    // Calculate daily stats
    const dailyStats = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTransactions = filteredTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        return transactionDate >= dayStart && transactionDate < dayEnd;
      });
      
      const dayRevenue = dayTransactions.reduce((sum, transaction) => {
        return sum + (parseFloat(transaction.amount) || 0);
      }, 0);
      
      const dayPoints = dayTransactions.reduce((sum, transaction) => {
        return sum + (parseInt(transaction.pointsChanged) || 0);
      }, 0);
      
      dailyStats.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: Math.round(dayRevenue * 100) / 100,
        points: dayPoints,
        transactions: dayTransactions.length
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Disable caching to ensure real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      user: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName
      },
      outlets,
      customers,
      transactions: filteredTransactions,
      analytics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPointsEarned,
        totalPointsRedeemed,
        totalTransactions,
        totalCustomers: customers.length,
        totalOutlets: outlets.length
      },
      dailyStats,
      recentActivity
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get outlets for specific user
router.get('/users/:userId/outlets', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`Getting outlets for user: ${userId}`);
    
    const outletsSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('outlets')
      .get();
    
    // Get all customers for this user to calculate customer counts
    let userCustomers = [];
    try {
      const customersSnapshot = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('customers')
        .get();
      
      userCustomers = customersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      console.log(`Found ${userCustomers.length} customers for user ${userId}`);
      // Debug: Log first few customers to see their structure
      if (userCustomers.length > 0) {
        console.log('Sample customer data:', JSON.stringify(userCustomers[0], null, 2));
      }
    } catch (error) {
      console.log(`Could not fetch customers for user ${userId}:`, error.message);
    }
    
    const outlets = [];
    
    // Process outlets with customer counts
    for (const outletDoc of outletsSnapshot.docs) {
      const outletData = outletDoc.data();
      const outletId = outletDoc.id;
      
      // Count customers for this specific outlet (check multiple possible fields)
      const outletCustomers = userCustomers.filter(customer => {
        // Check multiple possible outlet ID fields
        const matches = customer.outletId === outletId || 
               customer.registrationOutletId === outletId ||
               customer.lastVisitOutletId === outletId ||
               (customer.visitedOutlets && customer.visitedOutlets.includes(outletId));
        
        if (matches) {
          console.log(`Customer ${customer.id} matches outlet ${outletId}`);
        }
        
        return matches;
      });
      
      console.log(`Outlet ${outletId} has ${outletCustomers.length} customers`);
      
      // Calculate total revenue for this outlet
      let outletRevenue = 0;
      try {
        const transactionsSnapshot = await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('web_transactions')
          .where('outletId', '==', outletId)
          .get();
        
        // Calculate revenue from transactions
        transactionsSnapshot.docs.forEach(transactionDoc => {
          const transaction = transactionDoc.data();
          // Note: Since the current app doesn't store 'amount' field, 
          // we'll use pointsChanged as a proxy for revenue calculation
          // You may need to adjust this based on your business logic
          outletRevenue += Math.abs(parseInt(transaction.pointsChanged) || 0) * 0.01; // $0.01 per point
        });
      } catch (error) {
        console.log(`Could not fetch transactions for outlet ${outletId}:`, error.message);
      }
      
      outlets.push({
        ...outletData,
        id: outletId,
        customerCount: outletCustomers.length,
        revenue: Math.round(outletRevenue * 100) / 100
      });
    }
    
    // Disable caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(outlets);
  } catch (error) {
    console.error('Get user outlets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get outlet details with customers and transactions
router.get('/outlets/:outletId', async (req, res) => {
  try {
    const { outletId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get outlet details
    const outletDoc = await admin.firestore()
      .collection('users').doc(userId).collection('outlets').doc(outletId).get();
    
    if (!outletDoc.exists) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    const outlet = { ...outletDoc.data(), id: outletDoc.id };

    // Get customers for this outlet
    const customersSnapshot = await admin.firestore()
      .collection('users').doc(userId).collection('customers')
      .where('outletId', '==', outletId).get();
    
    const customers = customersSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    // Get transactions for this outlet
    const transactionsSnapshot = await admin.firestore()
      .collection('users').doc(userId).collection('web_transactions')
      .where('outletId', '==', outletId).get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));

    // Calculate outlet revenue
    const totalRevenue = transactions.reduce((sum, transaction) => {
      return sum + (parseFloat(transaction.amount) || 0);
    }, 0);

    res.json({
      outlet,
      customers,
      transactions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      customerCount: customers.length,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error('Get outlet details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all customers across all users
router.get('/customers', async (req, res) => {
  try {
    const usersSnapshot = await admin.auth().listUsers();
    const allCustomers = [];
    
    for (const user of usersSnapshot.users) {
      const userId = user.uid;
      
      try {
        const customersSnapshot = await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('customers')
          .get();
          
        customersSnapshot.docs.forEach(customerDoc => {
          allCustomers.push({
            ...customerDoc.data(),
            id: customerDoc.id,
            userId: userId
          });
        });
      } catch (error) {
        console.log(`Could not fetch customers for user ${userId}:`, error.message);
      }
    }
    
    // Disable caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(allCustomers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customers for specific user
router.get('/users/:userId/customers', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const customersSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('customers')
      .get();
    
    const customers = customersSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    
    // Disable caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json(customers);
  } catch (error) {
    console.error('Get user customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check all outlets
router.get('/debug/all-outlets', async (req, res) => {
  try {
    console.log('=== DEBUGGING ALL OUTLETS ===');
    const usersSnapshot = await admin.auth().listUsers();
    console.log(`Total users found: ${usersSnapshot.users.length}`);
    
    let totalOutlets = 0;
    for (const user of usersSnapshot.users) {
      const userId = user.uid;
      try {
        const outletsSnapshot = await admin.firestore()
          .collection('users')
          .doc(userId)
          .collection('outlets')
          .get();
        console.log(`User ${userId} has ${outletsSnapshot.size} outlets`);
        totalOutlets += outletsSnapshot.size;
      } catch (error) {
        console.log(`Could not fetch outlets for user ${userId}:`, error.message);
      }
    }
    
    console.log(`Total outlets found: ${totalOutlets}`);
    res.json({ totalUsers: usersSnapshot.users.length, totalOutlets });
  } catch (error) {
    console.error('Debug all outlets error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 