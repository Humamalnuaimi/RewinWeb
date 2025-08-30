// FEATURE: Backend Email API Endpoint
// FILE: send-email.js
// PURPOSE: Backend SMTP service for sending emails via Gmail
// LAST MODIFIED: January 28, 2025

const nodemailer = require('nodemailer');

// CORS headers for frontend access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { smtp, message } = req.body;

    // Validate required fields
    if (!smtp || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing SMTP configuration or message data'
      });
    }

    if (!smtp.auth || !smtp.auth.user || !smtp.auth.pass) {
      return res.status(400).json({
        success: false,
        error: 'Missing SMTP authentication credentials'
      });
    }

    if (!message.to || !message.subject || !message.html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required message fields (to, subject, html)'
      });
    }

    console.log('📧 Backend: Sending email to:', message.to);

    // Create transporter with Gmail SMTP
    const transporter = nodemailer.createTransporter({
      host: smtp.host || 'smtp.gmail.com',
      port: smtp.port || 587,
      secure: smtp.secure || false, // true for 465, false for other ports
      auth: {
        user: smtp.auth.user,
        pass: smtp.auth.pass
      },
      // Additional Gmail-specific settings
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ SMTP server connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      return res.status(500).json({
        success: false,
        error: `SMTP verification failed: ${verifyError.message}`
      });
    }

    // Send email
    const info = await transporter.sendMail({
      from: message.from || smtp.auth.user,
      to: message.to,
      subject: message.subject,
      html: message.html,
      // Optional: add text version
      text: message.text || message.html.replace(/<[^>]*>/g, '')
    });

    console.log('✅ Email sent successfully:', info.messageId);

    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });

  } catch (error) {
    console.error('❌ Backend email sending failed:', error);

    // Set CORS headers even for errors
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};
