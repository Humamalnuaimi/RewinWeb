const express = require('express');
const admin = require('firebase-admin');
const { query, validationResult } = require('express-validator');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const router = express.Router();

// Get all customers across all users with pagination and search
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('userId').optional().isString(),
  query('sortBy').optional().isIn(['name', 'phoneNumber', 'createdAt', 'lastVisit']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const userId = req.query.userId || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    let allCustomers = [];

    if (userId) {
      // Get customers for specific user
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();

      allCustomers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId,
        ...doc.data()
      }));
    } else {
      // Get customers from all users
      const usersSnapshot = await admin.firestore().collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const customersSnapshot = await admin.firestore()
          .collection('users').doc(userDoc.id)
          .collection('web_customers').get();

        const userCustomers = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: userDoc.id,
          ...doc.data()
        }));

        allCustomers.push(...userCustomers);
      }
    }

    // Apply search filter
    if (search) {
      allCustomers = allCustomers.filter(customer => 
        customer.name?.toLowerCase().includes(search.toLowerCase()) ||
        customer.phoneNumber?.toLowerCase().includes(search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sorting
    allCustomers.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'lastVisit') {
        aValue = aValue?.toDate?.() || new Date(aValue);
        bValue = bValue?.toDate?.() || new Date(bValue);
        aValue = aValue.getTime();
        bValue = bValue.getTime();
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
    const paginatedCustomers = allCustomers.slice(startIndex, endIndex);

    // Get user information for each customer
    const customersWithUserInfo = await Promise.all(
      paginatedCustomers.map(async (customer) => {
        try {
          const userRecord = await admin.auth().getUser(customer.userId);
          return {
            ...customer,
            userEmail: userRecord.email,
            userName: userRecord.displayName
          };
        } catch (error) {
          return {
            ...customer,
            userEmail: 'Unknown',
            userName: 'Unknown'
          };
        }
      })
    );

    res.json({
      success: true,
      customers: customersWithUserInfo,
      pagination: {
        page,
        limit,
        total: allCustomers.length,
        totalPages: Math.ceil(allCustomers.length / limit),
        hasNext: endIndex < allCustomers.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// Get specific customer details
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const customerDoc = await admin.firestore()
      .collection('users').doc(userId)
      .collection('web_customers').doc(customerId).get();

    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customerDoc.data();

    // Get customer's transactions
    const transactionsSnapshot = await admin.firestore()
      .collection('users').doc(userId)
      .collection('web_transactions')
      .where('phoneNumber', '==', customerData.phoneNumber)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      customer: {
        id: customerId,
        userId: userId,
        ...customerData,
        transactions: transactions
      }
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// Export customers to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { userId } = req.query;

    let allCustomers = [];

    if (userId) {
      // Export customers for specific user
      const customersSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').get();

      allCustomers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId,
        ...doc.data()
      }));
    } else {
      // Export customers from all users
      const usersSnapshot = await admin.firestore().collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const customersSnapshot = await admin.firestore()
          .collection('users').doc(userDoc.id)
          .collection('web_customers').get();

        const userCustomers = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: userDoc.id,
          ...doc.data()
        }));

        allCustomers.push(...userCustomers);
      }
    }

    // Get user information for each customer
    const customersWithUserInfo = await Promise.all(
      allCustomers.map(async (customer) => {
        try {
          const userRecord = await admin.auth().getUser(customer.userId);
          return {
            ...customer,
            userEmail: userRecord.email,
            userName: userRecord.displayName
          };
        } catch (error) {
          return {
            ...customer,
            userEmail: 'Unknown',
            userName: 'Unknown'
          };
        }
      })
    );

    // Create CSV
    const csvWriter = createCsvWriter({
      path: 'customers_export.csv',
      header: [
        { id: 'id', title: 'Customer ID' },
        { id: 'name', title: 'Name' },
        { id: 'phoneNumber', title: 'Phone Number' },
        { id: 'email', title: 'Email' },
        { id: 'userEmail', title: 'Owner Email' },
        { id: 'userName', title: 'Owner Name' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'lastVisit', title: 'Last Visit' }
      ]
    });

    await csvWriter.writeRecords(customersWithUserInfo);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
    res.download('customers_export.csv');

  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
});

// Delete customer with comprehensive cleanup
router.delete('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`Starting customer deletion: ${customerId} for user: ${userId}`);

    // 1. Get customer info before deletion
    let customerInfo = null;
    try {
      const customerDoc = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_customers').doc(customerId).get();
      
      if (customerDoc.exists) {
        customerInfo = {
          id: customerDoc.id,
          ...customerDoc.data()
        };
      }
    } catch (error) {
      console.log('Error getting customer info:', error.message);
    }

    // 2. Count associated data before deletion
    const dataSummary = {
      webTransactions: 0,
      transactions: 0,
      visits: 0
    };

    // Count web transactions
    try {
      const webTransactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions')
        .where('customerId', '==', customerId)
        .get();
      dataSummary.webTransactions = webTransactionsSnapshot.size;
    } catch (error) {
      console.log('Error counting web transactions:', error.message);
    }

    // Count main transactions
    try {
      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('transactions')
        .where('customerId', '==', customerId)
        .get();
      dataSummary.transactions = transactionsSnapshot.size;
    } catch (error) {
      console.log('Error counting main transactions:', error.message);
    }

    // Count visits
    try {
      const visitsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_visits')
        .where('customerId', '==', customerId)
        .get();
      dataSummary.visits = visitsSnapshot.size;
    } catch (error) {
      console.log('Error counting visits:', error.message);
    }

    console.log('Customer data summary before deletion:', dataSummary);

    // 3. Delete customer from both collections
    const batch = admin.firestore().batch();
    
    // Delete from web_customers
    const webCustomerRef = admin.firestore()
      .collection('users').doc(userId)
      .collection('web_customers').doc(customerId);
    batch.delete(webCustomerRef);

    // Delete from customers (if exists)
    const customerRef = admin.firestore()
      .collection('users').doc(userId)
      .collection('customers').doc(customerId);
    batch.delete(customerRef);

    // 4. Delete associated transactions from both collections
    try {
      const webTransactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_transactions')
        .where('customerId', '==', customerId)
        .get();

      webTransactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      const transactionsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('transactions')
        .where('customerId', '==', customerId)
        .get();

      transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.log('Error deleting associated transactions:', error.message);
    }

    // 5. Delete associated visits
    try {
      const visitsSnapshot = await admin.firestore()
        .collection('users').doc(userId)
        .collection('web_visits')
        .where('customerId', '==', customerId)
        .get();

      visitsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    } catch (error) {
      console.log('Error deleting associated visits:', error.message);
    }

    // 6. Execute batch deletion
    await batch.commit();
    console.log('Customer and associated data deleted successfully');

    // 7. Prepare response with deletion summary
    const deletionSummary = {
      customerInfo,
      dataSummary,
      totalDeleted: 1 + dataSummary.webTransactions + dataSummary.transactions + dataSummary.visits,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Customer and all associated data deleted successfully',
      deletionSummary
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ 
      error: 'Failed to delete customer',
      details: error.message 
    });
  }
});

// Bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { operation, customerIds, userId } = req.body;

    if (!userId || !customerIds || !operation) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const batch = admin.firestore().batch();

    switch (operation) {
      case 'delete':
        customerIds.forEach(customerId => {
          const customerRef = admin.firestore()
            .collection('users').doc(userId)
            .collection('web_customers').doc(customerId);
          batch.delete(customerRef);
        });
        break;

      case 'update':
        const { updates } = req.body;
        customerIds.forEach(customerId => {
          const customerRef = admin.firestore()
            .collection('users').doc(userId)
            .collection('web_customers').doc(customerId);
          batch.update(customerRef, updates);
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    await batch.commit();

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`
    });

  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

module.exports = router; 