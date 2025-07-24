import { sendSMS } from './twilio';

interface SMSRequest {
  userId: string;
  accountId: string;
  phoneNumber: string;
  message: string;
  recipients: string[];
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
  message?: string;
  recipientsCount?: number;
  warning?: string;
}

export async function handleSMSRequest(request: SMSRequest): Promise<SMSResponse> {
  try {
    const { userId, accountId, phoneNumber, message, recipients } = request;

    // Validate required fields
    if (!userId || !accountId || !phoneNumber || !message || !recipients || !Array.isArray(recipients)) {
      return {
        success: false,
        error: 'Missing required fields: userId, accountId, phoneNumber, message, recipients'
      };
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return {
        success: false,
        error: 'Invalid phone number format. Use international format: +1234567890'
      };
    }

    // Validate recipients
    for (const recipient of recipients) {
      if (!phoneRegex.test(recipient)) {
        return {
          success: false,
          error: `Invalid recipient phone number: ${recipient}. Use international format: +1234567890`
        };
      }
    }

    // Send SMS using Twilio
    const result = await sendSMS({
      userId,
      accountId,
      phoneNumber,
      message,
      recipients
    });

    if (result.success) {
      return {
        success: true,
        messageId: result.messageId,
        cost: result.cost,
        message: 'Messages sent successfully',
        recipientsCount: recipients.length,
        ...(result.error && { warning: result.error })
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send messages'
      };
    }

  } catch (error) {
    console.error('SMS API error:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

// For use with fetch API
export async function sendSMSRequest(request: SMSRequest): Promise<SMSResponse> {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send SMS'
      };
    }

    return await response.json();
  } catch (error) {
    console.error('SMS request error:', error);
    return {
      success: false,
      error: 'Network error'
    };
  }
} 