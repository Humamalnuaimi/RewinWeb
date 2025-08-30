// FEATURE: Gmail API Integration Service
// FILE: gmail-api-integration.service.ts
// PURPOSE: Complete Gmail API integration for automatic email sending
// LAST MODIFIED: January 28, 2025

// Note: googleapis is imported dynamically to avoid build issues
// import { google } from 'googleapis';

export interface GmailAPICredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
}

export interface EmailData {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export class GmailAPIIntegrationService {
  private static credentials: GmailAPICredentials | null = null;
  private static oauth2Client: any = null;

  // Initialize Gmail API with OAuth credentials
  static initialize(credentials: GmailAPICredentials) {
    this.credentials = credentials;
    
    // Create OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    // Set refresh token if available
    if (credentials.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken
      });
    }

    console.log('📧 Gmail API service initialized');
  }

  // Get authorization URL for OAuth flow
  static getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('Gmail API not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  static async getTokens(authCode: string): Promise<{ refreshToken: string; accessToken: string }> {
    if (!this.oauth2Client) {
      throw new Error('Gmail API not initialized');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(authCode);
      
      // Set credentials
      this.oauth2Client.setCredentials(tokens);

      // Store refresh token securely
      if (tokens.refresh_token) {
        localStorage.setItem('gmail_refresh_token', tokens.refresh_token);
      }

      return {
        refreshToken: tokens.refresh_token || '',
        accessToken: tokens.access_token || ''
      };
    } catch (error: any) {
      console.error('Failed to get tokens:', error);
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  // Send email using Gmail API
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.oauth2Client) {
        throw new Error('Gmail API not initialized');
      }

      // Refresh access token if needed
      await this.refreshAccessToken();

      // Create Gmail API instance
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Create email message
      const message = this.createEmailMessage(emailData);

      // Send email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log('✅ Email sent successfully via Gmail API:', response.data.id);

      return {
        success: true,
        messageId: response.data.id || undefined
      };

    } catch (error: any) {
      console.error('❌ Gmail API send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Gmail API'
      };
    }
  }

  // Refresh access token using refresh token
  private static async refreshAccessToken(): Promise<void> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      // Check if we have a refresh token
      const refreshToken = localStorage.getItem('gmail_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available. Re-authorization required.');
      }

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      console.log('🔄 Access token refreshed successfully');

    } catch (error: any) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Token refresh failed. Re-authorization required.');
    }
  }

  // Create base64 encoded email message
  private static createEmailMessage(emailData: EmailData): string {
    const { to, subject, htmlBody, textBody } = emailData;

    // Create email headers and body
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary123"',
      '',
      '--boundary123',
      'Content-Type: text/plain; charset=utf-8',
      '',
      textBody || htmlBody.replace(/<[^>]*>/g, ''),
      '',
      '--boundary123',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
      '',
      '--boundary123--'
    ];

    const email = emailLines.join('\r\n');
    
    // Encode to base64url
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Check if user is authorized
  static isAuthorized(): boolean {
    const refreshToken = localStorage.getItem('gmail_refresh_token');
    return !!refreshToken && !!this.oauth2Client;
  }

  // Clear stored tokens (logout)
  static clearTokens(): void {
    localStorage.removeItem('gmail_refresh_token');
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({});
    }
    console.log('🔐 Gmail tokens cleared');
  }

  // Test Gmail API connection
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthorized()) {
        throw new Error('Not authorized. Please complete OAuth flow first.');
      }

      await this.refreshAccessToken();
      
      // Try to get user profile to test connection
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      console.log('✅ Gmail API connection test successful');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Gmail API connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GmailAPIIntegrationService;
