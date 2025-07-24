import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

interface SMSConfig {
  id: string;
  phoneNumber: string;
  accountName: string;
  accountId: string;
  monthlyLimit: number;
  currentUsage: number;
  isActive: boolean;
  createdAt: Date;
}

interface MessageLog {
  messageId: string;
  phoneNumber: string;
  accountId: string;
  recipient: string;
  content: string;
  cost: number;
  timestamp: Date;
  status: string;
}

interface Account {
  id: string;
  name: string;
  description: string;
  phoneNumbers: SMSConfig[];
  totalCustomers: number;
  createdAt: Date;
}

const SMSManager: React.FC<{ user: any }> = ({ user }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', description: '' });
  const [newPhone, setNewPhone] = useState({ phoneNumber: '', monthlyLimit: 1000 });

  useEffect(() => {
    // Load accounts for this user
    const accountsQuery = query(collection(firestore, `users/${user.uid}/accounts`));
    const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Account[];
      setAccounts(accountsData);
      
      // Auto-select first account if none selected
      if (accountsData.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsData[0].id);
      }
    });

    return () => {
      unsubscribeAccounts();
    };
  }, [user.uid, selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;

    // Load phone numbers for selected account
    const phoneNumbersQuery = query(
      collection(firestore, `users/${user.uid}/accounts/${selectedAccount}/phone_numbers`),
      where('isActive', '==', true)
    );
    const unsubscribePhoneNumbers = onSnapshot(phoneNumbersQuery, (snapshot) => {
      const phoneNumbers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as SMSConfig[];
      
      // Auto-select first phone number if none selected
      if (phoneNumbers.length > 0 && !selectedPhoneNumber) {
        setSelectedPhoneNumber(phoneNumbers[0].phoneNumber);
      }
    });

    // Load message logs for selected account
    const logsQuery = query(
      collection(firestore, `users/${user.uid}/accounts/${selectedAccount}/message_logs`),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as MessageLog[];
      setMessageLogs(logs);
    });

    return () => {
      unsubscribePhoneNumbers();
      unsubscribeLogs();
    };
  }, [user.uid, selectedAccount]);

  const createAccount = async () => {
    if (!newAccount.name.trim()) {
      alert('Please enter an account name');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(firestore, `users/${user.uid}/accounts`), {
        name: newAccount.name,
        description: newAccount.description,
        totalCustomers: 0,
        createdAt: new Date()
      });
      
      setNewAccount({ name: '', description: '' });
      setShowAddAccount(false);
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const addPhoneNumber = async () => {
    if (!selectedAccount || !newPhone.phoneNumber.trim()) {
      alert('Please select an account and enter a phone number');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(firestore, `users/${user.uid}/accounts/${selectedAccount}/phone_numbers`), {
        phoneNumber: newPhone.phoneNumber,
        accountName: accounts.find(a => a.id === selectedAccount)?.name || '',
        accountId: selectedAccount,
        monthlyLimit: newPhone.monthlyLimit,
        currentUsage: 0,
        isActive: true,
        createdAt: new Date()
      });
      
      setNewPhone({ phoneNumber: '', monthlyLimit: 1000 });
      setShowAddPhone(false);
    } catch (error) {
      console.error('Error adding phone number:', error);
      alert('Failed to add phone number');
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!selectedAccount || !selectedPhoneNumber || !message.trim() || recipients.length === 0) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Import and use the SMS API function
      const { handleSMSRequest } = await import('../api/send-sms');
      
      const result = await handleSMSRequest({
        userId: user.uid,
        accountId: selectedAccount,
        phoneNumber: selectedPhoneNumber,
        message: message,
        recipients: recipients
      });

      if (result.success) {
        setMessage('');
        setRecipients([]);
        alert(`Messages sent successfully! Cost: $${result.cost?.toFixed(4) || '0'}`);
      } else {
        alert(`Failed to send messages: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Failed to send messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedAccount = () => accounts.find(a => a.id === selectedAccount);
  const getSelectedPhoneConfig = () => {
    const account = getSelectedAccount();
    return account?.phoneNumbers?.find(p => p.phoneNumber === selectedPhoneNumber);
  };

  const getMonthlyUsage = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return messageLogs.filter(log => 
      log.timestamp >= startOfMonth && 
      log.phoneNumber === selectedPhoneNumber
    ).reduce((total, log) => total + log.cost, 0);
  };

  const getRemainingMessages = () => {
    const phoneConfig = getSelectedPhoneConfig();
    if (!phoneConfig) return 0;
    const monthlyUsage = getMonthlyUsage();
    return Math.max(0, phoneConfig.monthlyLimit - monthlyUsage);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '2rem',
      margin: '2rem 0',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>SMS Manager - Multi-Account</h2>
      
      {/* Account Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: 'white', margin: 0 }}>Account Management</h3>
          <button
            onClick={() => setShowAddAccount(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            + Add Account
          </button>
        </div>
        
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            width: '100%',
            marginBottom: '1rem'
          }}
        >
          <option value="">Select an account</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.phoneNumbers?.length || 0} phone numbers)
            </option>
          ))}
        </select>
      </div>

      {/* Phone Number Selection */}
      {selectedAccount && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'white', margin: 0 }}>Phone Numbers</h3>
            <button
              onClick={() => setShowAddPhone(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              + Add Phone Number
            </button>
          </div>
          
          <select
            value={selectedPhoneNumber}
            onChange={(e) => setSelectedPhoneNumber(e.target.value)}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              width: '100%'
            }}
          >
            <option value="">Select a phone number</option>
            {getSelectedAccount()?.phoneNumbers?.map(phone => (
              <option key={phone.phoneNumber} value={phone.phoneNumber}>
                {phone.phoneNumber} (Limit: {phone.monthlyLimit})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Account Configuration */}
      {getSelectedAccount() && getSelectedPhoneConfig() && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'white', marginBottom: '1rem' }}>Account Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ color: 'white' }}>
              <strong>Account:</strong> {getSelectedAccount()?.name}
            </div>
            <div style={{ color: 'white' }}>
              <strong>Phone Number:</strong> {selectedPhoneNumber}
            </div>
            <div style={{ color: 'white' }}>
              <strong>Monthly Limit:</strong> {getSelectedPhoneConfig()?.monthlyLimit} messages
            </div>
            <div style={{ color: 'white' }}>
              <strong>Remaining:</strong> {getRemainingMessages()} messages
            </div>
          </div>
        </div>
      )}

      {/* Send SMS Form */}
      {selectedAccount && selectedPhoneNumber && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: 'white', marginBottom: '1rem' }}>Send SMS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
            <input
              type="text"
              placeholder="Enter phone numbers (comma separated)"
              onChange={(e) => setRecipients(e.target.value.split(',').map(p => p.trim()))}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white'
              }}
            />
            <button
              onClick={sendSMS}
              disabled={loading}
              style={{
                padding: '1rem 2rem',
                borderRadius: '12px',
                border: 'none',
                background: loading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Sending...' : 'Send SMS'}
            </button>
          </div>
        </div>
      )}

      {/* Message Logs */}
      {selectedAccount && (
        <div>
          <h3 style={{ color: 'white', marginBottom: '1rem' }}>Message History</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {messageLogs.map((log, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '0.5rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: 'white', fontSize: '0.9rem' }}>
                  <strong>From:</strong> {log.phoneNumber} | 
                  <strong>To:</strong> {log.recipient} | 
                  <strong>Cost:</strong> ${log.cost.toFixed(4)} | 
                  <strong>Status:</strong> {log.status} | 
                  <strong>Date:</strong> {log.timestamp.toLocaleString()}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {log.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            minWidth: '400px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Add New Account</h3>
            <input
              type="text"
              placeholder="Account Name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                marginBottom: '1rem'
              }}
            />
            <textarea
              placeholder="Account Description (optional)"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                marginBottom: '1rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={createAccount}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flex: 1
                }}
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
              <button
                onClick={() => setShowAddAccount(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Phone Number Modal */}
      {showAddPhone && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            minWidth: '400px'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Add Phone Number</h3>
            <input
              type="tel"
              placeholder="Phone Number (e.g., +1234567890)"
              value={newPhone.phoneNumber}
              onChange={(e) => setNewPhone({ ...newPhone, phoneNumber: e.target.value })}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                marginBottom: '1rem'
              }}
            />
            <input
              type="number"
              placeholder="Monthly Message Limit"
              value={newPhone.monthlyLimit}
              onChange={(e) => setNewPhone({ ...newPhone, monthlyLimit: parseInt(e.target.value) })}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                width: '100%',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={addPhoneNumber}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flex: 1
                }}
              >
                {loading ? 'Adding...' : 'Add Phone Number'}
              </button>
              <button
                onClick={() => setShowAddPhone(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSManager; 