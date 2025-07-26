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
    const { timePeriod = 'all' } = req.query;
    
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

    // Calculate analytics
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

    averageRating = totalRatings > 0 ? averageRating / totalRatings : 0;

    // Generate daily stats for the last 30 days
    const dailyStats = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate daily data (in real app, this would come from actual transactions)
      const dayStats = {
        date: date.toISOString().split('T')[0],
        earnedPoints: Math.floor(Math.random() * 100) + 10,
        redeemedPoints: Math.floor(Math.random() * 50) + 5,
        checkIns: Math.floor(Math.random() * 20) + 1,
        revenue: Math.floor(Math.random() * 500) + 50,
        newCustomers: Math.floor(Math.random() * 5) + 0
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

    // Generate recent activity with time-based filtering
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

      const activityTypes = [
        { type: 'earned', description: 'Customer earned 50 points at Coffee Shop' },
        { type: 'redeemed', description: 'Customer redeemed 25 points for free coffee' },
        { type: 'checkin', description: 'New customer checked in at Restaurant' },
        { type: 'earned', description: 'Customer earned 30 points at Cafe' },
        { type: 'redeemed', description: 'Customer redeemed 40 points for discount' }
      ];

      // Generate activities within the time period
      for (let i = 0; i < 5; i++) {
        const randomTime = new Date(startTime.getTime() + Math.random() * (now.getTime() - startTime.getTime()));
        const randomActivity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        
        activities.push({
          type: randomActivity.type,
          description: randomActivity.description,
          timestamp: randomTime.toISOString()
        });
      }

      return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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