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

    // Get total users
    const usersSnapshot = await admin.auth().listUsers();
    totalUsers = usersSnapshot.users.length;

    // Get total outlets from businesses collection
    const businessesSnapshot = await admin.firestore().collection('businesses').get();
    totalOutlets = businessesSnapshot.size;

    // Get total customers from all users
    const usersSnapshot2 = await admin.firestore().collection('users').get();
    for (const userDoc of usersSnapshot2.docs) {
      const customersSnapshot = await userDoc.ref.collection('customers').get();
      totalCustomers += customersSnapshot.size;
    }

    // Calculate total revenue from all transactions
    for (const userDoc of usersSnapshot2.docs) {
      const transactionsSnapshot = await userDoc.ref.collection('transactions').get();
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        if (transaction.amount) {
          totalRevenue += parseFloat(transaction.amount) || 0;
        }
      });
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
    const businessesSnapshot = await admin.firestore().collection('businesses').get();
    const allOutlets = [];
    
    businessesSnapshot.docs.forEach(businessDoc => {
      const businessData = businessDoc.data();
      allOutlets.push({
        ...businessData,
        id: businessDoc.id,
        userId: businessData.ownerId
      });
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
    const { timePeriod = 'all', selectedDate, outletId } = req.query;
    
    // Get user's businesses
    const businessesSnapshot = await admin.firestore()
      .collection('businesses')
      .where('ownerId', '==', userId)
      .get();
    
    const businesses = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get user's customers
    const customersSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('customers')
      .get();
    
    const customers = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get real transactions for this user
    const transactionsSnapshot = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate real analytics from actual data
    let totalRevenue = 0;
    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    let totalCheckIns = 0;
    let averageRating = 0;
    let totalRatings = 0;

    // Process customers for analytics
    customers.forEach(customer => {
      totalPointsEarned += customer.totalPoints || 0;
      totalPointsRedeemed += customer.redeemedPoints || 0;
      totalCheckIns += customer.checkInCount || 0;
      
      if (customer.rating) {
        totalRatings += customer.rating;
        averageRating += customer.rating;
      }
    });

    // Process transactions for revenue
    transactions.forEach(transaction => {
      if (transaction.amount) {
        totalRevenue += parseFloat(transaction.amount) || 0;
      }
    });

    averageRating = totalRatings > 0 ? averageRating / totalRatings : 0;

    // Generate real daily stats from actual transactions
    const dailyStats = [];
    const today = new Date();
    
    // Get transactions for the last 30 days
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Filter transactions for this specific date
      const dayTransactions = transactions.filter(transaction => {
        const transactionDate = transaction.date || transaction.createdAt;
        if (typeof transactionDate === 'string') {
          return transactionDate.startsWith(dateString);
        } else if (transactionDate && transactionDate.toDate) {
          // Handle Firestore timestamp
          const timestampDate = transactionDate.toDate();
          return timestampDate.toISOString().split('T')[0] === dateString;
        }
        return false;
      });

      // Calculate real daily stats
      let dayEarnedPoints = 0;
      let dayRedeemedPoints = 0;
      let dayCheckIns = 0;
      let dayRevenue = 0;
      let dayNewCustomers = 0;

      dayTransactions.forEach(transaction => {
        if (transaction.type === 'earn') {
          dayEarnedPoints += transaction.points || 0;
        } else if (transaction.type === 'redeem') {
          dayRedeemedPoints += transaction.points || 0;
        }
        
        if (transaction.amount) {
          dayRevenue += parseFloat(transaction.amount) || 0;
        }
      });

      // Count check-ins for this day
      const dayCheckInsCount = customers.filter(customer => {
        const lastVisit = customer.lastVisit;
        if (typeof lastVisit === 'string') {
          return lastVisit.startsWith(dateString);
        } else if (lastVisit && lastVisit.toDate) {
          const visitDate = lastVisit.toDate();
          return visitDate.toISOString().split('T')[0] === dateString;
        }
        return false;
      }).length;

      dayCheckIns = dayCheckInsCount;

      // Count new customers for this day
      const dayNewCustomersCount = customers.filter(customer => {
        const createdAt = customer.createdAt;
        if (typeof createdAt === 'string') {
          return createdAt.startsWith(dateString);
        } else if (createdAt && createdAt.toDate) {
          const createdDate = createdAt.toDate();
          return createdDate.toISOString().split('T')[0] === dateString;
        }
        return false;
      }).length;

      dayNewCustomers = dayNewCustomersCount;

      // Calculate outlet breakdown for this day
      const outletBreakdown = {};
      businesses.forEach(business => {
        const businessTransactions = dayTransactions.filter(transaction => 
          transaction.businessId === business.id
        );

        let businessEarnedPoints = 0;
        let businessRedeemedPoints = 0;
        let businessRevenue = 0;

        businessTransactions.forEach(transaction => {
          if (transaction.type === 'earn') {
            businessEarnedPoints += transaction.points || 0;
          } else if (transaction.type === 'redeem') {
            businessRedeemedPoints += transaction.points || 0;
          }
          
          if (transaction.amount) {
            businessRevenue += parseFloat(transaction.amount) || 0;
          }
        });

        // Count check-ins for this business on this day
        const businessCheckIns = customers.filter(customer => {
          if (customer.businessId !== business.id) return false;
          
          const lastVisit = customer.lastVisit;
          if (typeof lastVisit === 'string') {
            return lastVisit.startsWith(dateString);
          } else if (lastVisit && lastVisit.toDate) {
            const visitDate = lastVisit.toDate();
            return visitDate.toISOString().split('T')[0] === dateString;
          }
          return false;
        }).length;

        outletBreakdown[business.id] = {
          name: business.name,
          earnedPoints: businessEarnedPoints,
          redeemedPoints: businessRedeemedPoints,
          checkIns: businessCheckIns,
          revenue: businessRevenue
        };
      });

      const dayStats = {
        date: dateString,
        earnedPoints: dayEarnedPoints,
        redeemedPoints: dayRedeemedPoints,
        checkIns: dayCheckIns,
        revenue: dayRevenue,
        newCustomers: dayNewCustomers,
        outletBreakdown
      };
      
      dailyStats.push(dayStats);
    }

    // Filter daily stats based on time period
    let filteredDailyStats = dailyStats;
    if (timePeriod !== 'all') {
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
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      filteredDailyStats = dailyStats.filter(stat => {
        const statDate = new Date(stat.date);
        return statDate >= startDate && statDate <= now;
      });
    }

    // Filter by specific date if provided
    if (selectedDate) {
      filteredDailyStats = filteredDailyStats.filter(stat => stat.date === selectedDate);
    }

    // Filter by specific outlet if provided
    if (outletId && outletId !== 'all') {
      filteredDailyStats = filteredDailyStats.map(stat => ({
        ...stat,
        earnedPoints: stat.outletBreakdown[outletId]?.earnedPoints || 0,
        redeemedPoints: stat.outletBreakdown[outletId]?.redeemedPoints || 0,
        checkIns: stat.outletBreakdown[outletId]?.checkIns || 0,
        revenue: stat.outletBreakdown[outletId]?.revenue || 0
      }));
    }

    // Generate outlet performance data
    const outletPerformance = {};
    businesses.forEach(business => {
      const businessCustomers = customers.filter(customer => 
        customer.businessId === business.id
      );
      
      const businessStats = dailyStats.filter(stat => 
        stat.outletBreakdown[business.id]
      );
      
      outletPerformance[business.id] = {
        name: business.name,
        totalCustomers: businessCustomers.length,
        totalRevenue: businessStats.reduce((sum, stat) => 
          sum + (stat.outletBreakdown[business.id]?.revenue || 0), 0
        ),
        totalPointsEarned: businessStats.reduce((sum, stat) => 
          sum + (stat.outletBreakdown[business.id]?.earnedPoints || 0), 0
        ),
        totalPointsRedeemed: businessStats.reduce((sum, stat) => 
          sum + (stat.outletBreakdown[business.id]?.redeemedPoints || 0), 0
        ),
        totalCheckIns: businessStats.reduce((sum, stat) => 
          sum + (stat.outletBreakdown[business.id]?.checkIns || 0), 0
        ),
        dailyStats: businessStats
      };
    });

    // Generate recent activity with real transaction data
    const generateRecentActivity = (period) => {
      const activities = [];
      const now = new Date();
      let startTime;

      switch (period) {
        case 'today':
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(0);
      }

      // Filter transactions within the time period
      const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = transaction.date || transaction.createdAt;
        let transactionTime;
        
        if (typeof transactionDate === 'string') {
          transactionTime = new Date(transactionDate);
        } else if (transactionDate && transactionDate.toDate) {
          transactionTime = transactionDate.toDate();
        } else {
          return false;
        }
        
        return transactionTime >= startTime && transactionTime <= now;
      });

      // Convert transactions to activities
      filteredTransactions.forEach(transaction => {
        const business = businesses.find(b => b.id === transaction.businessId);
        const businessName = business ? business.name : 'Unknown Outlet';
        
        let activityType = 'transaction';
        let description = '';
        
        if (transaction.type === 'earn') {
          activityType = 'earned';
          description = `Customer earned ${transaction.points || 0} points at ${businessName}`;
        } else if (transaction.type === 'redeem') {
          activityType = 'redeemed';
          description = `Customer redeemed ${transaction.points || 0} points at ${businessName}`;
        } else if (transaction.type === 'checkin') {
          activityType = 'checkin';
          description = `Customer checked in at ${businessName}`;
        } else {
          description = `Transaction at ${businessName}`;
        }
        
        activities.push({
          type: activityType,
          description: description,
          timestamp: transaction.date || transaction.createdAt,
          amount: transaction.amount,
          points: transaction.points,
          businessName: businessName
        });
      });

      // Also add customer check-ins as activities
      customers.forEach(customer => {
        if (customer.lastVisit) {
          let visitTime;
          
          if (typeof customer.lastVisit === 'string') {
            visitTime = new Date(customer.lastVisit);
          } else if (customer.lastVisit && customer.lastVisit.toDate) {
            visitTime = customer.lastVisit.toDate();
          } else {
            return;
          }
          
          if (visitTime >= startTime && visitTime <= now) {
            const business = businesses.find(b => b.id === customer.businessId);
            const businessName = business ? business.name : 'Unknown Outlet';
            
            activities.push({
              type: 'checkin',
              description: `${customer.name || 'Customer'} checked in at ${businessName}`,
              timestamp: customer.lastVisit,
              customerName: customer.name,
              businessName: businessName
            });
          }
        }
      });

      return activities
        .sort((a, b) => {
          let timeA, timeB;
          
          if (typeof a.timestamp === 'string') {
            timeA = new Date(a.timestamp);
          } else if (a.timestamp && a.timestamp.toDate) {
            timeA = a.timestamp.toDate();
          } else {
            timeA = new Date(0);
          }
          
          if (typeof b.timestamp === 'string') {
            timeB = new Date(b.timestamp);
          } else if (b.timestamp && b.timestamp.toDate) {
            timeB = b.timestamp.toDate();
          } else {
            timeB = new Date(0);
          }
          
          return timeB - timeA;
        })
        .slice(0, 10); // Limit to 10 most recent activities
    };

    const recentActivity = generateRecentActivity(timePeriod);

    // Find top performing outlet
    const topPerformingOutlet = businesses.length > 0 ? businesses[0].name : 'N/A';

    res.json({
      totalCustomers: customers.length,
      totalRevenue: totalRevenue,
      totalPointsEarned: totalPointsEarned,
      totalPointsRedeemed: totalPointsRedeemed,
      totalCheckIns: totalCheckIns,
      averageCustomerRating: averageRating,
      topPerformingOutlet: topPerformingOutlet,
      dailyStats: filteredDailyStats,
      recentActivity: recentActivity,
      timePeriod: timePeriod
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
    const businessesSnapshot = await admin.firestore()
      .collection('businesses')
      .where('ownerId', '==', userId)
      .get();
    
    const outlets = businessesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    
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
      .collection('users').doc(userId).collection('transactions')
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
    const usersSnapshot = await admin.firestore().collection('users').get();
    const allCustomers = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const customersSnapshot = await userDoc.ref.collection('customers').get();
      customersSnapshot.docs.forEach(customerDoc => {
        allCustomers.push({
          ...customerDoc.data(),
          id: customerDoc.id,
          userId: userDoc.id
        });
      });
    }
    
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
      .collection('users').doc(userId).collection('customers').get();
    
    const customers = customersSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    
    res.json(customers);
  } catch (error) {
    console.error('Get user customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoints for troubleshooting
router.get('/debug/all-outlets', async (req, res) => {
  try {
    console.log('=== DEBUGGING ALL OUTLETS ===');
    const usersSnapshot = await admin.firestore().collection('users').get();
    console.log(`Total users found: ${usersSnapshot.size}`);
    
    const allOutlets = [];
    for (const userDoc of usersSnapshot.docs) {
      console.log(`Checking user: ${userDoc.id}`);
      const outletsSnapshot = await userDoc.ref.collection('outlets').get();
      console.log(`User ${userDoc.id} has ${outletsSnapshot.size} outlets`);
      
      outletsSnapshot.docs.forEach(outletDoc => {
        const outletData = outletDoc.data();
        console.log(`Outlet: ${outletDoc.id} - ${outletData.name || 'No name'}`);
        allOutlets.push({
          ...outletData,
          id: outletDoc.id,
          userId: userDoc.id
        });
      });
    }
    
    console.log(`Total outlets found: ${allOutlets.length}`);
    res.json({ totalOutlets: allOutlets.length, outlets: allOutlets });
  } catch (error) {
    console.error('Debug outlets error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/outlets/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`=== DEBUGGING OUTLETS FOR EMAIL: ${email} ===`);
    
    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;
    console.log(`Found user ID: ${userId}`);
    
    // Get outlets for this user
    const outletsSnapshot = await admin.firestore()
      .collection('users').doc(userId).collection('outlets').get();
    
    console.log(`User has ${outletsSnapshot.size} outlets`);
    const outlets = [];
    
    outletsSnapshot.docs.forEach(doc => {
      const outletData = doc.data();
      console.log(`Outlet: ${doc.id} - ${outletData.name || 'No name'}`);
      outlets.push({
        ...outletData,
        id: doc.id
      });
    });
    
    res.json({ userId, email, outletCount: outlets.length, outlets });
  } catch (error) {
    console.error('Debug user outlets error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 