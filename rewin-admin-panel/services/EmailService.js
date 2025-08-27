const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configure your email service here
    // For development, we'll use a simple configuration
    // In production, you should use proper SMTP credentials
    this.transporter = nodemailer.createTransporter({
      // For Gmail (you can change this to your preferred email service)
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_APP_PASSWORD // Your app password (not regular password)
      }
    });

    // Alternative configuration for other SMTP services
    // this.transporter = nodemailer.createTransporter({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT || 587,
    //   secure: false,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS
    //   }
    // });
  }

  async sendInvitationEmail(email, displayName, resetLink) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'You\'ve been invited to Rewin Admin Panel',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin-bottom: 10px;">Rewin Admin Panel</h1>
              <p style="color: #666; font-size: 16px;">You've been invited to join!</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 15px;">Hi ${displayName},</h2>
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                You've been invited to join the Rewin Admin Panel. Click the button below to set up your password and get started.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Set Up Your Account
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #007bff; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px;">
              <p>Best regards,<br>The Rewin Team</p>
              <p style="margin-top: 20px;">
                <em>This invitation will expire in 24 hours for security reasons.</em>
              </p>
            </div>
          </div>
        `,
        text: `
Hi ${displayName},

You've been invited to join the Rewin Admin Panel.

Click here to set your password and get started: ${resetLink}

Best regards,
The Rewin Team

This invitation will expire in 24 hours for security reasons.
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Invitation email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
