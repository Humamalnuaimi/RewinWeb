// FEATURE: Gmail Browser API Service
// FILE: gmail-browser-api.service.ts
// PURPOSE: Browser-compatible Gmail API integration using Google's JavaScript SDK
// LAST MODIFIED: January 28, 2025

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

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export class GmailBrowserAPIService {
  private static credentials: GmailAPICredentials | null = null;
  private static isGapiLoaded = false;
  private static accessToken: string | null = null;

  // Initialize Gmail API with OAuth credentials
  static async initialize(credentials: GmailAPICredentials) {
    this.credentials = credentials;
    
    try {
      // Load Google API if not already loaded
      if (!this.isGapiLoaded) {
        await this.loadGoogleAPI();
      }

      console.log('📧 Gmail Browser API service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Gmail API:', error);
      return false;
    }
  }

  // Load Google API JavaScript SDK
  private static loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.isGapiLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('auth2', () => {
          this.isGapiLoaded = true;
          resolve();
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  // Get authorization URL for OAuth flow
  static getAuthUrl(): string {
    if (!this.credentials) {
      throw new Error('Gmail API not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  static async getTokens(authCode: string): Promise<{ refreshToken: string; accessToken: string }> {
    if (!this.credentials) {
      throw new Error('Gmail API not initialized');
    }

    try {
      // Exchange code for tokens using Google's OAuth endpoint
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: this.credentials.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokens = await response.json();

      // Store tokens
      this.accessToken = tokens.access_token;
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
      // Ensure we have a valid access token
      await this.ensureValidAccessToken();

      if (!this.accessToken) {
        throw new Error('No valid access token available');
      }

      // Create email message
      const message = this.createEmailMessage(emailData);

      // Send email via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: message
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gmail API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Gmail API:', result.id);

      return {
        success: true,
        messageId: result.id
      };

    } catch (error: any) {
      console.error('❌ Gmail API send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Gmail API'
      };
    }
  }

  // Ensure we have a valid access token
  private static async ensureValidAccessToken(): Promise<void> {
    if (this.accessToken) {
      // Check if token is still valid by making a test request
      try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });

        if (response.ok) {
          return; // Token is still valid
        }
      } catch (error) {
        // Token might be expired, try to refresh
      }
    }

    // Try to refresh the access token
    await this.refreshAccessToken();
  }

  // Refresh access token using refresh token
  private static async refreshAccessToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('gmail_refresh_token');
      if (!refreshToken || !this.credentials) {
        throw new Error('No refresh token available. Re-authorization required.');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;

      console.log('🔄 Access token refreshed successfully');

    } catch (error: any) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Token refresh failed. Re-authorization required.');
    }
  }

  // Create base64url encoded email message
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
    return btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Check if user is authorized
  static isAuthorized(): boolean {
    const refreshToken = localStorage.getItem('gmail_refresh_token');
    return !!refreshToken;
  }

  // Clear stored tokens (logout)
  static clearTokens(): void {
    localStorage.removeItem('gmail_refresh_token');
    this.accessToken = null;
    console.log('🔐 Gmail tokens cleared');
  }

  // Test Gmail API connection
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthorized()) {
        throw new Error('Not authorized. Please complete OAuth flow first.');
      }

      await this.ensureValidAccessToken();
      
      if (!this.accessToken) {
        throw new Error('Failed to get valid access token');
      }

      // Try to get user profile to test connection
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status}`);
      }

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

export default GmailBrowserAPIService;
