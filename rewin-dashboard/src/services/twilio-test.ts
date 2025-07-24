export const testTwilioConnection = async (accountSid: string, authToken: string, phoneNumber: string) => {
  try {
    // Test Twilio connection by making a simple API call to get account info
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API error: ${errorData.message || response.statusText}`);
    }

    const accountData = await response.json();
    
    // Verify the phone number exists in the account
    const phoneResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      const phoneExists = phoneData.incoming_phone_numbers?.some(
        (phone: any) => phone.phone_number === phoneNumber
      );

      if (!phoneExists) {
        throw new Error(`Phone number ${phoneNumber} not found in your Twilio account`);
      }
    }

    return {
      success: true,
      message: 'Twilio connection successful',
      account: {
        sid: accountData.sid,
        name: accountData.friendly_name,
        status: accountData.status
      }
    };

  } catch (error) {
    console.error('Twilio test error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test Twilio connection'
    };
  }
}; 