const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get all email sender configurations
router.get('/', async (req, res) => {
  try {
    const sendersSnapshot = await admin.firestore()
      .collection('emailSenders')
      .orderBy('createdAt', 'desc')
      .get();

    const senders = [];
    sendersSnapshot.forEach(doc => {
      const data = doc.data();
      // Don't expose sensitive password/token data
      const sanitizedData = {
        id: doc.id,
        name: data.name,
        email: data.email,
        displayName: data.displayName,
        service: data.service,
        host: data.host,
        port: data.port,
        secure: data.secure,
        isActive: data.isActive,
        isDefault: data.isDefault,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
      senders.push(sanitizedData);
    });

    res.json({
      success: true,
      senders
    });
  } catch (error) {
    console.error('Error fetching email senders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email senders',
      error: error.message
    });
  }
});

// Get specific email sender configuration
router.get('/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;
    const senderDoc = await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .get();

    if (!senderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email sender configuration not found'
      });
    }

    const data = senderDoc.data();
    // Don't expose sensitive password/token data
    const sanitizedData = {
      id: senderDoc.id,
      name: data.name,
      email: data.email,
      displayName: data.displayName,
      service: data.service,
      host: data.host,
      port: data.port,
      secure: data.secure,
      isActive: data.isActive,
      isDefault: data.isDefault,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };

    res.json({
      success: true,
      sender: sanitizedData
    });
  } catch (error) {
    console.error('Error fetching email sender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email sender',
      error: error.message
    });
  }
});

// Create new email sender configuration
router.post('/', [
  body('name').notEmpty().withMessage('Sender name is required'),
  body('email').isEmail().withMessage('Valid email address is required'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('service').optional(),
  body('host').optional(),
  body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      displayName,
      service,
      host,
      port,
      secure,
      username,
      password,
      isActive,
      isDefault
    } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await admin.firestore()
        .collection('emailSenders')
        .where('isDefault', '==', true)
        .get()
        .then(snapshot => {
          const batch = admin.firestore().batch();
          snapshot.forEach(doc => {
            batch.update(doc.ref, { isDefault: false });
          });
          return batch.commit();
        });
    }

    // Encrypt sensitive data (in production, use proper encryption)
    const senderData = {
      name,
      email,
      displayName,
      service: service || null,
      host: host || null,
      port: port ? parseInt(port) : null,
      secure: secure === true || secure === 'true',
      username,
      password, // In production, encrypt this
      isActive: isActive === true || isActive === 'true',
      isDefault: isDefault === true || isDefault === 'true',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('emailSenders')
      .add(senderData);

    // Return sanitized data
    const sanitizedData = {
      id: docRef.id,
      name,
      email,
      displayName,
      service,
      host,
      port: port ? parseInt(port) : null,
      secure: secure === true || secure === 'true',
      isActive: isActive === true || isActive === 'true',
      isDefault: isDefault === true || isDefault === 'true'
    };

    res.json({
      success: true,
      message: 'Email sender configuration created successfully',
      senderId: docRef.id,
      sender: sanitizedData
    });
  } catch (error) {
    console.error('Error creating email sender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create email sender configuration',
      error: error.message
    });
  }
});

// Update email sender configuration
router.put('/:senderId', [
  body('name').notEmpty().withMessage('Sender name is required'),
  body('email').isEmail().withMessage('Valid email address is required'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { senderId } = req.params;
    const {
      name,
      email,
      displayName,
      service,
      host,
      port,
      secure,
      username,
      password,
      isActive,
      isDefault
    } = req.body;

    // Check if sender exists
    const senderDoc = await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .get();

    if (!senderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email sender configuration not found'
      });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await admin.firestore()
        .collection('emailSenders')
        .where('isDefault', '==', true)
        .get()
        .then(snapshot => {
          const batch = admin.firestore().batch();
          snapshot.forEach(doc => {
            if (doc.id !== senderId) {
              batch.update(doc.ref, { isDefault: false });
            }
          });
          return batch.commit();
        });
    }

    const updateData = {
      name,
      email,
      displayName,
      service: service || null,
      host: host || null,
      port: port ? parseInt(port) : null,
      secure: secure === true || secure === 'true',
      isActive: isActive === true || isActive === 'true',
      isDefault: isDefault === true || isDefault === 'true',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Only update username/password if provided
    if (username) updateData.username = username;
    if (password) updateData.password = password; // In production, encrypt this

    await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .update(updateData);

    // Return sanitized data
    const sanitizedData = {
      id: senderId,
      name,
      email,
      displayName,
      service,
      host,
      port: port ? parseInt(port) : null,
      secure: secure === true || secure === 'true',
      isActive: isActive === true || isActive === 'true',
      isDefault: isDefault === true || isDefault === 'true'
    };

    res.json({
      success: true,
      message: 'Email sender configuration updated successfully',
      sender: sanitizedData
    });
  } catch (error) {
    console.error('Error updating email sender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email sender configuration',
      error: error.message
    });
  }
});

// Delete email sender configuration
router.delete('/:senderId', async (req, res) => {
  try {
    const { senderId } = req.params;

    const senderDoc = await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .get();

    if (!senderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email sender configuration not found'
      });
    }

    await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .delete();

    res.json({
      success: true,
      message: 'Email sender configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email sender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email sender configuration',
      error: error.message
    });
  }
});

// Test email sender configuration
router.post('/:senderId/test', async (req, res) => {
  try {
    const { senderId } = req.params;
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Get sender configuration
    const senderDoc = await admin.firestore()
      .collection('emailSenders')
      .doc(senderId)
      .get();

    if (!senderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email sender configuration not found'
      });
    }

    const senderConfig = senderDoc.data();
    const EmailService = require('../services/EmailService');

    // Send test email
    const result = await EmailService.testSenderConfiguration(senderConfig, testEmail);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing email sender:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email sender',
      error: error.message
    });
  }
});

module.exports = router;
