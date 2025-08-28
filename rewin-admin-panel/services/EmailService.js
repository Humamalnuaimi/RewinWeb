const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

class EmailService {
  constructor() {
    // We'll create transporters dynamically based on sender configuration
    this.transporters = new Map();
  }

  // Get or create transporter for a specific sender configuration
  async getTransporter(senderConfig) {
    const senderId = senderConfig.id || 'default';
    
    if (this.transporters.has(senderId)) {
      return this.transporters.get(senderId);
    }

    let transporterConfig;

    if (senderConfig.service) {
      // Use service-based configuration (Gmail, Yahoo, etc.)
      transporterConfig = {
        service: senderConfig.service,
        auth: {
          user: senderConfig.username,
          pass: senderConfig.password
        }
      };
    } else {
      // Use SMTP configuration
      transporterConfig = {
        host: senderConfig.host,
        port: senderConfig.port || 587,
        secure: senderConfig.secure || false,
        auth: {
          user: senderConfig.username,
          pass: senderConfig.password
        }
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);
    this.transporters.set(senderId, transporter);
    return transporter;
  }

  // Get default sender configuration
  async getDefaultSender() {
    try {
      const defaultSenderSnapshot = await admin.firestore()
        .collection('emailSenders')
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!defaultSenderSnapshot.empty) {
        const doc = defaultSenderSnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }

      // Fallback to environment variables if no default sender configured
      return {
        id: 'env-fallback',
        email: process.env.EMAIL_USER,
        displayName: process.env.EMAIL_FROM || 'Rewin Admin',
        service: 'gmail',
        username: process.env.EMAIL_USER,
        password: process.env.EMAIL_APP_PASSWORD
      };
    } catch (error) {
      console.error('Error getting default sender:', error);
      throw error;
    }
  }

  // Replace template variables in content
  replaceTemplateVariables(content, variables) {
    let processedContent = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, value || '');
    }
    
    return processedContent;
  }

  // Send email using template
  async sendTemplateEmail(email, template, variables = {}, senderConfig = null) {
    try {
      // Get sender configuration
      const sender = senderConfig || await this.getDefaultSender();
      const transporter = await this.getTransporter(sender);

      // Replace variables in subject and content
      const subject = this.replaceTemplateVariables(template.subject, variables);
      const htmlContent = this.replaceTemplateVariables(template.htmlContent, variables);

      const mailOptions = {
        from: `${sender.displayName} <${sender.email}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Template email sent successfully: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('❌ Error sending template email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  // Send invitation email using template
  async sendInvitationEmail(email, displayName, resetLink) {
    try {
      // Try to get invitation template from database
      const templateSnapshot = await admin.firestore()
        .collection('emailTemplates')
        .where('type', '==', 'invitation')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!templateSnapshot.empty) {
        // Use template from database
        const template = templateSnapshot.docs[0].data();
        const variables = {
          displayName,
          email,
          resetLink,
          invitationLink: resetLink
        };

        return await this.sendTemplateEmail(email, template, variables);
      } else {
        // Fallback to hardcoded template
        return await this.sendFallbackInvitationEmail(email, displayName, resetLink);
      }
    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      // Fallback to hardcoded template on error
      return await this.sendFallbackInvitationEmail(email, displayName, resetLink);
    }
  }

  // Fallback invitation email (original hardcoded version)
  async sendFallbackInvitationEmail(email, displayName, resetLink) {
    try {
      const sender = await this.getDefaultSender();
      const transporter = await this.getTransporter(sender);

      const mailOptions = {
        from: `${sender.displayName} <${sender.email}>`,
        to: email,
        subject: 'You\'ve been invited to Rewin Admin Panel',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rewin Admin Panel Invitation</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e74c3c;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #e74c3c;
                margin-bottom: 10px;
              }
              .content {
                margin-bottom: 30px;
              }
              .button {
                display: inline-block;
                background-color: #e74c3c;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
              }
              .button:hover {
                background-color: #c0392b;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
              }
              .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              @media (max-width: 600px) {
                body {
                  padding: 10px;
                }
                .container {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏆 REWIN</div>
                <h1>Admin Panel Invitation</h1>
              </div>
              
              <div class="content">
                <p>Hi <strong>${displayName}</strong>,</p>
                
                <p>You've been invited to join the <strong>Rewin Admin Panel</strong>! This powerful dashboard will give you access to manage your loyalty program, customers, campaigns, and analytics.</p>
                
                <p>To get started, click the button below to set your password and access your account:</p>
                
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Set Password & Get Started</a>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> This invitation link will expire in 24 hours for security reasons. If you don't use it within this time, please contact your administrator for a new invitation.
                </div>
                
                <p><strong>What you can do with the Rewin Admin Panel:</strong></p>
                <ul>
                  <li>📊 View detailed analytics and reports</li>
                  <li>👥 Manage customers and their rewards</li>
                  <li>🎯 Create and manage marketing campaigns</li>
                  <li>🏪 Oversee outlet operations</li>
                  <li>💰 Track transactions and revenue</li>
                  <li>⚙️ Configure system settings</li>
                </ul>
                
                <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
                
                <p>Welcome to the Rewin family!</p>
                
                <p>Best regards,<br>
                <strong>The Rewin Team</strong></p>
              </div>
              
              <div class="footer">
                <p>This email was sent to ${email}. If you didn't expect this invitation, please ignore this email.</p>
                <p>© 2024 Rewin. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Fallback invitation email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Invitation email sent successfully'
      };
    } catch (error) {
      console.error('❌ Error sending fallback invitation email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send invitation email'
      };
    }
  }

  // Test sender configuration
  async testSenderConfiguration(senderConfig, testEmail) {
    try {
      const transporter = await this.getTransporter(senderConfig);

      const mailOptions = {
        from: `${senderConfig.displayName} <${senderConfig.email}>`,
        to: testEmail,
        subject: 'Test Email - Rewin Admin Panel',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🧪 Email Configuration Test</h2>
            <p>This is a test email to verify your email sender configuration.</p>
            <p><strong>Sender:</strong> ${senderConfig.displayName} (${senderConfig.email})</p>
            <p><strong>Configuration:</strong> ${senderConfig.service || senderConfig.host}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this email, your configuration is working correctly! ✅</p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send test email'
      };
    }
  }

  async testConnection() {
    try {
      const sender = await this.getDefaultSender();
      const transporter = await this.getTransporter(sender);
      await transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();