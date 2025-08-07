import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Calendar,
  Settings,
  ExternalLink,
  Zap,
  BarChart3
} from 'lucide-react';
import Toast, { ToastProps } from '../components/Toast';

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

interface BillingData {
  currentBalance: number;
  monthlySpend: number;
  projectedSpend: number;
  lastBillDate: string;
  nextBillDate: string;
}

interface TwilioEvent {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  status: 'success' | 'error' | 'warning';
}

interface User {
  uid: string;
  email: string;
  displayName?: string;
  fullName?: string;
}

const UserTwilioPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [twilioAccount, setTwilioAccount] = useState<TwilioAccount | null>(null);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [events, setEvents] = useState<TwilioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'billing' | 'events' | 'connect'>('account');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Connection form state
  const [formData, setFormData] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    accountName: '',
    monthlyLimit: 1000,
    costLimit: 100.00
  });

  useEffect(() => {
    if (userId) {
      loadTwilioData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        // Update form with user-specific default account name
        setFormData(prev => ({
          ...prev,
          accountName: prev.accountName || `${data.user.fullName || data.user.displayName || data.user.email.split('@')[0]}'s Twilio Account`
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTwilioData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserData(),
        loadTwilioAccount(),
        loadBillingData(),
        loadEvents()
      ]);
    } catch (error) {
      console.error('Error loading Twilio data:', error);
      setToast({ message: 'Failed to load Twilio data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTwilioAccount = async () => {
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
    }
  };

  const loadBillingData = async () => {
    try {
      const response = await fetch(`/api/twilio/admin/users/${userId}/twilio/billing`);
      const data = await response.json();
      
      if (data.success) {
        setBillingData(data.billing);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(`/api/twilio/admin/users/${userId}/twilio/events?limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
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
        await loadTwilioData();
        setActiveTab('account');
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
        await loadTwilioData();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
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
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRemainingUsage = () => {
    if (!twilioAccount) return { messages: 0, cost: 0 };
    return {
      messages: Math.max(0, twilioAccount.monthlyLimit - twilioAccount.currentMonthUsage),
      cost: Math.max(0, twilioAccount.costLimit - twilioAccount.currentMonthCost)
    };
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min(100, (used / limit) * 100);
  };

  const renderStatsCard = (icon: React.ReactNode, title: string, value: string, subtitle: string, color: string) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
        borderRadius: '16px',
        pointerEvents: 'none'
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ 
            color: color,
            marginRight: '0.75rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </div>
          <h3 style={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            fontSize: '0.875rem',
            fontWeight: '500',
            margin: 0 
          }}>
            {title}
          </h3>
        </div>
        <p style={{ 
          color: 'white', 
          fontSize: '1.75rem', 
          fontWeight: '700',
          margin: 0,
          marginBottom: '0.25rem'
        }}>
          {value}
        </p>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '0.75rem',
          margin: 0 
        }}>
          {subtitle}
        </p>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {twilioAccount ? (
        <>
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            {renderStatsCard(
              <MessageSquare size={20} />,
              'Messages This Month',
              twilioAccount.currentMonthUsage.toString(),
              `of ${twilioAccount.monthlyLimit} limit`,
              '#3b82f6'
            )}
            {renderStatsCard(
              <DollarSign size={20} />,
              'Current Month Cost',
              formatCurrency(twilioAccount.currentMonthCost),
              `of ${formatCurrency(twilioAccount.costLimit)} limit`,
              '#10b981'
            )}
            {renderStatsCard(
              <CheckCircle size={20} />,
              'Account Status',
              twilioAccount.connectionStatus.charAt(0).toUpperCase() + twilioAccount.connectionStatus.slice(1),
              `Since ${formatDate(twilioAccount.connectedAt)}`,
              twilioAccount.connectionStatus === 'connected' ? '#10b981' : '#ef4444'
            )}
            {renderStatsCard(
              <Phone size={20} />,
              'Phone Number',
              twilioAccount.phoneNumber,
              twilioAccount.accountName,
              '#8b5cf6'
            )}
          </div>

          {/* Account Details */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
              borderRadius: '20px',
              pointerEvents: 'none'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                  Account Configuration
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setActiveTab('connect')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Settings size={16} />
                    Update
                  </button>
                  <button
                    onClick={disconnectTwilioAccount}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <XCircle size={16} />
                    Disconnect
                  </button>
                  <button
                    onClick={() => window.open(`https://console.twilio.com/us1/account/${twilioAccount.accountSid}`, '_blank')}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <ExternalLink size={16} />
                    Open Console
                  </button>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', fontWeight: '500' }}>
                    Account SID
                  </label>
                  <p style={{ 
                    color: 'white', 
                    fontFamily: 'monospace', 
                    background: 'rgba(0, 0, 0, 0.2)', 
                    padding: '0.5rem', 
                    borderRadius: '8px',
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem'
                  }}>
                    {twilioAccount.accountSid}
                  </p>
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', fontWeight: '500' }}>
                    Account Status
                  </label>
                  <p style={{ color: 'white', margin: '0.25rem 0 0 0', textTransform: 'capitalize' }}>
                    {twilioAccount.accountStatus}
                  </p>
                </div>
                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', fontWeight: '500' }}>
                    Last Test
                  </label>
                  <p style={{ color: 'white', margin: '0.25rem 0 0 0' }}>
                    {formatDate(twilioAccount.lastConnectionTest)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* No Account Connected */
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '3rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
            borderRadius: '20px',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              No Twilio Account Connected
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
              This user doesn't have a Twilio account configured. SMS campaigns will not work until you connect their account.
            </p>
            <button
              onClick={() => setActiveTab('connect')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 2rem',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Phone size={20} />
              Connect Twilio Account
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderConnectTab = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '20px',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
        borderRadius: '20px',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {twilioAccount ? 'Update Twilio Configuration' : 'Connect Twilio Account'}
        </h3>
        
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '0.9rem', 
          marginBottom: '2rem',
          lineHeight: '1.5'
        }}>
          {user && `Configure Twilio SMS service for ${user.fullName || user.displayName || user.email}. `}
          Enter your Twilio account credentials to enable SMS campaigns and messaging features.
        </p>

        {/* Account Credentials Section */}
        <div style={{
          marginBottom: '2rem'
        }}>
          <h4 style={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Settings size={18} />
            Account Credentials
          </h4>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Account SID *
            </label>
            <input
              type="text"
              value={formData.accountSid}
              onChange={(e) => setFormData(prev => ({ ...prev, accountSid: e.target.value }))}
              placeholder="Account SID from Twilio Console"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Auth Token *
            </label>
            <input
              type="password"
              value={formData.authToken}
              onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
              placeholder="Auth Token from Twilio Console"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Twilio phone number (e.g., +1234567890)"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Account Name
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              placeholder={user ? `${user.fullName || user.displayName || user.email.split('@')[0]}'s Twilio Account` : "Account Name"}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
        </div>

        {/* Usage Limits Section */}
        <div style={{
          marginBottom: '2rem'
        }}>
          <h4 style={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            fontSize: '1.1rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={18} />
            Usage Limits
          </h4>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: 'rgba(255, 255, 255, 0.9)', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Monthly Message Limit
              </label>
            <input
              type="number"
              value={formData.monthlyLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) || 0 }))}
              min="1"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: 'block', 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '0.875rem', 
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Monthly Cost Limit ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.costLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, costLimit: parseFloat(e.target.value) || 0 }))}
              min="0"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={testConnection}
            disabled={testingConnection || !formData.accountSid || !formData.authToken}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: testingConnection ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (testingConnection || !formData.accountSid || !formData.authToken) ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            <Zap size={16} />
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('account')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>
          <button
            onClick={connectTwilioAccount}
            disabled={loading || !formData.accountSid || !formData.authToken || !formData.phoneNumber}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: (loading || !formData.accountSid || !formData.authToken || !formData.phoneNumber) ? 0.6 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
          >
            {loading ? 'Saving...' : twilioAccount ? 'Update Account' : 'Connect Account'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderEventsTab = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '20px',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
        borderRadius: '20px',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          Recent Events
        </h3>
        
        {events.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map((event) => (
              <div 
                key={event.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {event.status === 'success' && <CheckCircle size={16} style={{ color: '#10b981' }} />}
                  {event.status === 'error' && <XCircle size={16} style={{ color: '#ef4444' }} />}
                  {event.status === 'warning' && <AlertCircle size={16} style={{ color: '#f59e0b' }} />}
                  <div>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                      {event.message}
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.75rem' }}>
                      {event.type}
                    </p>
                  </div>
                </div>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                  {formatDate(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', margin: '2rem 0' }}>
            No events recorded yet
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'white', margin: 0 }}>Loading Twilio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        {/* Enhanced Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '20px',
            pointerEvents: 'none'
          }} />
          
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <button
                onClick={() => navigate(`/admin/users/${userId}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              >
                <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
                Back to User
              </button>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: 'white',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                <Phone size={28} style={{ marginRight: '0.75rem', display: 'inline' }} />
                Twilio Management
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '1.1rem',
                margin: 0,
                fontWeight: '400'
              }}>
{user ? `Manage SMS capabilities for ${user.fullName || user.displayName || user.email}` : 'Manage SMS capabilities and monitor account usage'}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '0.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'account', label: 'Account', icon: CheckCircle },
            { id: 'billing', label: 'Billing', icon: DollarSign },
            { id: 'events', label: 'Events', icon: BarChart3 },
            { id: 'connect', label: twilioAccount ? 'Update' : 'Connect', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              style={{
                background: activeTab === id 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'transparent',
                border: 'none',
                borderRadius: '12px',
                padding: '0.75rem 1.5rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === id ? '0 4px 15px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'account' && renderAccountTab()}
        {activeTab === 'connect' && renderConnectTab()}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'billing' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <Calendar size={48} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              Billing Information
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Billing integration coming soon
            </p>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }
          
          input:focus {
            outline: none;
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
        `}
      </style>
    </div>
  );
};

export default UserTwilioPage;