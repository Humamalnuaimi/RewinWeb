import twilio from 'twilio';

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

interface SMSRequest {
  userId: string;
  accountId: string;
  phoneNumber: string; // The Twilio number to send from
  message: string;
  recipients: string[];
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  cost?: number;
  error?: string;
}

export const sendSMS = async (request: SMSRequest): Promise<SMSResponse> => {
  try {
    const { userId, accountId, phoneNumber, message, recipients } = request;
    
    // Validate inputs
    if (!accountId || !phoneNumber || !message || !recipients.length) {
      return {
        success: false,
        error: 'Missing required fields'
      };
    }

    // Verify the phone number belongs to the specified account
    const phoneNumberValid = await verifyPhoneNumberForAccount(userId, accountId, phoneNumber);
    if (!phoneNumberValid) {
      return {
        success: false,
        error: 'Phone number not authorized for this account'
      };
    }

    // Check monthly usage limit
    const usageCheck = await checkMonthlyUsage(userId, accountId, phoneNumber);
    if (!usageCheck.withinLimit) {
      return {
        success: false,
        error: `Monthly limit exceeded. Used: ${usageCheck.currentUsage}, Limit: ${usageCheck.monthlyLimit}`
      };
    }

    // Send SMS to each recipient
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const twilioMessage = await client.messages.create({
            body: message,
            from: phoneNumber,
            to: recipient
          });

          // Log the message to Firebase for billing tracking
          await logMessageToFirebase({
            userId,
            accountId,
            messageId: twilioMessage.sid,
            phoneNumber,
            recipient,
            content: message,
            cost: parseFloat(twilioMessage.price || '0'),
            status: twilioMessage.status || 'sent'
          });

          return {
            success: true,
            messageId: twilioMessage.sid,
            cost: parseFloat(twilioMessage.price || '0'),
            recipient
          };
        } catch (error) {
          console.error(`Failed to send SMS to ${recipient}:`, error);
          return {
            success: false,
            error: `Failed to send to ${recipient}`,
            recipient
          };
        }
      })
    );

    // Calculate total cost
    const totalCost = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: successCount > 0,
      messageId: results[0]?.messageId,
      cost: totalCost,
      error: failureCount > 0 ? `${failureCount} messages failed` : undefined
    };

  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: 'Failed to send SMS'
    };
  }
};

// Verify phone number belongs to the specified account
const verifyPhoneNumberForAccount = async (userId: string, accountId: string, phoneNumber: string): Promise<boolean> => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    const phoneQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/phone_numbers`),
      where('phoneNumber', '==', phoneNumber),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(phoneQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error verifying phone number:', error);
    return false;
  }
};

// Check monthly usage against limit
const checkMonthlyUsage = async (userId: string, accountId: string, phoneNumber: string): Promise<{
  withinLimit: boolean;
  currentUsage: number;
  monthlyLimit: number;
}> => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    // Get phone number config
    const phoneQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/phone_numbers`),
      where('phoneNumber', '==', phoneNumber)
    );
    const phoneSnapshot = await getDocs(phoneQuery);
    
    if (phoneSnapshot.empty) {
      return { withinLimit: false, currentUsage: 0, monthlyLimit: 0 };
    }
    
    const phoneConfig = phoneSnapshot.docs[0].data();
    const monthlyLimit = phoneConfig.monthlyLimit || 1000;
    
    // Calculate current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const logsQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/message_logs`),
      where('phoneNumber', '==', phoneNumber),
      where('timestamp', '>=', startOfMonth)
    );
    
    const logsSnapshot = await getDocs(logsQuery);
    const currentUsage = logsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().cost || 0);
    }, 0);
    
    return {
      withinLimit: currentUsage < monthlyLimit,
      currentUsage,
      monthlyLimit
    };
  } catch (error) {
    console.error('Error checking monthly usage:', error);
    return { withinLimit: false, currentUsage: 0, monthlyLimit: 0 };
  }
};

// Log message to Firebase for billing tracking
const logMessageToFirebase = async (messageData: {
  userId: string;
  accountId: string;
  messageId: string;
  phoneNumber: string;
  recipient: string;
  content: string;
  cost: number;
  status: string;
}) => {
  try {
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    // Log to account-specific message logs
    await addDoc(collection(firestore, `users/${messageData.userId}/accounts/${messageData.accountId}/message_logs`), {
      ...messageData,
      timestamp: serverTimestamp()
    });

    // Update monthly usage counter for the specific phone number
    await updateMonthlyUsage(messageData.userId, messageData.accountId, messageData.phoneNumber, messageData.cost);
  } catch (error) {
    console.error('Failed to log message to Firebase:', error);
  }
};

// Update monthly usage counter for specific phone number
const updateMonthlyUsage = async (userId: string, accountId: string, phoneNumber: string, cost: number) => {
  try {
    const { doc, updateDoc, increment, getDoc } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    // Find the phone number document
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const phoneQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/phone_numbers`),
      where('phoneNumber', '==', phoneNumber)
    );
    const phoneSnapshot = await getDocs(phoneQuery);
    
    if (!phoneSnapshot.empty) {
      const phoneDoc = phoneSnapshot.docs[0];
      await updateDoc(phoneDoc.ref, {
        currentUsage: increment(cost)
      });
    }
  } catch (error) {
    console.error('Failed to update monthly usage:', error);
  }
};

// Get account usage statistics
export const getAccountUsage = async (userId: string, accountId: string) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const logsQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/message_logs`),
      where('timestamp', '>=', startOfMonth)
    );
    
    const snapshot = await getDocs(logsQuery);
    const logs = snapshot.docs.map(doc => doc.data());
    
    return {
      totalMessages: logs.length,
      totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
      deliveredMessages: logs.filter(log => log.status === 'delivered').length,
      failedMessages: logs.filter(log => log.status === 'failed').length
    };
  } catch (error) {
    console.error('Failed to get account usage:', error);
    return {
      totalMessages: 0,
      totalCost: 0,
      deliveredMessages: 0,
      failedMessages: 0
    };
  }
};

// Get all accounts for a user
export const getUserAccounts = async (userId: string) => {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    const accountsQuery = collection(firestore, `users/${userId}/accounts`);
    const snapshot = await getDocs(accountsQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Failed to get user accounts:', error);
    return [];
  }
};

// Get phone numbers for a specific account
export const getAccountPhoneNumbers = async (userId: string, accountId: string) => {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { firestore } = await import('../firebase/config');
    
    const phoneQuery = query(
      collection(firestore, `users/${userId}/accounts/${accountId}/phone_numbers`),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(phoneQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Failed to get account phone numbers:', error);
    return [];
  }
}; 