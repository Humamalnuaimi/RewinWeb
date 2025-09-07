// FEATURE: Gmail API Email Service
// FILE: gmail-smtp.service.ts (renamed for Gmail API integration)
// PURPOSE: Gmail API integration with professional email templates
// LAST MODIFIED: January 28, 2025

import GmailBrowserAPIService from './gmail-browser-api.service';

export interface GmailSMTPData {
  userEmail: string;
  userName: string;
  invitationType: 'email' | 'gmail';
  setupLink?: string;
}

export interface GmailSMTPConfig {
  fromEmail: string;
  fromName: string;
  appPassword: string;
}

export class GmailSMTPService {
  private static config: GmailSMTPConfig | null = null;

  // Initialize Gmail SMTP service
  static initialize(config: GmailSMTPConfig) {
    this.config = config;
    console.log('📧 Gmail SMTP service initialized with:', config.fromEmail);
  }

  // Send invitation email using Gmail API
  static async sendUserInvitation(data: GmailSMTPData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending Gmail API invitation to:', data.userEmail);

      // Check if Gmail API is authorized
      if (!GmailBrowserAPIService.isAuthorized()) {
        console.log('⚠️ Gmail API not authorized, falling back to mailto');
        return this.sendViaMailto(data);
      }

      // Get the appropriate email template
      const template = data.invitationType === 'email' 
        ? this.getUserInvitationTemplate(data)
        : this.getGmailInvitationTemplate(data);

      const subject = data.invitationType === 'email' 
        ? 'Welcome to Rewin - Set Up Your Account'
        : 'Welcome to Rewin - Sign In with Google';

      // Create text version for multipart email
      const textBody = template.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      // Send via Gmail API
      const result = await GmailBrowserAPIService.sendEmail({
        to: data.userEmail,
        subject: subject,
        htmlBody: template,
        textBody: textBody
      });

      if (result.success) {
        console.log('✅ Email sent successfully via Gmail API to:', data.userEmail);
        return { success: true };
      } else {
        console.log('⚠️ Gmail API failed, falling back to mailto');
        return this.sendViaMailto(data);
      }

    } catch (error: any) {
      console.error('❌ Gmail API failed, falling back to mailto:', error);
      return this.sendViaMailto(data);
    }
  }

  // Fallback: Send via mailto
  private static sendViaMailto(data: GmailSMTPData): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = data.invitationType === 'email' 
        ? 'Welcome to Rewin - Set Up Your Account'
        : 'Welcome to Rewin - Sign In with Google';

      const textBody = data.invitationType === 'email'
        ? `Hi ${data.userName},

You've been invited to join Rewin, our comprehensive business management platform. We're excited to have you on board!

To get started, please set up your account by creating a secure password:
${data.setupLink}

Your Account Details:
- Email: ${data.userEmail}
- Account Type: Business User
- Platform: Rewin Business Management

Security Notice: This invitation link will expire in 24 hours for your security.

What happens next?
1. Click the setup link above
2. Create a secure password for your account
3. Complete your profile setup
4. Start managing your business with Rewin!

Need help? Contact our support team at support@rewin.com

Best regards,
Rewin Admin Panel`
        : `Hi ${data.userName},

You've been invited to join Rewin with Google Sign-In. We're excited to have you on board!

Since your invitation is set up for Google Sign-In, you can get started immediately using your Google account:
${data.setupLink}

Your Account Details:
- Email: ${data.userEmail}
- Account Type: Business User
- Sign-In Method: Google OAuth
- Platform: Rewin Business Management

Benefits of Google Sign-In:
✓ Quick and secure access with your existing Google account
✓ No need to remember another password
✓ Enhanced security with Google's authentication

What happens next?
1. Click the "Sign In with Google" link above
2. Authorize Rewin to access your Google account
3. Complete your profile setup (if needed)
4. Start managing your business with Rewin!

Need help? Contact our support team at support@rewin.com

Best regards,
Rewin Admin Panel`;

      // Create mailto link
      const mailtoLink = `mailto:${data.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textBody)}`;
      
      console.log('📧 Opening email client with pre-filled invitation');
      window.open(mailtoLink, '_blank');

      return Promise.resolve({ 
        success: true,
        error: 'Gmail API not configured. Email client opened with invitation. Please review and send.'
      });

    } catch (error: any) {
      console.error('❌ Failed to open email client:', error);
      return Promise.resolve({
        success: false,
        error: error.message || 'Failed to prepare invitation email'
      });
    }
  }

  // Send email using backend SMTP service
  private static async sendEmailViaSMTP(params: {
    to: string;
    subject: string;
    htmlBody: string;
    from: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        throw new Error('Gmail SMTP not configured');
      }

      // Create email payload
      const emailPayload = {
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: this.config.fromEmail,
            pass: this.config.appPassword
          }
        },
        message: {
          from: params.from,
          to: params.to,
          subject: params.subject,
          html: params.htmlBody
        }
      };

      // Send via backend API (we'll create this endpoint)
      const response = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        // If backend API not available, use Web API approach
        return await this.sendEmailViaWebAPI(params);
      }

      const result = await response.json();
      
      if (result.success) {
        return { success: true };
      } else {
        throw new Error(result.error || 'Backend email service failed');
      }

    } catch (error: any) {
      console.error('Backend SMTP failed, trying Web API:', error);
      // Fallback to Web API approach
      return await this.sendEmailViaWebAPI(params);
    }
  }

  // Fallback: Send email using EmailJS (client-side service)
  private static async sendEmailViaWebAPI(params: {
    to: string;
    subject: string;
    htmlBody: string;
    from: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        throw new Error('Gmail SMTP not configured');
      }

      // Use EmailJS for client-side email sending
      if (typeof window !== 'undefined' && (window as any).emailjs) {
        const emailjs = (window as any).emailjs;
        
        // Initialize EmailJS with a public key (you'll need to set this up)
        // For now, we'll use a simple mailto fallback
        console.log('📧 Backend unavailable, opening email client as fallback');
        
        // Create mailto link as ultimate fallback
        const subject = encodeURIComponent(params.subject);
        const body = encodeURIComponent(params.htmlBody.replace(/<[^>]*>/g, ''));
        const mailtoLink = `mailto:${params.to}?subject=${subject}&body=${body}`;
        
        // Open email client
        window.open(mailtoLink, '_blank');
        
        return { 
          success: true,
          error: 'Email client opened. Please review and send manually.'
        };
      } else {
        throw new Error('EmailJS not available');
      }

    } catch (error: any) {
      console.error('Web API fallback failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }



  // Get user invitation email template (for email invitations)
  private static getUserInvitationTemplate(data: GmailSMTPData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rewin - Set Up Your Account</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .email-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
        .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px;
        }
        .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0 0 30px;
        }
        .welcome-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 30px;
            text-align: left;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }
        .info-title {
            color: #1e293b;
            font-weight: 600;
            margin: 0 0 10px;
        }
        .info-text {
            color: #64748b;
            font-size: 14px;
            margin: 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .security-note {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .security-note strong {
            color: #92400e;
        }
        .security-note p {
            color: #92400e;
            margin: 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
            <!-- Logo -->
            <div class="logo">R</div>
            
            <!-- Header -->
            <h1 class="title">Welcome to Rewin!</h1>
            <p class="subtitle">You've been invited to join our platform</p>
            
            <!-- Welcome Message -->
            <div class="welcome-text">
                <p>Hi <strong>${data.userName}</strong>,</p>
                <p>You've been invited to join <strong>Rewin</strong>, our comprehensive business management platform. We're excited to have you on board!</p>
                <p>To get started, please set up your account by creating a secure password:</p>
            </div>
            
            <!-- CTA Button -->
            <a href="${data.setupLink || '#'}" class="cta-button">Set Up My Account</a>
            
            <!-- Account Info -->
            <div class="info-box">
                <div class="info-title">Your Account Details:</div>
                <p class="info-text">
                    <strong>Email:</strong> ${data.userEmail}<br>
                    <strong>Account Type:</strong> Business User<br>
                    <strong>Platform:</strong> Rewin Business Management
                </p>
            </div>
            
            <!-- Security Note -->
            <div class="security-note">
                <p><strong>Security Notice:</strong> This invitation link will expire in 24 hours for your security. If you don't set up your account within this time, please contact your administrator for a new invitation.</p>
            </div>
            
            <!-- What's Next -->
            <div class="info-box">
                <div class="info-title">What happens next?</div>
                <div class="info-text">
                    <p>1. Click the "Set Up My Account" button above</p>
                    <p>2. Create a secure password for your account</p>
                    <p>3. Complete your profile setup</p>
                    <p>4. Start managing your business with Rewin!</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:support@rewin.com">support@rewin.com</a></p>
                <p>This invitation was sent to ${data.userEmail}. If you didn't expect this email, please ignore it.</p>
                <p>&copy; 2025 Rewin. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // Get Gmail invitation email template (for Google OAuth invitations)
  private static getGmailInvitationTemplate(data: GmailSMTPData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rewin - Sign In with Google</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .email-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
        .google-icon {
            width: 60px;
            height: 60px;
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .title {
            color: #1e293b;
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px;
        }
        .subtitle {
            color: #64748b;
            font-size: 16px;
            margin: 0 0 30px;
        }
        .welcome-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 30px;
            text-align: left;
        }
        .cta-button {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: white;
            color: #374151;
            text-decoration: none;
            padding: 16px 24px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            border-color: #d1d5db;
        }
        .google-logo {
            width: 20px;
            height: 20px;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
        }
        .info-title {
            color: #1e293b;
            font-weight: 600;
            margin: 0 0 10px;
        }
        .info-text {
            color: #64748b;
            font-size: 14px;
            margin: 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .security-note {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        }
        .security-note strong {
            color: #0369a1;
        }
        .security-note p {
            color: #0369a1;
            margin: 0;
            font-size: 14px;
        }
        .benefits-list {
            text-align: left;
            color: #475569;
            font-size: 14px;
        }
        .benefits-list li {
            margin: 8px 0;
            padding-left: 8px;
        }
        .benefits-list li::marker {
            content: "✓ ";
            color: #10b981;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
            <!-- Logo -->
            <div class="logo">R</div>
            
            <!-- Google Icon -->
            <div class="google-icon">
                <svg class="google-logo" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            </div>
            
            <!-- Header -->
            <h1 class="title">Welcome to Rewin!</h1>
            <p class="subtitle">You've been invited to join with Google Sign-In</p>
            
            <!-- Welcome Message -->
            <div class="welcome-text">
                <p>Hi <strong>${data.userName}</strong>,</p>
                <p>You've been invited to join <strong>Rewin</strong>, our comprehensive business management platform. We're excited to have you on board!</p>
                <p>Since your invitation is set up for Google Sign-In, you can get started immediately using your Google account:</p>
            </div>
            
            <!-- CTA Button -->
            <a href="${data.setupLink || '#'}" class="cta-button">
                <svg class="google-logo" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In with Google
            </a>
            
            <!-- Account Info -->
            <div class="info-box">
                <div class="info-title">Your Account Details:</div>
                <p class="info-text">
                    <strong>Email:</strong> ${data.userEmail}<br>
                    <strong>Account Type:</strong> Business User<br>
                    <strong>Sign-In Method:</strong> Google OAuth<br>
                    <strong>Platform:</strong> Rewin Business Management
                </p>
            </div>
            
            <!-- Benefits -->
            <div class="info-box">
                <div class="info-title">Benefits of Google Sign-In:</div>
                <ul class="benefits-list">
                    <li>Quick and secure access with your existing Google account</li>
                    <li>No need to remember another password</li>
                    <li>Enhanced security with Google's authentication</li>
                    <li>Seamless integration with Google services</li>
                </ul>
            </div>
            
            <!-- Security Note -->
            <div class="security-note">
                <p><strong>Secure Access:</strong> Your account is protected by Google's advanced security features. You'll be redirected to Google's secure sign-in page to authenticate safely.</p>
            </div>
            
            <!-- What's Next -->
            <div class="info-box">
                <div class="info-title">What happens next?</div>
                <div class="info-text">
                    <p>1. Click the "Sign In with Google" button above</p>
                    <p>2. Authorize Rewin to access your Google account</p>
                    <p>3. Complete your profile setup (if needed)</p>
                    <p>4. Start managing your business with Rewin!</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>Need help? Contact our support team at <a href="mailto:support@rewin.com">support@rewin.com</a></p>
                <p>This invitation was sent to ${data.userEmail}. If you didn't expect this email, please ignore it.</p>
                <p>&copy; 2025 Rewin. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  // Test Gmail SMTP service
  static async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        throw new Error('Gmail SMTP service not configured');
      }

      // Simple test - just validate configuration
      if (!this.config.fromEmail || !this.config.appPassword) {
        throw new Error('Missing Gmail credentials. Please check your email and app password.');
      }

      console.log('✅ Gmail SMTP configuration test passed');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Gmail SMTP configuration test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GmailSMTPService;
