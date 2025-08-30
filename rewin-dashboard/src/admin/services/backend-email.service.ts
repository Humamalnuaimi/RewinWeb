// FEATURE: Backend Email Service
// FILE: backend-email.service.ts
// PURPOSE: Frontend service to communicate with backend Gmail API server
// LAST MODIFIED: January 28, 2025

export interface BackendEmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  fromEmail: string;
  fromName: string;
}

export interface InvitationData {
  userEmail: string;
  userName: string;
  invitationType: 'email' | 'gmail';
  setupLink?: string;
}

export class BackendEmailService {
  private static baseUrl = 'http://localhost:3001/api';
  private static config: BackendEmailConfig | null = null;

  // Initialize service with configuration
  static initialize(config: BackendEmailConfig) {
    this.config = config;
    console.log('📧 Backend Email Service initialized');
  }

  // Get authorization URL for OAuth flow
  static async getAuthUrl(config: Partial<BackendEmailConfig>): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gmail/auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
        }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          authUrl: result.authUrl
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to get authorization URL'
        };
      }
    } catch (error: any) {
      console.error('Failed to get auth URL:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Exchange authorization code for tokens
  static async exchangeToken(config: Partial<BackendEmailConfig>, authCode: string): Promise<{ success: boolean; tokens?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gmail/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          authCode: authCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          tokens: result.tokens
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to exchange token'
        };
      }
    } catch (error: any) {
      console.error('Failed to exchange token:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Configure Gmail API on backend
  static async configure(config: BackendEmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gmail/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        this.config = config;
        console.log('✅ Backend Gmail API configured successfully');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to configure Gmail API'
        };
      }
    } catch (error: any) {
      console.error('Failed to configure Gmail API:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Test Gmail API connection
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gmail/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Gmail API connection test successful');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Connection test failed'
        };
      }
    } catch (error: any) {
      console.error('Gmail API connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Send user invitation email
  static async sendUserInvitation(data: InvitationData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending invitation via backend to:', data.userEmail);

      const response = await fetch(`${this.baseUrl}/send-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Invitation sent successfully via backend');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to send invitation'
        };
      }
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Send custom email
  static async sendEmail(emailData: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/gmail/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Email sent successfully via backend');
        return {
          success: true,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to send email'
        };
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Check if backend server is running
  static async checkServerHealth(): Promise<{ success: boolean; configured?: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          configured: result.configured
        };
      } else {
        return {
          success: false,
          error: 'Server health check failed'
        };
      }
    } catch (error: any) {
      console.error('Backend server health check failed:', error);
      return {
        success: false,
        error: 'Backend server not running or unreachable'
      };
    }
  }

  // Check if service is configured
  static isConfigured(): boolean {
    return !!this.config;
  }

  // Get current configuration
  static getConfig(): BackendEmailConfig | null {
    return this.config;
  }

  // Clear configuration
  static clearConfig(): void {
    this.config = null;
    console.log('🔐 Backend email configuration cleared');
  }
}

export default BackendEmailService;
