import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Toast, { ToastProps } from './Toast';

interface TwilioAccount {
  accountSid: string;
  phoneNumber: string;
  accountName: string;
  accountStatus: string;
  connectionStatus: string;
  isActive: boolean;
  currentMonthUsage: number;
  currentMonthCost: number;
  monthlyLimit: number;
  costLimit: number;
  lastConnectionTest?: Date;
  connectedAt?: Date;
}

interface TwilioSetupProps {
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const TwilioSetup: React.FC<TwilioSetupProps> = ({ userId, onClose, onSuccess }) => {
  const [twilioAccount, setTwilioAccount] = useState<TwilioAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form data for connecting Twilio
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    accountName: '',
    monthlyLimit: 1000,
    costLimit: 100.00
  });

  useEffect(() => {
    loadTwilioAccount();
  }, [userId]);

  const loadTwilioAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/twilio/admin/users/${userId}/twilio`);
      const data = await response.json();
      
      if (data.success && data.twilioAccount) {
        setTwilioAccount(data.twilioAccount);
      } else {
        setTwilioAccount(null);
      }
    } catch (error) {
      console.error('Error loading Twilio account:', error);
      setToast({ message: 'Failed to load Twilio account information', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    const { accountSid, authToken, phoneNumber } = formData;
    
    if (!accountSid || !authToken) {
      setToast({ message: 'Please enter Account SID and Auth Token', type: 'error' });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/twilio/admin/twilio/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountSid,
          authToken,
          phoneNumber: phoneNumber || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setToast({ 
          message: `Connection successful! Account: ${data.account.name} (${data.account.status})`, 
          type: 'success' 
        });
        
        // Auto-fill account name if not provided
        if (!formData.accountName && data.account.name) {
          setFormData(prev => ({ ...prev, accountName: data.account.name }));
        }
      } else {
        setToast({ message: `Connection failed: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setToast({ message: 'Failed to test connection', type: 'error' });
    } finally {
      setTestingConnection(false);
    }
  };

  const connectTwilioAccount = async () => {
    const { accountSid, authToken, phoneNumber } = formData;
    
    if (!accountSid || !authToken || !phoneNumber) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/twilio/admin/users/${userId}/twilio/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setToast({ message: 'Twilio account connected successfully!', type: 'success' });
        setShowConnectForm(false);
        await loadTwilioAccount();
        onSuccess?.();
      } else {
        setToast({ message: `Failed to connect: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error connecting Twilio account:', error);
      setToast({ message: 'Failed to connect Twilio account', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const disconnectTwilioAccount = async () => {
    if (!window.confirm('Are you sure you want to disconnect this Twilio account? This will disable SMS functionality for this user.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/twilio/admin/users/${userId}/twilio/disconnect`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        setToast({ message: 'Twilio account disconnected successfully', type: 'success' });
        await loadTwilioAccount();
      } else {
        setToast({ message: `Failed to disconnect: ${data.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error disconnecting Twilio account:', error);
      setToast({ message: 'Failed to disconnect Twilio account', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openBillingPage = () => {
    // Open billing page in new tab - we'll implement this later
    window.open(`/admin/users/${userId}/billing`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#EF4444';
      case 'error': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRemainingUsage = () => {
    if (!twilioAccount) return { messages: 0, cost: 0 };
    return {
      messages: Math.max(0, twilioAccount.monthlyLimit - twilioAccount.currentMonthUsage),
      cost: Math.max(0, twilioAccount.costLimit - twilioAccount.currentMonthCost)
    };
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Twilio Account Management">
      <div className="max-w-4xl mx-auto">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Current Account Status */}
            {twilioAccount ? (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Connected Twilio Account</h3>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getConnectionStatusColor(twilioAccount.connectionStatus) }}
                    />
                    <span className="text-sm font-medium capitalize" style={{ color: getConnectionStatusColor(twilioAccount.connectionStatus) }}>
                      {twilioAccount.connectionStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Name</label>
                    <p className="mt-1 text-sm text-gray-900">{twilioAccount.accountName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account SID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{twilioAccount.accountSid}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{twilioAccount.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{twilioAccount.accountStatus}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Connected Since</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(twilioAccount.connectedAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Test</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(twilioAccount.lastConnectionTest)}</p>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Current Month Usage</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Messages Sent</label>
                      <p className="text-lg font-semibold text-gray-900">{twilioAccount.currentMonthUsage}</p>
                      <p className="text-xs text-gray-500">of {twilioAccount.monthlyLimit} limit</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Cost This Month</label>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(twilioAccount.currentMonthCost)}</p>
                      <p className="text-xs text-gray-500">of {formatCurrency(twilioAccount.costLimit)} limit</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Remaining Messages</label>
                      <p className="text-lg font-semibold text-green-600">{getRemainingUsage().messages}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Remaining Budget</label>
                      <p className="text-lg font-semibold text-green-600">{formatCurrency(getRemainingUsage().cost)}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={openBillingPage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Billing Details
                  </button>
                  <button
                    onClick={() => setShowConnectForm(true)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                  >
                    Update Configuration
                  </button>
                  <button
                    onClick={disconnectTwilioAccount}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    Disconnect Account
                  </button>
                </div>
              </div>
            ) : (
              /* No Account Connected */
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">No Twilio Account Connected</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      This user doesn't have a Twilio account configured. SMS campaigns will not work until you connect their account.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowConnectForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Connect Twilio Account
                  </button>
                </div>
              </div>
            )}

            {/* Connect/Update Form */}
            {showConnectForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {twilioAccount ? 'Update Twilio Configuration' : 'Connect Twilio Account'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account SID *
                    </label>
                    <input
                      type="text"
                      value={formData.accountSid}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountSid: e.target.value }))}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auth Token *
                    </label>
                    <input
                      type="password"
                      value={formData.authToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                      placeholder="Your auth token"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={formData.accountName}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="My Twilio Account"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Message Limit
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) || 0 }))}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Cost Limit ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, costLimit: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    onClick={testConnection}
                    disabled={testingConnection || !formData.accountSid || !formData.authToken}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConnectForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={connectTwilioAccount}
                    disabled={loading || !formData.accountSid || !formData.authToken || !formData.phoneNumber}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Saving...' : twilioAccount ? 'Update Account' : 'Connect Account'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default TwilioSetup;