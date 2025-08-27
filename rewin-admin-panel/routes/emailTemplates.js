const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all email templates
router.get('/', async (req, res) => {
  try {
    const templatesSnapshot = await admin.firestore()
      .collection('emailTemplates')
      .orderBy('createdAt', 'desc')
      .get();

    const templates = [];
    templatesSnapshot.forEach(doc => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email templates',
      error: error.message
    });
  }
});

// Get specific email template
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const templateDoc = await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    res.json({
      success: true,
      template: {
        id: templateDoc.id,
        ...templateDoc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email template',
      error: error.message
    });
  }
});

// Create new email template
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      type,
      subject,
      htmlContent,
      variables,
      description,
      isActive
    } = req.body;

    let logoUrl = null;
    
    // Handle logo upload if provided
    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = `email-templates/logos/${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Make the file publicly accessible
      await file.makePublic();
      logoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const templateData = {
      name,
      type,
      subject,
      htmlContent,
      variables: variables ? JSON.parse(variables) : [],
      description: description || '',
      isActive: isActive === 'true',
      logoUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('emailTemplates')
      .add(templateData);

    res.json({
      success: true,
      message: 'Email template created successfully',
      templateId: docRef.id,
      template: {
        id: docRef.id,
        ...templateData
      }
    });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create email template',
      error: error.message
    });
  }
});

// Update email template
router.put('/:templateId', upload.single('logo'), async (req, res) => {
  try {
    const { templateId } = req.params;
    const {
      name,
      type,
      subject,
      htmlContent,
      variables,
      description,
      isActive,
      keepExistingLogo
    } = req.body;

    // Get existing template
    const existingDoc = await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .get();

    if (!existingDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    const existingData = existingDoc.data();
    let logoUrl = existingData.logoUrl;

    // Handle logo upload if provided
    if (req.file) {
      // Delete old logo if exists
      if (existingData.logoUrl) {
        try {
          const bucket = admin.storage().bucket();
          const oldFileName = existingData.logoUrl.split('/').pop();
          await bucket.file(`email-templates/logos/${oldFileName}`).delete();
        } catch (error) {
          console.log('Could not delete old logo:', error.message);
        }
      }

      // Upload new logo
      const bucket = admin.storage().bucket();
      const fileName = `email-templates/logos/${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      await file.makePublic();
      logoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } else if (keepExistingLogo !== 'true') {
      // Remove logo if not keeping existing and no new logo provided
      if (existingData.logoUrl) {
        try {
          const bucket = admin.storage().bucket();
          const oldFileName = existingData.logoUrl.split('/').pop();
          await bucket.file(`email-templates/logos/${oldFileName}`).delete();
        } catch (error) {
          console.log('Could not delete old logo:', error.message);
        }
      }
      logoUrl = null;
    }

    const updateData = {
      name,
      type,
      subject,
      htmlContent,
      variables: variables ? JSON.parse(variables) : [],
      description: description || '',
      isActive: isActive === 'true',
      logoUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .update(updateData);

    res.json({
      success: true,
      message: 'Email template updated successfully',
      template: {
        id: templateId,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email template',
      error: error.message
    });
  }
});

// Delete email template
router.delete('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Get template data to delete associated logo
    const templateDoc = await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    const templateData = templateDoc.data();

    // Delete logo if exists
    if (templateData.logoUrl) {
      try {
        const bucket = admin.storage().bucket();
        const fileName = templateData.logoUrl.split('/').pop();
        await bucket.file(`email-templates/logos/${fileName}`).delete();
      } catch (error) {
        console.log('Could not delete logo:', error.message);
      }
    }

    // Delete template document
    await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .delete();

    res.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email template',
      error: error.message
    });
  }
});

// Test email template
router.post('/:templateId/test', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { testEmail, testData } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    // Get template
    const templateDoc = await admin.firestore()
      .collection('emailTemplates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    const template = templateDoc.data();
    const EmailService = require('../services/EmailService');

    // Send test email
    const result = await EmailService.sendTemplateEmail(
      testEmail,
      template,
      testData || {}
    );

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
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

module.exports = router;
